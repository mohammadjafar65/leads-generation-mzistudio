/* ─────────────────────────────────────────────────────────────
   LeadMail — server.js
   Express + Nodemailer SMTP relay
   Runs locally on http://localhost:3001
   SMTP: mzistudio.com:465 (SSL/TLS)
───────────────────────────────────────────────────────────── */

require('dotenv').config();

const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const imaps      = require('imap-simple');
const MailComposer = require('nodemailer/lib/mail-composer');

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

const session = require('express-session');

const app  = express();
const PORT = process.env.PORT || 3001;
// When Plesk does NOT strip the sub-path prefix, set APP_BASE_PATH=/sentmails
// in Plesk → Node.js app → Environment variables. Leave blank for local use.
const BASE = (process.env.APP_BASE_PATH || '').replace(/\/$/, '');

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── SESSION MIDDLEWARE ─────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'leadmail_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
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

// ── SEND SINGLE EMAIL ─────────────────────────────────────────
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
