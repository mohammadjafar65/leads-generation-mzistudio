const logoutBtn = document.getElementById('logoutBtn');
/* ─────────────────────────────────────────────────────────────
   LeadMail — app.js
   Uses Claude claude-opus-4-5 API (Anthropic) to:
   1. Analyse client websites and surface problems
   2. Generate personalised outreach emails
   3. Generate follow-up sequences
───────────────────────────────────────────────────────────── */

// ── STATE ─────────────────────────────────────────────────────
const STATE = {
  apiKey: '',
  agency: { name: '', agencyName: '', website: '', phone: '', callLink: '', tagline: '' },
  smtp: { password: '', fromName: '' },
  leads: [],
  emails: [],
  followups: [],
};

// ── DOM REFS ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const apiKeyInput = $('apiKeyInput');
const saveKeyBtn = $('saveKey');
const csvFileInput = $('csvFile');
const dropZone = $('dropZone');
const browseBtn = $('browseBtn');
const leadsTable = $('leadsTable');
const leadsBody = $('leadsBody');
const leadCount = $('leadCount');
const clearLeads = $('clearLeads');
const selectAll = $('selectAll');
const uploadActions = $('uploadActions');
const selectedCount = $('selectedCount');
const analyzeBtn = $('analyzeBtn');
const emailsList = $('emailsList');
const emailActions = $('emailActions');
const followupList = $('followupList');
const followupActions = $('followupActions');
const progressOverlay = $('progressOverlay');
const progressText = $('progressText');
const progressBar = $('progressBar');
const progressSub = $('progressSub');
const emailModal = $('emailModal');
const modalTitle = $('modalTitle');
const modalMeta = $('modalMeta');
const modalSubject = $('modalSubject');
const modalBody = $('modalBody');
const closeModal = $('closeModal');
const modalClose2 = $('modalClose2');
const copyEmailBtn = $('copyEmail');
const exportEmails = $('exportEmails');
const copyAll = $('copyAll');
const generateFollowups = $('generateFollowups');
const exportFollowups = $('exportFollowups');

// Settings DOM refs
const agentNameInput    = $('agentName');
const agencyNameInput   = $('agencyName');
const agencyWebInput    = $('agencyWebsite');
const agencyPhoneInput  = $('agencyPhone');
const agencyCallInput   = $('agencyCallLink');
const agencyTagInput    = $('agencyTagline');
const saveSettingsBtn   = $('saveSettings');
const settingsStatus    = $('settingsStatus');
const settingsPreview   = $('settingsPreview');

// Auth DOM refs
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');

// Detect base path from window.location.pathname (for subfolder deploys like /sentmails)
let BASE = '';
try {
  const match = window.location.pathname.match(/^\/(\w+)/);
  if (match && match[1] && match[1] !== 'index.html') BASE = '/' + match[1];
} catch {}

// History DOM refs
const historyList    = $('historyList');
const historyActions = $('historyActions');

// SMTP DOM refs
const smtpPasswordInput = $('smtpPasswordInput');
const smtpFromInput     = $('smtpFromInput');
const saveSmtpBtn       = $('saveSmtp');
const testSmtpBtn       = $('testSmtp');
const smtpTestStatus    = $('smtpTestStatus');
const sendList          = $('sendList');
const sendActions       = $('sendActions');
const sendAllBtn        = $('sendAllBtn');
const sendSelectedBtn   = $('sendSelectedBtn');
const sendStatusText    = $('sendStatusText');
const sendServerStatus  = $('sendServerStatus');
const sendAllEmails     = $('sendAllEmails');
const sendEmailModal    = $('sendEmailModal');

const SMTP_API = '.';

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // AUTH: Check session
  checkAuth();
  const stored = localStorage.getItem('lm_api_key');
  if (stored) { STATE.apiKey = stored; apiKeyInput.value = stored; }
  loadAgencySettings();
  loadSmtpSettings();
  bindEvents();
  checkSmtpServer();
});

  function checkAuth() {
    fetch(`${BASE}/auth/session`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data && data.authenticated) {
          loginModal.classList.add('hidden');
          document.body.classList.remove('auth-locked');
          if (logoutBtn) logoutBtn.style.display = '';
        } else {
          showLogin();
          if (logoutBtn) logoutBtn.style.display = 'none';
        }
      })
      .catch(() => showLogin());
  }

  function showLogin() {
    loginModal.classList.remove('hidden');
    document.body.classList.add('auth-locked');
    loginUsername.focus();
    if (logoutBtn) logoutBtn.style.display = 'none';
  }

