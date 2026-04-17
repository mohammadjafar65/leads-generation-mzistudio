/* ─────────────────────────────────────────────────────────────
   LeadMail — server.js
   Express + Nodemailer SMTP relay
   Runs locally on http://localhost:3001
   SMTP: mzistudio.com:465 (SSL/TLS)
───────────────────────────────────────────────────────────── */

require('dotenv').config();

const express      = require('express');
const nodemailer   = require('nodemailer');
const cors         = require('cors');
const imaps        = require('imap-simple');
const MailComposer = require('nodemailer/lib/mail-composer');

// Puppeteer is loaded lazily so the server starts even if Chromium is unavailable
let puppeteerReady = false;
let puppeteerExtra = null;
function getPuppeteer() {
  if (puppeteerReady) return puppeteerExtra;
  try {
    puppeteerExtra = require('puppeteer-extra');
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteerExtra.use(StealthPlugin());
    puppeteerReady = true;
  } catch (e) {
    throw new Error('Puppeteer is not available on this server: ' + e.message);
  }
  return puppeteerExtra;
}

// ── SESSION COOKIE CACHE (avoids re-login on every DM) ───────
// Cookies are cached per account in memory for the server's lifetime.
const sessionCookies = { instagram: {}, linkedin: {} };

async function launchBrowser() {
  return getPuppeteer().launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
           '--disable-blink-features=AutomationControlled', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 },
  });
}

async function loginInstagram(page, username, password) {
  // Restore cached cookies first
  const cached = sessionCookies.instagram[username];
  if (cached && cached.length) {
    await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.setCookie(...cached);
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    // Check if still logged in
    const loggedIn = await page.$('svg[aria-label="Home"]').catch(() => null)
                  || await page.$('a[href="/direct/inbox/"]').catch(() => null);
    if (loggedIn) { console.log('IG: reused session cookies'); return; }
    console.log('IG: cached cookies expired, re-logging in');
  }

  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[name="username"]', { timeout: 15000 });
  await humanType(page, 'input[name="username"]', username);
  await humanType(page, 'input[name="password"]', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 25000 }).catch(() => {}),
  ]);
  await sleep(3000);

  // Dismiss popups
  for (const text of ['Not Now', 'Not now', 'Dismiss', 'Turn Off']) {
    const btn = await page.$x(`//button[contains(text(),"${text}")]`).catch(() => []);
    if (btn && btn.length) { await btn[0].click(); await sleep(1000); }
  }

  // Check login succeeded
  const errEl = await page.$('#slfErrorAlert, [data-testid="login-error-message"]').catch(() => null);
  if (errEl) throw new Error('Instagram login failed — check username/password.');

  // Cache cookies
  const cookies = await page.cookies();
  sessionCookies.instagram[username] = cookies;
  console.log('IG: logged in fresh, cookies cached');
}

async function loginLinkedIn(page, email, password) {
  const cached = sessionCookies.linkedin[email];
  if (cached && cached.length) {
    await page.goto('https://www.linkedin.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.setCookie(...cached);
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'networkidle2', timeout: 20000 });
    const loggedIn = await page.$('.global-nav__me').catch(() => null)
                  || await page.$('[data-test-global-nav-me-photo]').catch(() => null);
    if (loggedIn) { console.log('LI: reused session cookies'); return; }
    console.log('LI: cached cookies expired, re-logging in');
  }

  await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('#username', { timeout: 15000 });
  await humanType(page, '#username', email);
  await humanType(page, '#password', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 25000 }).catch(() => {}),
  ]);
  await sleep(3000);

  if (page.url().includes('checkpoint') || page.url().includes('challenge')) {
    sessionCookies.linkedin[email] = []; // clear bad cookies
    throw new Error('LinkedIn security challenge detected. Log in manually once from this machine to clear it, then retry.');
  }

  const cookies = await page.cookies();
  sessionCookies.linkedin[email] = cookies;
  console.log('LI: logged in fresh, cookies cached');
}

// ── IMAP HELPER: STORE IN SENT FOLDER ──────────────────────────
async function appendToSent(smtpUser, smtpPassword, mailOptions) {
  try {
    const connection = await imaps.connect({
      imap: {
        user: smtpUser,
        password: smtpPassword,
        host: 'mzistudio.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 5000
      }
    });

    const mail = new MailComposer(mailOptions);
    const rawMessage = await mail.compile().build();
    const rawString = rawMessage.toString();

    // Most servers use 'Sent', but some use 'INBOX.Sent'
    try {
      await connection.append(rawString, { mailbox: 'Sent', flags: '\\Seen' });
    } catch (e) {
      // Fallback to INBOX.Sent if the first attempt fails (e.g. nonexistent namespace)
      try {
        await connection.append(rawString, { mailbox: 'INBOX.Sent', flags: '\\Seen' });
      } catch (e2) {
        throw e2; // throw the second error if both fail
      }
    }
    
    connection.end();
    console.log(`✉  Appended to Sent folder for ${mailOptions.to}`);
  } catch (err) {
    console.error(`✗  IMAP Append failed for ${mailOptions.to}:`, err.message);
  }
}


