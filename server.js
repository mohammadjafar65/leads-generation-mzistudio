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
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin  = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

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
  origin: 'http://localhost:3000', // Change to your frontend URL if different
  credentials: true
}));
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
app.post(`${BASE}/send-instagram-dm`, requireAuth, async (req, res) => {
  const { igUsername, igPassword, recipientHandle, message } = req.body;

  if (!igUsername || !igPassword) return res.status(400).json({ error: 'Instagram credentials missing' });
  if (!recipientHandle)           return res.status(400).json({ error: 'Recipient handle missing' });
  if (!message)                   return res.status(400).json({ error: 'Message missing' });

  let browser;
  try {
    browser = await puppeteerExtra.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
      defaultViewport: { width: 1280, height: 800 },
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // ── Login ──
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await humanType(page, 'input[name="username"]', igUsername);
    await humanType(page, 'input[name="password"]', igPassword);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
    ]);
    await sleep(3000);

    // Dismiss "Save your login info?" and notifications popups
    for (const text of ['Not Now', 'Not now', 'Dismiss']) {
      const btn = await page.$x(`//button[contains(text(),"${text}")]`).catch(() => []);
      if (btn && btn.length) { await btn[0].click(); await sleep(1000); break; }
    }

    // ── Navigate to recipient's profile and open DM ──
    const cleanHandle = recipientHandle.replace(/^@/, '');
    await page.goto(`https://www.instagram.com/${cleanHandle}/`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);

    // Click "Message" button on profile
    const messageBtnXpath = `//div[@role="button"][contains(text(),"Message")] | //a[contains(text(),"Message")]`;
    const msgBtns = await page.$x(messageBtnXpath).catch(() => []);
    if (!msgBtns || msgBtns.length === 0) {
      throw new Error(`Could not find Message button on @${cleanHandle}'s profile. They may not allow DMs or the account doesn't exist.`);
    }
    await msgBtns[0].click();
    await sleep(3000);

    // Type and send message
    const inputSel = 'textarea[placeholder], div[role="textbox"][aria-label*="essage"], div[contenteditable="true"]';
    await page.waitForSelector(inputSel, { timeout: 12000 });
    await page.click(inputSel);
    await humanType(page, inputSel, message, true);
    await sleep(500);
    await page.keyboard.press('Enter');
    await sleep(2000);

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
app.post(`${BASE}/send-linkedin-dm`, requireAuth, async (req, res) => {
  const { liEmail, liPassword, recipientHandle, message } = req.body;

  if (!liEmail || !liPassword) return res.status(400).json({ error: 'LinkedIn credentials missing' });
  if (!recipientHandle)        return res.status(400).json({ error: 'Recipient handle missing' });
  if (!message)                return res.status(400).json({ error: 'Message missing' });

  let browser;
  try {
    browser = await puppeteerExtra.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800'],
      defaultViewport: { width: 1280, height: 800 },
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // ── Login ──
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#username', { timeout: 15000 });
    await humanType(page, '#username', liEmail);
    await humanType(page, '#password', liPassword);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
    ]);
    await sleep(3000);

    // Check for security challenge
    const currentUrl = page.url();
    if (currentUrl.includes('checkpoint') || currentUrl.includes('challenge')) {
      throw new Error('LinkedIn security challenge detected. Please log in manually once to clear it, then retry.');
    }

    // ── Navigate to profile ──
    const cleanHandle = recipientHandle.replace(/^@/, '');
    // Try /in/ (personal) first, fall back to /company/
    await page.goto(`https://www.linkedin.com/in/${cleanHandle}/`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);

    // If profile not found, try company page
    const notFoundEl = await page.$('.not-found, .error-container').catch(() => null);
    if (notFoundEl || page.url().includes('404')) {
      await page.goto(`https://www.linkedin.com/company/${cleanHandle}/`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(2000);
    }

    // Click "Message" button
    const msgSelectors = [
      'button.message-anywhere-button',
      'a[data-control-name="message"]',
      'button[aria-label*="Message"]',
      '.pvs-profile-actions button:first-of-type',
      'main section:first-of-type button:first-of-type',
    ];
    let clicked = false;
    for (const sel of msgSelectors) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        const text = await el.evaluate(e => e.textContent.toLowerCase()).catch(() => '');
        if (text.includes('message') || text.includes('connect') || !text) {
          await el.click();
          clicked = true;
          break;
        }
      }
    }
    if (!clicked) {
      // Try XPath
      const btns = await page.$x('//button[contains(., "Message")] | //a[contains(., "Message")]').catch(() => []);
      if (btns && btns.length) { await btns[0].click(); clicked = true; }
    }
    if (!clicked) throw new Error(`Could not find Message button on LinkedIn profile for "${cleanHandle}". They may not allow direct messages.`);

    await sleep(2500);

    // Type message in the compose box
    const composeSelectors = [
      'div.msg-form__contenteditable',
      'div[contenteditable="true"][role="textbox"]',
      'textarea.msg-form__textarea',
    ];
    let typed = false;
    for (const sel of composeSelectors) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        await el.click();
        await humanTypeInEl(page, el, message);
        typed = true;
        break;
      }
    }
    if (!typed) throw new Error('Could not find LinkedIn message compose box.');

    await sleep(500);

    // Send button
    const sendBtnSelectors = [
      'button.msg-form__send-button',
      'button[aria-label="Send"]',
      'button[type="submit"]',
    ];
    let sent = false;
    for (const sel of sendBtnSelectors) {
      const btn = await page.$(sel).catch(() => null);
      if (btn) {
        const disabled = await btn.evaluate(e => e.disabled).catch(() => false);
        if (!disabled) { await btn.click(); sent = true; break; }
      }
    }
    if (!sent) {
      // Fallback: Ctrl+Enter
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
    }

    await sleep(2000);
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
app.post(`${BASE}/send-bulk-dms`, requireAuth, async (req, res) => {
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

// ── SHARED PUPPETEER HELPERS ──────────────────────────────────
async function sendInstagramDM({ igUsername, igPassword, recipientHandle, message }) {
  let browser;
  try {
    browser = await puppeteerExtra.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });
    await humanType(page, 'input[name="username"]', igUsername);
    await humanType(page, 'input[name="password"]', igPassword);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
    ]);
    await sleep(3000);
    for (const text of ['Not Now', 'Not now', 'Dismiss']) {
      const btn = await page.$x(`//button[contains(text(),"${text}")]`).catch(() => []);
      if (btn && btn.length) { await btn[0].click(); await sleep(1000); break; }
    }
    const cleanHandle = recipientHandle.replace(/^@/, '');
    await page.goto(`https://www.instagram.com/${cleanHandle}/`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    const msgBtns = await page.$x('//div[@role="button"][contains(text(),"Message")] | //a[contains(text(),"Message")]').catch(() => []);
    if (!msgBtns || !msgBtns.length) throw new Error(`No Message button found on @${cleanHandle}'s profile`);
    await msgBtns[0].click();
    await sleep(3000);
    const inputSel = 'textarea[placeholder], div[contenteditable="true"]';
    await page.waitForSelector(inputSel, { timeout: 12000 });
    await page.click(inputSel);
    await humanType(page, inputSel, message, true);
    await sleep(500);
    await page.keyboard.press('Enter');
    await sleep(2000);
    return { ok: true };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function sendLinkedInDM({ liEmail, liPassword, recipientHandle, message }) {
  let browser;
  try {
    browser = await puppeteerExtra.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1280, height: 800 },
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#username', { timeout: 15000 });
    await humanType(page, '#username', liEmail);
    await humanType(page, '#password', liPassword);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
    ]);
    await sleep(3000);
    if (page.url().includes('checkpoint') || page.url().includes('challenge')) {
      throw new Error('LinkedIn security challenge detected. Log in manually once to clear it.');
    }
    const cleanHandle = recipientHandle.replace(/^@/, '');
    await page.goto(`https://www.linkedin.com/in/${cleanHandle}/`, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2000);
    // Try /company/ if /in/ not found
    const title = await page.title().catch(() => '');
    if (title.toLowerCase().includes('page not found') || page.url().includes('404')) {
      await page.goto(`https://www.linkedin.com/company/${cleanHandle}/`, { waitUntil: 'networkidle2', timeout: 20000 });
      await sleep(2000);
    }
    let clicked = false;
    const btns = await page.$x('//button[contains(., "Message")] | //a[contains(., "Message")]').catch(() => []);
    if (btns && btns.length) { await btns[0].click(); clicked = true; }
    if (!clicked) throw new Error(`No Message button found on LinkedIn for "${cleanHandle}"`);
    await sleep(2500);
    const composeSelectors = ['div.msg-form__contenteditable', 'div[contenteditable="true"][role="textbox"]', 'textarea.msg-form__textarea'];
    let typed = false;
    for (const sel of composeSelectors) {
      const el = await page.$(sel).catch(() => null);
      if (el) { await el.click(); await humanTypeInEl(page, el, message); typed = true; break; }
    }
    if (!typed) throw new Error('Could not find LinkedIn message compose box.');
    await sleep(500);
    const sendBtn = await page.$('button.msg-form__send-button, button[aria-label="Send"]').catch(() => null);
    if (sendBtn) { await sendBtn.click(); }
    else { await page.keyboard.down('Control'); await page.keyboard.press('Enter'); await page.keyboard.up('Control'); }
    await sleep(2000);
    return { ok: true };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// Human-like typing for Puppeteer
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