function bindEvents() {
  // AUTH: Login form submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';
      const username = loginUsername.value.trim();
      const password = loginPassword.value;
      if (!username || !password) return;
      try {
        const res = await fetch(`${BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data && data.ok) {
          loginModal.classList.add('hidden');
          document.body.classList.remove('auth-locked');
          if (logoutBtn) logoutBtn.style.display = '';
        } else {
          loginError.textContent = data.error || 'Login failed';
          loginError.style.display = 'block';
        }
      } catch (err) {
        loginError.textContent = 'Network error';
        loginError.style.display = 'block';
      }
    });
  }

  // AUTH: Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
      showLogin();
    });
  }
  // API Key (now in Settings page)
  saveKeyBtn.addEventListener('click', () => {
    STATE.apiKey = apiKeyInput.value.trim();
    localStorage.setItem('lm_api_key', STATE.apiKey);
    toast('API key saved');
  });

  // Agency Settings
  saveSettingsBtn.addEventListener('click', saveAgencySettings);

  // Live preview on any input change
  [agentNameInput, agencyNameInput, agencyWebInput, agencyPhoneInput, agencyCallInput, agencyTagInput]
    .forEach(el => el.addEventListener('input', renderSettingsPreview));

  // Clear history
  $('clearHistory').addEventListener('click', () => {
    if (!confirm('Clear all history? This cannot be undone.')) return;
    localStorage.removeItem('lm_history');
    renderHistoryTab();
    toast('History cleared');
  });

  // Sidebar Tabs
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      if (btn.dataset.tab === 'upload')   maybeShowSettingsWarn();
      if (btn.dataset.tab === 'history')  renderHistoryTab();
      if (btn.dataset.tab === 'send')     renderSendTab();
    });
  });

  // CSV upload — browseBtn stops propagation so dropZone click doesn't fire twice
  browseBtn.addEventListener('click', e => { e.stopPropagation(); csvFileInput.click(); });
  dropZone.addEventListener('click', () => csvFileInput.click());
  csvFileInput.addEventListener('change', e => { handleFile(e.target.files[0]); e.target.value = ''; });
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
  });

  // Select all
  selectAll.addEventListener('change', () => {
    document.querySelectorAll('.lead-check').forEach(c => c.checked = selectAll.checked);
    updateSelectedCount();
  });

  // Analyse
  analyzeBtn.addEventListener('click', runAnalysis);

  // Clear
  clearLeads.addEventListener('click', () => {
    STATE.leads = [];
    renderLeadsTable();
  });

  // Modal close
  [closeModal, modalClose2].forEach(b => b.addEventListener('click', () => emailModal.classList.add('hidden')));
  emailModal.addEventListener('click', e => { if (e.target === emailModal) emailModal.classList.add('hidden'); });

  // Copy/export
  copyEmailBtn.addEventListener('click', () => {
    const text = `Subject: ${modalSubject.value}\n\n${modalBody.value}`;
    navigator.clipboard.writeText(text).then(() => toast('Copied!'));
  });
  exportEmails.addEventListener('click', exportAllEmails);
  copyAll.addEventListener('click', copyAllEmails);
  generateFollowups.addEventListener('click', runFollowups);
  exportFollowups.addEventListener('click', exportAllFollowups);

  // SMTP
  saveSmtpBtn.addEventListener('click', saveSmtpSettings);
  testSmtpBtn.addEventListener('click', testSmtpConnection);

  // Send All from Generate tab
  sendAllEmails.addEventListener('click', () => {
    switchTab('send');
    renderSendTab();
  });

  // Send from modal
  sendEmailModal.addEventListener('click', () => {
    const item = sendEmailModal._item;
    if (!item) return;
    sendSingleEmail(item.lead.email, modalSubject.value, modalBody.value, sendEmailModal);
  });

  // Send All / Selected buttons
  sendAllBtn.addEventListener('click', () => sendBulk(false));
  sendSelectedBtn.addEventListener('click', () => sendBulk(true));
}

// ── TABS ──────────────────────────────────────────────────────
function switchTab(tab) {
  // Prevent switching tabs if not authenticated
  if (document.body.classList.contains('auth-locked')) {
    showLogin();
    return;
  }
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
}

// ── HISTORY ──────────────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('lm_history') || '[]'); }
  catch { return []; }
}

function saveBatch() {
  const history = loadHistory();
  const batch = {
    id:        Date.now(),
    date:      new Date().toISOString(),
    label:     STATE.emails.length + ' lead' + (STATE.emails.length !== 1 ? 's' : ''),
    agency:    STATE.agency.agencyName || STATE.agency.name || 'My Agency',
    emails:    STATE.emails.map(e => ({
      lead:    { name: e.lead.name, email: e.lead.email, phone: e.lead.phone, website: e.lead.website },
      issues:  e.issues,
      subject: e.subject,
      body:    e.body,
    })),
  };
  history.unshift(batch);                         // newest first
  if (history.length > 50) history.length = 50;  // cap at 50 batches
  localStorage.setItem('lm_history', JSON.stringify(history));
}

function renderHistoryTab() {
  const history = loadHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No history yet. Generate emails to start building history.</div>';
    historyActions.style.display = 'none';
    return;
  }

  historyActions.style.display = 'flex';

  history.forEach(batch => {
    const card = document.createElement('div');
    card.className = 'history-batch';

    const dateStr = new Date(batch.date).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    card.innerHTML = `
      <div class="history-batch-header">
        <div class="history-batch-info">
          <div class="history-batch-name">${esc(batch.agency)} &mdash; ${esc(batch.label)}</div>
          <div class="history-batch-meta">${dateStr}</div>
        </div>
        <div class="history-batch-actions">
          <button class="btn-ghost btn-sm toggle-hist">Expand</button>
          <button class="btn-primary btn-sm reload-btn">Reload</button>
          <button class="btn-ghost btn-sm export-hist-btn">Export</button>
          <button class="btn-ghost btn-sm delete-hist-btn">Delete</button>
        </div>
      </div>
      <div class="history-batch-body">
        ${batch.emails.map(e => `
          <div class="history-lead-row">
            <span class="history-lead-name">${esc(e.lead.name || '—')}</span>
            <span class="history-lead-email">${esc(e.lead.email || '—')}</span>
            <span class="history-lead-site">${esc(trimUrl(e.lead.website || ''))}</span>
          </div>
        `).join('')}
      </div>
    `;

    const body    = card.querySelector('.history-batch-body');
    const togBtn  = card.querySelector('.toggle-hist');

    togBtn.addEventListener('click', () => {
      body.classList.toggle('open');
      togBtn.textContent = body.classList.contains('open') ? 'Collapse' : 'Expand';
    });

    // Reload batch into Generate Emails tab
    card.querySelector('.reload-btn').addEventListener('click', () => {
      STATE.emails = batch.emails.map(e => ({
        lead: e.lead, issues: e.issues, subject: e.subject, body: e.body,
      }));
      emailsList.innerHTML = '';
      STATE.emails.forEach(item => renderEmailCard(item, 'initial'));
      emailActions.style.display = 'flex';
      followupActions.style.display = 'flex';
      switchTab('generate');
      toast('Batch loaded into Generate Emails');
    });

    // Export batch as TXT
    card.querySelector('.export-hist-btn').addEventListener('click', () => {
      const text = batch.emails.map(e =>
        `=== ${e.lead.name} (${e.lead.email}) ===\nWebsite: ${e.lead.website}\n\nIssues:\n${(e.issues||[]).map(i => `- ${i}`).join('\n')}\n\nSubject: ${e.subject}\n\n${e.body}\n${'─'.repeat(60)}\n`
      ).join('\n');
      download(`batch_${batch.id}.txt`, text);
    });

    // Delete this batch
    card.querySelector('.delete-hist-btn').addEventListener('click', () => {
      const h = loadHistory().filter(b => b.id !== batch.id);
      localStorage.setItem('lm_history', JSON.stringify(h));
      card.remove();
      if (!historyList.querySelector('.history-batch')) {
        historyList.innerHTML = '<div class="empty-state">No history yet.</div>';
        historyActions.style.display = 'none';
      }
      toast('Batch deleted');
    });

    historyList.appendChild(card);
  });
}

// ── AGENCY SETTINGS ───────────────────────────────────────────
function loadAgencySettings() {
  const raw = localStorage.getItem('lm_agency');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    STATE.agency = { ...STATE.agency, ...data };
    agentNameInput.value   = data.name       || '';
    agencyNameInput.value  = data.agencyName || '';
    agencyWebInput.value   = data.website    || '';
    agencyPhoneInput.value = data.phone      || '';
    agencyCallInput.value  = data.callLink   || '';
    agencyTagInput.value   = data.tagline    || '';
    renderSettingsPreview();
  } catch {}
}

function saveAgencySettings() {
  STATE.agency = {
    name:       agentNameInput.value.trim(),
    agencyName: agencyNameInput.value.trim(),
    website:    agencyWebInput.value.trim(),
    phone:      agencyPhoneInput.value.trim(),
    callLink:   agencyCallInput.value.trim(),
    tagline:    agencyTagInput.value.trim(),
  };
  localStorage.setItem('lm_agency', JSON.stringify(STATE.agency));
  settingsStatus.classList.remove('hidden');
  setTimeout(() => settingsStatus.classList.add('hidden'), 2500);
  renderSettingsPreview();
  toast('Agency settings saved');
}

function renderSettingsPreview() {
  const a = {
    name:       agentNameInput.value.trim(),
    agencyName: agencyNameInput.value.trim(),
    website:    agencyWebInput.value.trim(),
    phone:      agencyPhoneInput.value.trim(),
    callLink:   agencyCallInput.value.trim(),
    tagline:    agencyTagInput.value.trim(),
  };
  if (!a.name && !a.agencyName) { settingsPreview.classList.remove('visible'); return; }

  settingsPreview.classList.add('visible');
  settingsPreview.innerHTML = `
    <div class="preview-label">Email signature preview</div>
    ${a.name       ? `<strong>${esc(a.name)}</strong>` : ''}
    ${a.agencyName ? ` — ${esc(a.agencyName)}` : ''}
    ${a.tagline    ? `<br><em>${esc(a.tagline)}</em>` : ''}
    ${a.website    ? `<br><a href="${esc(a.website)}" target="_blank">${esc(a.website)}</a>` : ''}
    ${a.phone      ? `<br>${esc(a.phone)}` : ''}
    ${a.callLink   ? `<br>📅 <a href="${esc(a.callLink)}" target="_blank">${esc(a.callLink)}</a>` : ''}
  `;
}

function agencySignatureBlock() {
  const a = STATE.agency;
  if (!a.name && !a.agencyName) return '';
  const parts = [];
  if (a.name)       parts.push(a.name);
  if (a.agencyName) parts.push(a.agencyName);
  if (a.tagline)    parts.push(a.tagline);
  if (a.website)    parts.push(a.website);
  if (a.phone)      parts.push(a.phone);
  if (a.callLink)   parts.push(`Book a call: ${a.callLink}`);
  return parts.join('\n');
}

function maybeShowSettingsWarn() {
  const existing = document.querySelector('.settings-warn');
  if (existing) existing.remove();
  const a = STATE.agency;
  if (a.name || a.agencyName) return; // already set — no warning
  const warn = document.createElement('div');
  warn.className = 'settings-warn';
  warn.innerHTML = `<span class="warn-icon">⚠</span><span>Your agency details aren't set yet — emails will have no sender signature. <u>Go to Settings →</u></span>`;
  warn.addEventListener('click', () => switchTab('settings'));
  const title = document.querySelector('#tab-upload .section-title');
  if (title) title.after(warn);
}

// ── CSV PARSING ───────────────────────────────────────────────
function handleFile(file) {
  if (!file) return;
  if (!file.name.endsWith('.csv')) { toast('Please upload a .csv file'); return; }
  const reader = new FileReader();
  reader.onload = e => parseCSV(e.target.result);
  reader.readAsText(file);
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) { toast('CSV appears empty'); return; }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const findCol = (...names) => {
    for (const n of names) {
      const idx = headers.findIndex(h => h.includes(n));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const cols = {
    name: findCol('name', 'business', 'company', 'client'),
    email: findCol('email', 'mail'),
    phone: findCol('phone', 'tel', 'mobile', 'contact'),
    website: findCol('website', 'url', 'site', 'web'),
  };

  STATE.leads = lines.slice(1).map((line, i) => {
    const cells = parseCSVLine(line);
    return {
      id: i + 1,
      name: cols.name >= 0 ? cells[cols.name] || '' : '',
      email: cols.email >= 0 ? cells[cols.email] || '' : '',
      phone: cols.phone >= 0 ? cells[cols.phone] || '' : '',
      website: cols.website >= 0 ? cells[cols.website] || '' : '',
      status: 'pending',
      issues: [],
      generatedEmail: null,
      followups: [],
    };
  }).filter(l => l.name || l.email || l.website);

  renderLeadsTable();
  toast(`${STATE.leads.length} leads loaded`);
}

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  result.push(cur.trim());
  return result;
}

// ── LEADS TABLE ───────────────────────────────────────────────
function renderLeadsTable() {
  leadsBody.innerHTML = '';
  if (STATE.leads.length === 0) {
    leadsTable.classList.add('hidden');
    uploadActions.classList.add('hidden');
    return;
  }

  leadsTable.classList.remove('hidden');
  uploadActions.classList.remove('hidden');

  STATE.leads.forEach(lead => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="lead-check" data-id="${lead.id}" checked /></td>
      <td>${lead.id}</td>
      <td>${esc(lead.name)}</td>
      <td>${esc(lead.email)}</td>
      <td>${esc(lead.phone)}</td>
      <td><a href="${esc(lead.website)}" target="_blank" title="${esc(lead.website)}">${esc(trimUrl(lead.website))}</a></td>
      <td><span class="status-badge status-${lead.status}" id="status-${lead.id}">${lead.status}</span></td>
    `;
    leadsBody.appendChild(tr);
  });

  leadCount.textContent = `${STATE.leads.length} lead${STATE.leads.length !== 1 ? 's' : ''} loaded`;
  updateSelectedCount();

  document.querySelectorAll('.lead-check').forEach(c => {
    c.addEventListener('change', updateSelectedCount);
  });
}

function updateSelectedCount() {
  const checked = document.querySelectorAll('.lead-check:checked').length;
  selectedCount.textContent = checked
    ? `${checked} lead${checked !== 1 ? 's' : ''} selected`
    : 'Select leads above to continue';
  analyzeBtn.disabled = checked === 0;
}

function updateLeadStatus(id, status) {
  const lead = STATE.leads.find(l => l.id === id);
  if (lead) lead.status = status;
  const badge = $(`status-${id}`);
  if (badge) {
    badge.textContent = status;
    badge.className = `status-badge status-${status}`;
  }
}

// ── ANALYSIS + EMAIL GENERATION ───────────────────────────────
async function runAnalysis() {
  if (!STATE.apiKey) { toast('Please enter your Claude API key first'); return; }

  const selectedIds = Array.from(document.querySelectorAll('.lead-check:checked'))
    .map(c => parseInt(c.dataset.id));
  const leads = STATE.leads.filter(l => selectedIds.includes(l.id));

  if (leads.length === 0) { toast('No leads selected'); return; }

  showProgress('Preparing analysis…', 0);
  STATE.emails = [];
  emailsList.innerHTML = '';

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const pct = Math.round((i / leads.length) * 100);
    updateProgress(`Analysing ${lead.name || lead.website}…`, pct, `Lead ${i + 1} of ${leads.length}`);
    updateLeadStatus(lead.id, 'analysing');

    try {
      const result = await analyseAndGenerate(lead);
      lead.issues = result.issues;
      lead.generatedEmail = result;
      STATE.emails.push({ lead, ...result });
      updateLeadStatus(lead.id, 'done');
      renderEmailCard({ lead, ...result }, 'initial');
    } catch (err) {
      console.error(err);
      updateLeadStatus(lead.id, 'error');
      // Show first error as a toast so user knows what's wrong
      if (i === 0) toast('⚠️ ' + err.message, true);
    }

    await sleep(800); // polite delay
  }

  updateProgress('Done!', 100, '');
  await sleep(600);
  hideProgress();

  if (STATE.emails.length > 0) {
    emailActions.style.display = 'flex';
    followupActions.style.display = 'flex';
    saveBatch();           // ← auto-save to history
    switchTab('generate');
    toast(`${STATE.emails.length} email${STATE.emails.length !== 1 ? 's' : ''} generated`);
  }
}

async function analyseAndGenerate(lead) {
  const websiteContext = lead.website
    ? `The client's website is: ${lead.website}`
    : 'No website was provided for this client.';

  const a = STATE.agency;
  const senderBlock = agencySignatureBlock();
  const senderContext = senderBlock
    ? `SENDER (your identity — use this to sign the email):\n${senderBlock}`
    : 'SENDER: A professional web design agency (no specific sender details provided).';

  const callCTA = a.callLink
    ? `If using a CTA, invite them to book a call here: ${a.callLink}`
    : 'Use a soft CTA like replying to the email or scheduling a quick chat.';

  const prompt = `You are an expert web strategist and sales copywriter helping a premium web design agency reach out to potential clients.

${senderContext}

CLIENT DETAILS:
- Name / Business: ${lead.name || 'Unknown'}
- Email: ${lead.email || 'N/A'}
- Phone: ${lead.phone || 'N/A'}
- ${websiteContext}

YOUR TASK:
1. WEBSITE ANALYSIS: Analyse the client's website (based on the URL provided) and identify 3-6 specific, realistic problems that:
   - Give a poor first impression to visitors
   - Hurt conversion rates and lead generation
   - May signal an outdated or unprofessional online presence
   - Could be blocking business growth
   Focus on common real-world issues: slow load times, no mobile optimization, outdated design, missing CTAs, poor navigation, no SSL, weak copy, lack of trust signals, poor SEO structure, etc.

2. PERSONALISED EMAIL: Write a professional, warm outreach email offering website redesign and full website building services.
   The email MUST:
   - Address the client by their first name (if available)
   - Reference their specific website and 2-3 of the identified problems naturally
   - Be conversational, not salesy or aggressive
   - Offer clear value, not a hard sell
   - ${callCTA}
   - Be 180-240 words max — punchy and scannable
   - Sound human, not AI-generated
   - End with the sender's full sign-off using the SENDER details above (name, agency, phone if provided)

Respond ONLY with valid JSON in this exact format:
{
  "issues": ["issue 1", "issue 2", "issue 3"],
  "subject": "email subject line here",
  "body": "full email body here (include the sender signature at the bottom)"
}`;

  const response = await callClaude(prompt);
  return parseJSON(response);
}

// ── FOLLOW-UPS ────────────────────────────────────────────────
async function runFollowups() {
  if (!STATE.apiKey) { toast('Please enter your Claude API key first'); return; }
  if (STATE.emails.length === 0) { toast('Generate initial emails first'); return; }

  showProgress('Generating follow-ups…', 0);
  followupList.innerHTML = '';
  STATE.followups = [];

  for (let i = 0; i < STATE.emails.length; i++) {
    const item = STATE.emails[i];
    const pct = Math.round((i / STATE.emails.length) * 100);
    updateProgress(`Follow-ups for ${item.lead.name}…`, pct, `${i + 1} of ${STATE.emails.length}`);

    try {
      const fu = await generateFollowupSequence(item);
      STATE.followups.push({ lead: item.lead, followups: fu });
      renderFollowupCard(item.lead, fu);
    } catch (err) {
      console.error(err);
      if (i === 0) toast('⚠️ ' + err.message, true);
    }

    await sleep(700);
  }

  updateProgress('Done!', 100, '');
  await sleep(600);
  hideProgress();

  if (STATE.followups.length > 0) {
    switchTab('followup');
    toast('Follow-ups generated');
  }
}

async function generateFollowupSequence(item) {
  const senderBlock = agencySignatureBlock();
  const senderCtx = senderBlock ? `Sender: ${senderBlock.split('\n')[0]}` : '';
  const callCtx = STATE.agency.callLink
    ? `If applicable, include the booking link: ${STATE.agency.callLink}`
    : '';

  const prompt = `You are a sales copywriter for a premium web design agency.
${senderCtx}

You previously sent this outreach email to ${item.lead.name}:
Subject: ${item.subject}
---
${item.body}
---

The client has NOT yet responded. Write TWO follow-up emails:

Follow-up 1 (send ~3 days later): Short, friendly bump. 4-6 sentences. Reference the original email briefly. Add a new angle or value point. ${callCtx}

Follow-up 2 (send ~7 days after follow-up 1): Final gentle nudge. 3-5 sentences. Create mild urgency without being pushy. Leave the door open.

Both emails must end with the sender's sign-off using the same signature as the original email.

Respond ONLY with valid JSON:
{
  "followup1": { "subject": "...", "body": "..." },
  "followup2": { "subject": "...", "body": "..." }
}`;

  const response = await callClaude(prompt);
  const data = parseJSON(response);
  return [
    { label: 'Follow-up 1 (Day 3)', ...data.followup1 },
    { label: 'Follow-up 2 (Day 10)', ...data.followup2 },
  ];
}

// ── CLAUDE API CALL ───────────────────────────────────────────
async function callClaude(prompt) {
  const key = STATE.apiKey.trim();
  if (!key) throw new Error('No API key set. Enter your Claude API key in the top-right and click Save.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.error?.message || '';
    if (res.status === 401) throw new Error('Invalid API key (401). Go to console.anthropic.com → API Keys → create a new key, then paste it in the top-right.');
    if (res.status === 403) throw new Error('API key does not have permission (403). Check your Anthropic plan / key scopes.');
    if (res.status === 429) throw new Error('Rate limit hit (429). Wait a moment and try again, or reduce the number of leads selected.');
    if (res.status === 529) throw new Error('Claude is overloaded (529). Try again in a few minutes.');
    throw new Error(msg || `Claude API error ${res.status}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

// ── RENDER EMAIL CARD ─────────────────────────────────────────
function renderEmailCard(item, type) {
  const noEmpty = emailsList.querySelector('.empty-state');
  if (noEmpty) noEmpty.remove();

  const card = document.createElement('div');
  card.className = 'email-card';
  card.dataset.id = item.lead.id;

  const issueHTML = item.issues && item.issues.length
    ? `<div class="issues-section">
        <div class="issues-label">Issues Found</div>
        <ul class="issues-list">${item.issues.map(i => `<li class="issue-tag">${esc(i)}</li>`).join('')}</ul>
       </div>`
    : '';

  card.innerHTML = `
    <div class="email-card-header">
      <div class="email-card-info">
        <div class="email-card-name">${esc(item.lead.name || 'Unknown')}</div>
        <div class="email-card-meta">${esc(item.lead.email)} · ${esc(trimUrl(item.lead.website))}</div>
      </div>
      <div class="email-card-actions">
        <button class="btn-ghost btn-sm toggle-btn">View</button>
        <button class="btn-ghost btn-sm edit-btn">Edit</button>
        <button class="btn-primary btn-sm copy-btn">Copy</button>
      </div>
    </div>
    <div class="email-card-body">
      ${issueHTML}
      <div class="email-subject"><strong>Subject:</strong> ${esc(item.subject)}</div>
      <div class="email-text">${esc(item.body)}</div>
    </div>
  `;

  const body = card.querySelector('.email-card-body');
  const toggleBtn = card.querySelector('.toggle-btn');

  // Auto-expand the very first card; rest stay collapsed
  if (emailsList.children.length === 0) {
    body.classList.add('open');
    toggleBtn.textContent = 'Hide';
  }

  toggleBtn.addEventListener('click', () => {
    body.classList.toggle('open');
    toggleBtn.textContent = body.classList.contains('open') ? 'Hide' : 'View';
  });

  card.querySelector('.edit-btn').addEventListener('click', () => openModal(item));
  card.querySelector('.copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(`Subject: ${item.subject}\n\n${item.body}`).then(() => toast('Copied!'));
  });

  emailsList.appendChild(card);
}

function renderFollowupCard(lead, followups) {
  const noEmpty = followupList.querySelector('.empty-state');
  if (noEmpty) noEmpty.remove();

  const card = document.createElement('div');
  card.className = 'email-card';

  const tabs = followups.map((fu, i) =>
    `<span class="seq-tag${i === 0 ? ' active' : ''}" data-idx="${i}">${esc(fu.label)}</span>`
  ).join('');

  card.innerHTML = `
    <div class="email-card-header">
      <div class="email-card-info">
        <div class="email-card-name">${esc(lead.name || 'Unknown')}</div>
        <div class="email-card-meta">${esc(lead.email)}</div>
      </div>
      <div class="email-card-actions">
        <button class="btn-ghost btn-sm toggle-btn">View</button>
        <button class="btn-primary btn-sm copy-fu-btn">Copy</button>
      </div>
    </div>
    <div class="email-card-body">
      <div class="followup-seq">${tabs}</div>
      <div class="fu-subject email-subject"><strong>Subject:</strong> ${esc(followups[0].subject)}</div>
      <div class="fu-body email-text">${esc(followups[0].body)}</div>
    </div>
  `;

  const body = card.querySelector('.email-card-body');
  card.querySelector('.toggle-btn').addEventListener('click', () => {
    body.classList.toggle('open');
    card.querySelector('.toggle-btn').textContent = body.classList.contains('open') ? 'Hide' : 'View';
  });

  // Seq tabs
  let active = 0;
  card.querySelectorAll('.seq-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      active = parseInt(tag.dataset.idx);
      card.querySelectorAll('.seq-tag').forEach(t => t.classList.toggle('active', t === tag));
      card.querySelector('.fu-subject').innerHTML = `<strong>Subject:</strong> ${esc(followups[active].subject)}`;
      card.querySelector('.fu-body').textContent = followups[active].body;
    });
  });

  card.querySelector('.copy-fu-btn').addEventListener('click', () => {
    const fu = followups[active];
    navigator.clipboard.writeText(`Subject: ${fu.subject}\n\n${fu.body}`).then(() => toast('Copied!'));
  });

  followupList.appendChild(card);
}

// ── MODAL ─────────────────────────────────────────────────────
function openModal(item) {
  modalTitle.textContent = item.lead.name || 'Email';
  modalMeta.textContent = `${item.lead.email}  ·  ${item.lead.website}`;
  modalSubject.value = item.subject;
  modalBody.value = item.body;

  // Attach current item to send button
  sendEmailModal._item = item;

  // Save edits back to state
  modalSubject.oninput = () => { item.subject = modalSubject.value; };
  modalBody.oninput = () => { item.body = modalBody.value; };

  emailModal.classList.remove('hidden');
}

// ── EXPORT / COPY ─────────────────────────────────────────────
function exportAllEmails() {
  if (!STATE.emails.length) return;
  const text = STATE.emails.map(e =>
    `=== ${e.lead.name} (${e.lead.email}) ===\nWebsite: ${e.lead.website}\n\nIssues Found:\n${(e.issues || []).map(i => `- ${i}`).join('\n')}\n\nSubject: ${e.subject}\n\n${e.body}\n${'─'.repeat(60)}\n`
  ).join('\n');
  download('emails.txt', text);
}

function copyAllEmails() {
  const text = STATE.emails.map(e =>
    `Subject: ${e.subject}\n\n${e.body}`
  ).join('\n\n' + '─'.repeat(40) + '\n\n');
  navigator.clipboard.writeText(text).then(() => toast('All emails copied!'));
}

function exportAllFollowups() {
  if (!STATE.followups.length) return;
  const text = STATE.followups.map(f => {
    const block = f.followups.map(fu =>
      `[${fu.label}]\nSubject: ${fu.subject}\n\n${fu.body}`
    ).join('\n\n');
    return `=== ${f.lead.name} (${f.lead.email}) ===\n\n${block}\n${'─'.repeat(60)}\n`;
  }).join('\n');
  download('followups.txt', text);
}

function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = filename;
  a.click();
}

// ── PROGRESS ──────────────────────────────────────────────────
function showProgress(text, pct) {
  progressOverlay.classList.remove('hidden');
  updateProgress(text, pct, '');
}

function updateProgress(text, pct, sub) {
  progressText.textContent = text;
  progressBar.style.width = `${pct}%`;
  progressSub.textContent = sub;
}

function hideProgress() {
  progressOverlay.classList.add('hidden');
  progressBar.style.width = '0%';
}

// ── HELPERS ───────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function trimUrl(url) {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseJSON(text) {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(cleaned); }
  catch {
    // Try extracting first JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse JSON from Claude response');
  }
}

let toastTimer;
function toast(msg, isError = false) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.style.background = isError ? '#8b1a1a' : 'var(--black)';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), isError ? 6000 : 2600);
}

// ── SMTP SETTINGS ─────────────────────────────────────────────
function loadSmtpSettings() {
  const raw = localStorage.getItem('lm_smtp');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    STATE.smtp = { ...STATE.smtp, ...data };
    smtpPasswordInput.value = data.password  || '';
    smtpFromInput.value     = data.fromName  || '';
  } catch {}
}

function saveSmtpSettings() {
  STATE.smtp.password = smtpPasswordInput.value.trim();
  STATE.smtp.fromName = smtpFromInput.value.trim();
  localStorage.setItem('lm_smtp', JSON.stringify(STATE.smtp));
  smtpTestStatus.textContent = '✓ Saved';
  smtpTestStatus.style.color = '#3a7a3a';
  smtpTestStatus.classList.remove('hidden');
  setTimeout(() => smtpTestStatus.classList.add('hidden'), 2500);
  toast('SMTP settings saved');
}

// ── SMTP SERVER HEALTH ─────────────────────────────────────────
async function checkSmtpServer() {
  try {
    const res = await fetch(`${SMTP_API}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      if (sendServerStatus) {
        sendServerStatus.className = 'smtp-server-status smtp-server-ok';
        sendServerStatus.innerHTML = '🟢 SMTP server running — ready to send emails';
      }
    }
  } catch {
    if (sendServerStatus) {
      sendServerStatus.className = 'smtp-server-status smtp-server-warn';
      sendServerStatus.innerHTML = '🔴 SMTP server not running — <code>npm start</code> in the project folder to enable sending';
    }
  }
}

async function testSmtpConnection() {
  const pwd = smtpPasswordInput.value.trim() || STATE.smtp.password;
  if (!pwd) { toast('Enter your email password first', true); return; }

  testSmtpBtn.disabled = true;
  smtpTestStatus.textContent = 'Testing…';
  smtpTestStatus.style.color = 'var(--gray)';
  smtpTestStatus.classList.remove('hidden');

  try {
    // Send a test request — we reuse /send with a no-op to self
    const res = await fetch(`${SMTP_API}/health`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      smtpTestStatus.textContent = '✓ Server reachable — credentials will be verified on first send';
      smtpTestStatus.style.color = '#3a7a3a';
    } else {
      throw new Error('Server not OK');
    }
  } catch {
    smtpTestStatus.textContent = '✗ Cannot reach SMTP server — run: npm start';
    smtpTestStatus.style.color = '#a02020';
  }

  testSmtpBtn.disabled = false;
}

// ── SEND SINGLE EMAIL ─────────────────────────────────────────
async function sendSingleEmail(to, subject, body, btnEl) {
  if (!STATE.smtp.password) {
    toast('No SMTP password saved — go to Settings → SMTP Email Sending', true);
    return;
  }
  if (!to) { toast('This lead has no email address', true); return; }

  const origText = btnEl ? btnEl.textContent : '';
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Sending…'; }

  try {
    const res = await fetch(`${SMTP_API}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        smtpPassword: STATE.smtp.password,
        fromName:     STATE.smtp.fromName || STATE.agency.name || STATE.agency.agencyName || 'hello@mzistudio.com',
        from:         'hello@mzistudio.com',
        to, subject, body,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Send failed');
    toast(`✓ Email sent to ${to}`);
    if (btnEl) { btnEl.textContent = '✓ Sent'; btnEl.classList.add('btn-sent'); }
  } catch (err) {
    toast('✗ ' + err.message, true);
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = origText; }
  }
}

// ── SEND TAB ──────────────────────────────────────────────────
function renderSendTab() {
  checkSmtpServer();
  sendList.innerHTML = '';

  if (STATE.emails.length === 0) {
    sendList.innerHTML = '<div class="empty-state">No emails to send. Generate emails first, then come here.</div>';
    sendActions.style.display = 'none';
    return;
  }

  sendActions.style.display = 'flex';

  STATE.emails.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'send-row';
    row.dataset.idx = idx;

    row.innerHTML = `
      <div class="send-row-check">
        <input type="checkbox" class="send-check" checked />
      </div>
      <div class="send-row-info">
        <div class="send-row-name">${esc(item.lead.name || 'Unknown')}</div>
        <div class="send-row-email">${esc(item.lead.email || '—')}</div>
        <div class="send-row-subject">${esc(item.subject)}</div>
      </div>
      <div class="send-row-actions">
        <span class="send-badge" id="send-badge-${idx}"></span>
        <button class="btn-send btn-sm send-one-btn">✉ Send</button>
      </div>
    `;

    row.querySelector('.send-one-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      await sendSingleEmail(item.lead.email, item.subject, item.body, btn);
      const badge = $(`send-badge-${idx}`);
      if (badge) { badge.textContent = 'Sent'; badge.className = 'send-badge badge-sent'; }
    });

    sendList.appendChild(row);
  });
}

async function sendBulk(selectedOnly) {
  if (!STATE.smtp.password) {
    toast('No SMTP password — go to Settings → SMTP Email Sending', true);
    return;
  }

  const rows = Array.from(sendList.querySelectorAll('.send-row'));
  const queue = [];

  rows.forEach(row => {
    const chk = row.querySelector('.send-check');
    if (selectedOnly && !chk.checked) return;
    const idx  = parseInt(row.dataset.idx);
    const item = STATE.emails[idx];
    if (item && item.lead.email) queue.push({ row, item, idx });
  });

  if (queue.length === 0) { toast('No leads with email addresses selected', true); return; }

  sendAllBtn.disabled = true;
  sendSelectedBtn.disabled = true;
  sendStatusText.textContent = `Sending 0 / ${queue.length}…`;

  let sent = 0, failed = 0;

  for (const { row, item, idx } of queue) {
    const btn   = row.querySelector('.send-one-btn');
    const badge = $(`send-badge-${idx}`);

    btn.disabled = true;
    btn.textContent = 'Sending…';
    if (badge) badge.textContent = '';

    try {
      const res = await fetch(`${SMTP_API}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpPassword: STATE.smtp.password,
          fromName:     STATE.smtp.fromName || STATE.agency.name || STATE.agency.agencyName || 'hello@mzistudio.com',
          from:         'hello@mzistudio.com',
          to:      item.lead.email,
          subject: item.subject,
          body:    item.body,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      sent++;
      btn.textContent = '✓ Sent';
      btn.classList.add('btn-sent');
      if (badge) { badge.textContent = 'Sent'; badge.className = 'send-badge badge-sent'; }
    } catch (err) {
      failed++;
      btn.disabled = false;
      btn.textContent = '✉ Retry';
      const errMsg = err.message || 'Unknown error';
      if (badge) { badge.textContent = 'Failed: ' + errMsg; badge.className = 'send-badge badge-failed'; badge.title = errMsg; }
      toast('✗ ' + errMsg, true);
    }

    sendStatusText.textContent = `Sent ${sent} / ${queue.length}${failed ? ` (${failed} failed)` : ''}…`;
    await sleep(700);
  }

  sendAllBtn.disabled = false;
  sendSelectedBtn.disabled = false;
  sendStatusText.textContent = `Done — ${sent} sent${failed ? `, ${failed} failed` : ''}`;
  toast(`✓ Sent ${sent} email${sent !== 1 ? 's' : ''}${failed ? ` · ${failed} failed` : ''}`);
}