const path   = require('path');
const https  = require('https');
const http   = require('http');

const session = require('express-session');

// ── SOCIAL HANDLE SCRAPER ─────────────────────────────────────
function fetchWebsiteHtml(rawUrl) {
  return new Promise((resolve, reject) => {
    let url;
    try { url = rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl; } catch { return reject(new Error('Invalid URL')); }
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
      timeout: 8000,
    }, (res) => {
      // Follow one redirect
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        return fetchWebsiteHtml(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode && res.statusCode >= 400) return resolve('');
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { if (data.length < 500_000) data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

const app  = express();
const PORT = process.env.PORT || 3001;
// When Plesk does NOT strip the sub-path prefix, set APP_BASE_PATH=/sentmails
// in Plesk → Node.js app → Environment variables. Leave blank for local use.
const BASE = (process.env.APP_BASE_PATH || '').replace(/\/$/, '');

app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://mzistudio.com',
      'http://mzistudio.com',
    ];
    if (!origin || allowed.some(o => origin.startsWith(o))) return cb(null, origin || '*');
    cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true
}));

// Explicit preflight handler for DM endpoints (called from https production → http local)
const dmCorsMiddleware = (req, res, next) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
};
app.options(`${BASE}/send-instagram-dm`, dmCorsMiddleware);
app.options(`${BASE}/send-linkedin-dm`, dmCorsMiddleware);
app.options(`${BASE}/send-bulk-dms`, dmCorsMiddleware);
app.use(express.json());

// ── SESSION MIDDLEWARE ─────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'leadmail_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax' // Use 'none' and secure: true if using HTTPS
    // secure: true, // Uncomment if using HTTPS
  },
}));


// ── SIMPLE USER STORE (for demo) ───────────────────────────
// To add or change users, edit the USERS array below. For production, use a database and hashed passwords!
const USERS = [
  { username: 'mohammadjafar', password: 'mzistudio2324@#' }, // Example: { username: 'yourname', password: 'yourpass' }
];

function authenticate(username, password) {
  return USERS.find(u => u.username === username && u.password === password);
}

// ── AUTH ROUTES ────────────────────────────────────────────

app.post(`${BASE}/auth/login`, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = authenticate(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  req.session.user = { username: user.username };
  res.json({ ok: true });
});

app.get(`${BASE}/auth/session`, (req, res) => {
  if (req.session && req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

app.post(`${BASE}/auth/logout`, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ── AUTH GUARD MIDDLEWARE ─────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

// ── SERVE STATIC FRONTEND ─────────────────────────────────────
app.use(BASE, express.static(path.join(__dirname)));
app.get(`${BASE}/`, (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get(`${BASE}/health`, (_req, res) => res.json({ ok: true }));

// ── FIND SOCIAL HANDLES FROM WEBSITE ─────────────────────────
app.post(`${BASE}/find-socials`, requireAuth, async (req, res) => {
  const { website } = req.body;
  if (!website) return res.status(400).json({ error: 'website required' });

  try {
    const html = await fetchWebsiteHtml(website);

    // Instagram: look for instagram.com/<handle> — exclude common non-handle paths
    const SKIP_IG = new Set(['p', 'reel', 'stories', 'explore', 'accounts', 'direct', 'tv', 'tags', 'locations', 'share', 'sharedAction', '']);
    let instagram = null;
    const igRe = /instagram\.com\/([A-Za-z0-9_.]{1,30})\/?(?:[?#"' ]|$)/gi;
    let m;
    while ((m = igRe.exec(html)) !== null) {
      const handle = m[1].toLowerCase();
      if (!SKIP_IG.has(handle) && !handle.startsWith('_')) {
        instagram = m[1];
        break;
      }
    }

    // LinkedIn: company or personal profile
    const SKIP_LI = new Set(['sharing', 'shareArticle', 'login', 'feed', 'jobs', 'learning', 'pulse', 'groups', 'messaging', 'notifications', '']);
    let linkedin = null;
    const liRe = /linkedin\.com\/(company|in)\/([A-Za-z0-9_.-]{1,100})\/?(?:[?#"' ]|$)/gi;
    while ((m = liRe.exec(html)) !== null) {
      const handle = m[2];
      if (!SKIP_LI.has(handle.toLowerCase())) {
        linkedin = handle;
        break;
      }
    }

    res.json({ instagram, linkedin });
  } catch (err) {
    console.error('find-socials error:', err.message);
    res.json({ instagram: null, linkedin: null });
  }
});

// ── INSTAGRAM DM SENDER ───────────────────────────────────────
// Body: { igUsername, igPassword, recipientHandle, message }
app.post(`${BASE}/send-instagram-dm`, dmCorsMiddleware, requireAuth, async (req, res) => {
  const { igUsername, igPassword, recipientHandle, message } = req.body;

  if (!igUsername || !igPassword) return res.status(400).json({ error: 'Instagram credentials missing' });
  if (!recipientHandle)           return res.status(400).json({ error: 'Recipient handle missing' });
  if (!message)                   return res.status(400).json({ error: 'Message missing' });

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    await loginInstagram(page, igUsername, igPassword);

    const cleanHandle = recipientHandle.replace(/^@/, '');

    // Navigate directly to DM compose with the target user
    await page.goto(`https://www.instagram.com/${cleanHandle}/`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);

    // Try multiple selectors for the Message button (IG updates these frequently)
    const msgSelectors = [
      'div[role="button"]::-text("Message")',   // CSS4-style (won't work directly)
    ];
    // Use XPath instead — much more reliable for text-based buttons
    let clicked = false;
    for (const xpath of [
      '//div[@role="button" and normalize-space(text())="Message"]',
      '//div[@role="button" and contains(text(),"Message")]',
      '//a[contains(@href,"/direct/") and contains(text(),"Message")]',
      '//button[contains(text(),"Message")]',
    ]) {
      const btns = await page.$x(xpath).catch(() => []);
      if (btns && btns.length) {
        await btns[0].click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // Fallback: go directly to DM thread via direct/new and search for handle
      await page.goto('https://www.instagram.com/direct/new/', { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(2000);
      const searchInput = await page.waitForSelector(
        'input[placeholder*="Search"], input[name="queryBox"]', { timeout: 10000 }
      );
      await searchInput.type(cleanHandle, { delay: 60 });
      await sleep(2000);
      // Click first result
      const firstResult = await page.$('div[role="button"][tabindex="0"] span').catch(() => null)
                       || await page.$('button._acan').catch(() => null);
      if (firstResult) {
        await firstResult.click();
        await sleep(1000);
        // Click "Next" / "Chat" button
        for (const xpath of ['//div[text()="Next"]', '//button[text()="Next"]', '//div[text()="Chat"]']) {
          const btn = await page.$x(xpath).catch(() => []);
          if (btn && btn.length) { await btn[0].click(); break; }
        }
        clicked = true;
      }
    }

    if (!clicked) throw new Error(`Could not open DM thread with @${cleanHandle}. They may not accept DMs or the account doesn't exist.`);

    await sleep(3000);

    // Type message — try multiple compose box selectors
    let typed = false;
    for (const sel of [
      'div[aria-label="Message"]',
      'div[contenteditable="true"][tabindex="0"]',
      'div[role="textbox"]',
      'textarea',
    ]) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        await el.click();
        await sleep(300);
        await humanTypeInEl(page, el, message);
        typed = true;
        break;
      }
    }
    if (!typed) throw new Error('Could not find Instagram DM compose box.');

    await sleep(500);

    // Send — try button first, then Enter key
    const sendBtn = await page.$('button[type="submit"]:not([disabled]), div[role="button"][aria-label*="Send"]').catch(() => null);
    if (sendBtn) {
      await sendBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }
    await sleep(2000);

    // Update cached cookies after activity
    sessionCookies.instagram[igUsername] = await page.cookies();

    console.log(`✉  Instagram DM sent to @${cleanHandle}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(`✗  Instagram DM error:`, err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

// ── LINKEDIN DM SENDER ────────────────────────────────────────
// Body: { liEmail, liPassword, recipientHandle, message }
// recipientHandle can be a LinkedIn profile slug or company slug
app.post(`${BASE}/send-linkedin-dm`, dmCorsMiddleware, requireAuth, async (req, res) => {
  const { liEmail, liPassword, recipientHandle, message } = req.body;

  if (!liEmail || !liPassword) return res.status(400).json({ error: 'LinkedIn credentials missing' });
  if (!recipientHandle)        return res.status(400).json({ error: 'Recipient handle missing' });
  if (!message)                return res.status(400).json({ error: 'Message missing' });

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    await loginLinkedIn(page, liEmail, liPassword);

    const cleanHandle = recipientHandle.replace(/^@/, '');

    // Try personal profile first (/in/), then company (/company/)
    let profileLoaded = false;
    for (const path of [`/in/${cleanHandle}/`, `/company/${cleanHandle}/`]) {
      await page.goto(`https://www.linkedin.com${path}`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(1500);
      const title = await page.title().catch(() => '');
      if (!title.toLowerCase().includes('page not found') && !page.url().includes('authwall')) {
        profileLoaded = true;
        break;
      }
    }
    if (!profileLoaded) throw new Error(`LinkedIn profile not found for "${cleanHandle}".`);

    // Click Message button — try multiple approaches
    let clicked = false;

    // Approach 1: XPath text match
    for (const xpath of [
      '//button[normalize-space(text())="Message"]',
      '//button[contains(@aria-label,"Message")]',
      '//a[normalize-space(text())="Message"]',
    ]) {
      const els = await page.$x(xpath).catch(() => []);
      if (els && els.length) { await els[0].click(); clicked = true; break; }
    }

    // Approach 2: CSS selectors
    if (!clicked) {
      for (const sel of [
        'button.message-anywhere-button',
        'button[data-control-name="message"]',
        '.pvs-profile-actions__action button',
        '.artdeco-button--primary',
      ]) {
        const el = await page.$(sel).catch(() => null);
        if (el) {
          const txt = await el.evaluate(e => e.textContent).catch(() => '');
          if (txt.toLowerCase().includes('message')) { await el.click(); clicked = true; break; }
        }
      }
    }

    if (!clicked) throw new Error(`Could not find Message button on LinkedIn for "${cleanHandle}". They may not accept direct messages.`);

    await sleep(2500);

    // Type message in compose box
    let typed = false;
    for (const sel of [
      'div.msg-form__contenteditable',
      'div[aria-label*="Write a message"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[data-artdeco-is-focused]',
      'textarea.msg-form__textarea',
    ]) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        await el.click();
        await sleep(300);
        await humanTypeInEl(page, el, message);
        typed = true;
        break;
      }
    }
    if (!typed) throw new Error('Could not find LinkedIn message compose box.');

    await sleep(600);

    // Click send button
    let sent = false;
    for (const sel of [
      'button.msg-form__send-button',
      'button[aria-label="Send"]',
      'button[data-control-name="send"]',
    ]) {
      const btn = await page.$(sel).catch(() => null);
      if (btn) {
        const disabled = await btn.evaluate(e => e.disabled || e.getAttribute('aria-disabled') === 'true').catch(() => false);
        if (!disabled) { await btn.click(); sent = true; break; }
      }
    }
    if (!sent) {
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
    }

    await sleep(2000);

    // Update cached cookies after activity
    sessionCookies.linkedin[liEmail] = await page.cookies();

    console.log(`✉  LinkedIn DM sent to ${cleanHandle}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(`✗  LinkedIn DM error:`, err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

// ── BULK DM SENDER ────────────────────────────────────────────
// Body: { platform, igUsername, igPassword, liEmail, liPassword, dms: [{handle, message}] }
app.post(`${BASE}/send-bulk-dms`, dmCorsMiddleware, requireAuth, async (req, res) => {
  const { platform, igUsername, igPassword, liEmail, liPassword, dms } = req.body;

  if (!platform) return res.status(400).json({ error: 'platform required (instagram|linkedin)' });
  if (!Array.isArray(dms) || dms.length === 0) return res.status(400).json({ error: 'dms array required' });

  const results = [];
  // Use SSE-style chunked response for progress
  res.setHeader('Content-Type', 'application/json');

  for (let i = 0; i < dms.length; i++) {
    const { handle, message } = dms[i];
    if (!handle || !message) { results.push({ handle, ok: false, error: 'Missing handle or message' }); continue; }

    const endpoint = platform === 'instagram' ? '/send-instagram-dm' : '/send-linkedin-dm';
    const body = platform === 'instagram'
      ? { igUsername, igPassword, recipientHandle: handle, message }
      : { liEmail, liPassword, recipientHandle: handle, message };

    try {
      // Internal call — reuse the browser automation logic
      const mockReq = { body };
      let result = null;
      await new Promise((resolve, reject) => {
        const mockRes = {
          json: (data) => { result = data; resolve(); },
          status: (code) => ({ json: (data) => { result = { ...data, _status: code }; resolve(); } }),
        };
        if (platform === 'instagram') {
          sendInstagramDM(mockReq.body).then(r => { result = r; resolve(); }).catch(e => { result = { ok: false, error: e.message }; resolve(); });
        } else {
          sendLinkedInDM(mockReq.body).then(r => { result = r; resolve(); }).catch(e => { result = { ok: false, error: e.message }; resolve(); });
        }
      });
      results.push({ handle, ...result });
      console.log(`Bulk DM ${i+1}/${dms.length}: ${handle} — ${result && result.ok ? 'OK' : 'FAILED'}`);
    } catch (err) {
      results.push({ handle, ok: false, error: err.message });
    }

    // Polite delay between DMs to avoid rate limiting
    if (i < dms.length - 1) await sleep(Math.floor(Math.random() * 4000) + 3000);
  }

  res.json({ results });
});

// ── PUPPETEER TYPING HELPERS ──────────────────────────────────
async function humanType(page, selector, text, useExisting = false) {
  if (!useExisting) await page.click(selector);
  for (const char of text) {
    await page.type(selector, char, { delay: Math.floor(Math.random() * 80) + 30 });
  }
}

async function humanTypeInEl(page, el, text) {
  for (const char of text) {
    await el.type(char, { delay: Math.floor(Math.random() * 80) + 30 });
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

app.post(`${BASE}/send`, requireAuth, async (req, res) => {
  const { smtpPassword, from, to, subject, body } = req.body;

  if (!smtpPassword)  return res.status(400).json({ error: 'SMTP password missing' });
  if (!to)            return res.status(400).json({ error: 'Recipient (to) missing' });
  if (!subject)       return res.status(400).json({ error: 'Subject missing' });
  if (!body)          return res.status(400).json({ error: 'Body missing' });

  const SMTP_USER = from || 'hello@mzistudio.com';
  const FROM_NAME = req.body.fromName || SMTP_USER;

  const transporter = nodemailer.createTransport({
    host:   'mzistudio.com',
    port:   465,
    secure: true,          // SSL/TLS
    auth: {
      user: SMTP_USER,
      pass: smtpPassword,
    },
    tls: {
      // Allow self-signed certs on custom mail servers
      rejectUnauthorized: false,
    },
  });

  try {
    const mailOptions = {
      from:    `"${FROM_NAME}" <${SMTP_USER}>`,
      to,
      subject,
      text:    body,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉  Sent to ${to} — messageId: ${info.messageId}`);
    
    // Save to Sent folder
    await appendToSent(SMTP_USER, smtpPassword, mailOptions);

    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('SMTP error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── SEND BULK EMAILS ──────────────────────────────────────────
// Body: { smtpPassword, from, emails: [{ to, subject, body }] }
app.post(`${BASE}/send-bulk`, requireAuth, async (req, res) => {
  const { smtpPassword, from, emails } = req.body;

  if (!smtpPassword) return res.status(400).json({ error: 'SMTP password missing' });
  if (!Array.isArray(emails) || emails.length === 0)
    return res.status(400).json({ error: 'emails array is empty or missing' });

  const SMTP_USER = from || 'hello@mzistudio.com';
  const FROM_NAME = req.body.fromName || SMTP_USER;

  const transporter = nodemailer.createTransport({
    host:   'mzistudio.com',
    port:   465,
    secure: true,
    auth: {
      user: SMTP_USER,
      pass: smtpPassword,
    },
    tls: { rejectUnauthorized: false },
  });

  const results = [];
  for (const mail of emails) {
    try {
      const mailOptions = {
        from:    `"${FROM_NAME}" <${SMTP_USER}>`,
        to:      mail.to,
        subject: mail.subject,
        text:    mail.body,
      };
      const info = await transporter.sendMail(mailOptions);
      console.log(`✉  Sent to ${mail.to}`);
      
      // Save to Sent folder
      await appendToSent(SMTP_USER, smtpPassword, mailOptions);
      
      results.push({ to: mail.to, ok: true, messageId: info.messageId });
    } catch (err) {
      console.error(`✗  Failed ${mail.to}: ${err.message}`);
      results.push({ to: mail.to, ok: false, error: err.message });
    }

    // Polite delay between sends (avoid rate limits)
    await new Promise(r => setTimeout(r, 600));
  }

  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`\n  LeadMail server running at http://localhost:${PORT}`);
  console.log(`   SMTP host : mzistudio.com:465 (SSL)`);
  console.log(`   Endpoints : POST /send  |  POST /send-bulk  |  GET /health\n`);
});
