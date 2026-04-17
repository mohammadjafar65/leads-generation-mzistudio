// Add Lead Modal DOM refs
const addLeadModal = document.getElementById('addLeadModal');
const addLeadForm = document.getElementById('addLeadForm');
const addLeadName = document.getElementById('addLeadName');
const addLeadEmail = document.getElementById('addLeadEmail');
const addLeadPhone = document.getElementById('addLeadPhone');
const addLeadWebsite = document.getElementById('addLeadWebsite');
const addLeadError = document.getElementById('addLeadError');
const addLeadBtn = document.getElementById('addLeadBtn');
const cancelAddLead = document.getElementById('cancelAddLead');
// Show Add Lead Modal
if (addLeadBtn) {
  addLeadBtn.addEventListener('click', () => {
    addLeadForm.reset();
    addLeadError.style.display = 'none';
    addLeadModal.classList.remove('hidden');
    addLeadName.focus();
  });
}

// Hide Add Lead Modal
if (cancelAddLead) {
  cancelAddLead.addEventListener('click', () => {
    addLeadModal.classList.add('hidden');
  });
}
const cancelAddLeadInner = document.getElementById('cancelAddLeadInner');
if (cancelAddLeadInner) {
  cancelAddLeadInner.addEventListener('click', () => {
    addLeadModal.classList.add('hidden');
  });
}

// Handle Add Lead Form Submission
if (addLeadForm) {
  addLeadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addLeadError.style.display = 'none';
    const name = addLeadName.value.trim();
    const email = addLeadEmail.value.trim();
    const phone = addLeadPhone.value.trim();
    const website = addLeadWebsite.value.trim();
    if (!name || !email) {
      addLeadError.textContent = 'Name and Email are required.';
      addLeadError.style.display = 'block';
      return;
    }
    // Add to STATE.leads
    STATE.leads.push({
      name,
      email,
      phone,
      website,
      instagram: '',
      linkedin: '',
      status: 'pending',
      selected: true
    });
    renderLeadsTable();
    addLeadModal.classList.add('hidden');
  });
}
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
  socialCreds: { igUsername: '', igPassword: '', liEmail: '', liPassword: '' },
  leads: [],
  emails: [],
  followups: [],
  dms: [],
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

// Social / DMs DOM refs
const socialsList      = $('socialsList');
const socialsActions   = $('socialsActions');
const dmsList          = $('dmsList');
const dmsActions       = $('dmsActions');
const findAllSocialsBtn  = $('findAllSocialsBtn');
const findAllSocialsBtn2 = $('findAllSocialsBtn2');
const generateDMsBtn   = $('generateDMsBtn');
const exportDMs        = $('exportDMs');
const copyAllDMs       = $('copyAllDMs');
const sendAllIGDMs     = $('sendAllIGDMs');
const sendAllLIDMs     = $('sendAllLIDMs');
// Social credentials settings
const igUsernameInput  = $('igUsernameInput');
const igPasswordInput  = $('igPasswordInput');
const liEmailInput     = $('liEmailInput');
const liPasswordInput  = $('liPasswordInput');
const saveSocialCreds  = $('saveSocialCreds');
const socialCredsStatus= $('socialCredsStatus');
const exportSocials    = $('exportSocials');

// Stats DOM refs
const statLeads  = $('statLeads');
const statEmails = $('statEmails');
const statSocials= $('statSocials');
const statDMs    = $('statDMs');
const navBadgeLeads  = $('navBadgeLeads');
const navBadgeEmails = $('navBadgeEmails');
const navBadgeDMs    = $('navBadgeDMs');

// Topbar
const topbarTitle = $('topbarTitle');

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
  loadSocialCredentials();
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

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
      if (btn.dataset.tab === 'upload')   maybeShowSettingsWarn();
      if (btn.dataset.tab === 'history')  renderHistoryTab();
      if (btn.dataset.tab === 'send')     renderSendTab();
      if (btn.dataset.tab === 'socials')  renderSocialsTab();
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

  // Social handles
  if (findAllSocialsBtn) findAllSocialsBtn.addEventListener('click', () => runFindSocials());
  if (findAllSocialsBtn2) findAllSocialsBtn2.addEventListener('click', () => runFindSocials());
  if (exportSocials) exportSocials.addEventListener('click', exportSocialsCSV);

  // Cold DMs
  if (generateDMsBtn) generateDMsBtn.addEventListener('click', runGenerateDMs);
  if (exportDMs) exportDMs.addEventListener('click', exportAllDMs);
  if (copyAllDMs) copyAllDMs.addEventListener('click', copyAllDMsText);
  if (sendAllIGDMs) sendAllIGDMs.addEventListener('click', () => runSendAllDMs('instagram'));
  if (sendAllLIDMs) sendAllLIDMs.addEventListener('click', () => runSendAllDMs('linkedin'));
  if (saveSocialCreds) saveSocialCreds.addEventListener('click', saveSocialCredentials);

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
const TAB_TITLES = {
  upload: 'Leads', generate: 'Generate Emails', followup: 'Follow-ups',
  socials: 'Social Handles', dms: 'Cold DMs', send: 'Send Emails',
  history: 'History', settings: 'Settings',
};

function switchTab(tab) {
  if (document.body.classList.contains('auth-locked')) { showLogin(); return; }
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
  if (topbarTitle) topbarTitle.textContent = TAB_TITLES[tab] || tab;
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
      instagram: '',
      linkedin: '',
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
      <td>
        <span class="lead-email-text">${esc(lead.email)}</span>
        <button class="btn-ghost btn-sm edit-email-btn" data-id="${lead.id}" style="margin-left:6px">Edit</button>
      </td>
      <td>${esc(lead.phone)}</td>
      <td><a href="${esc(lead.website)}" target="_blank" title="${esc(lead.website)}">${esc(trimUrl(lead.website))}</a></td>
      <td id="ig-cell-${lead.id}">${renderSocialCell(lead.instagram, 'ig', lead.id)}</td>
      <td id="li-cell-${lead.id}">${renderSocialCell(lead.linkedin, 'li', lead.id)}</td>
      <td><span class="status-badge status-${lead.status}" id="status-${lead.id}">${lead.status}</span></td>
    `;
    tr.querySelector('.edit-email-btn').addEventListener('click', () => openEditEmailModal(lead.id, lead.email));
    // Per-row find socials buttons
    const igFindBtn = tr.querySelector('.find-social-btn[data-type="ig"]');
    const liFindBtn = tr.querySelector('.find-social-btn[data-type="li"]');
    if (igFindBtn) igFindBtn.addEventListener('click', () => findSocialsForLead(lead));
    if (liFindBtn) liFindBtn.addEventListener('click', () => findSocialsForLead(lead));
    leadsBody.appendChild(tr);
  });
// Edit Email Modal DOM refs
const editEmailModal = document.getElementById('editEmailModal');
const editEmailForm = document.getElementById('editEmailForm');
const editLeadEmail = document.getElementById('editLeadEmail');
const editEmailError = document.getElementById('editEmailError');
const cancelEditEmail = document.getElementById('cancelEditEmail');
let editingLeadId = null;

// Show Edit Email Modal
function openEditEmailModal(leadId, currentEmail) {
  editingLeadId = leadId;
  editLeadEmail.value = currentEmail;
  editEmailError.style.display = 'none';
  editEmailModal.classList.remove('hidden');
  editLeadEmail.focus();
}

// Hide Edit Email Modal
if (cancelEditEmail) {
  cancelEditEmail.addEventListener('click', () => {
    editEmailModal.classList.add('hidden');
    editingLeadId = null;
  });
}
const cancelEditEmailInner = document.getElementById('cancelEditEmailInner');
if (cancelEditEmailInner) {
  cancelEditEmailInner.addEventListener('click', () => {
    editEmailModal.classList.add('hidden');
    editingLeadId = null;
  });
}

// Handle Edit Email Form Submission
if (editEmailForm) {
  editEmailForm.addEventListener('submit', (e) => {
    e.preventDefault();
    editEmailError.style.display = 'none';
    const newEmail = editLeadEmail.value.trim();
    if (!newEmail) {
      editEmailError.textContent = 'Email is required.';
      editEmailError.style.display = 'block';
      return;
    }
    // Update email in STATE.leads
    const lead = STATE.leads.find(l => l.id === editingLeadId);
    if (lead) {
      lead.email = newEmail;
      renderLeadsTable();
      editEmailModal.classList.add('hidden');
      editingLeadId = null;
    } else {
      editEmailError.textContent = 'Lead not found.';
      editEmailError.style.display = 'block';
    }
  });
}

  leadCount.textContent = `${STATE.leads.length} lead${STATE.leads.length !== 1 ? 's' : ''} loaded`;
  updateSelectedCount();
  updateStats();

  document.querySelectorAll('.lead-check').forEach(c => {
    c.addEventListener('change', updateSelectedCount);
  });
}

function renderSocialCell(handle, type, leadId) {
  if (handle) {
    const url = type === 'ig'
      ? `https://instagram.com/${handle}`
      : `https://linkedin.com/company/${handle}`;
    const icon = type === 'ig' ? '📸' : '🔗';
    return `<div class="social-handle">${icon} <a href="${esc(url)}" target="_blank">@${esc(handle)}</a></div>`;
  }
  if (!document.getElementById(`status-${leadId}`) || STATE.leads.find(l=>l.id===leadId)?.website) {
    return `<button class="find-social-btn btn-sm" data-type="${type}" title="Find ${type === 'ig' ? 'Instagram' : 'LinkedIn'}">🔍 Find</button>`;
  }
  return '<span style="color:var(--text-3);font-size:0.75rem">—</span>';
}

function updateStats() {
  const leadsCount = STATE.leads.length;
  const emailsCount = STATE.emails.length;
  const socialsCount = STATE.leads.filter(l => l.instagram || l.linkedin).length;
  const dmsCount = STATE.dms.length;

  if (statLeads)   statLeads.textContent   = leadsCount;
  if (statEmails)  statEmails.textContent  = emailsCount;
  if (statSocials) statSocials.textContent = socialsCount;
  if (statDMs)     statDMs.textContent     = dmsCount;

  if (navBadgeLeads)  { navBadgeLeads.textContent  = leadsCount;  navBadgeLeads.style.display  = leadsCount  ? '' : 'none'; }
  if (navBadgeEmails) { navBadgeEmails.textContent = emailsCount; navBadgeEmails.style.display = emailsCount ? '' : 'none'; }
  if (navBadgeDMs)    { navBadgeDMs.textContent    = dmsCount;    navBadgeDMs.style.display    = dmsCount    ? '' : 'none'; }
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
    saveBatch();
    switchTab('generate');
    updateStats();
    toast(`${STATE.emails.length} email${STATE.emails.length !== 1 ? 's' : ''} generated`);
  }
}

// ── INDUSTRY DETECTION & TONE MAPPING ────────────────────────
const INDUSTRY_TONES = [
  {
    industries: ['restaurant', 'cafe', 'food', 'bakery', 'pizza', 'kitchen', 'bistro', 'diner', 'catering', 'bar', 'pub', 'grill', 'sushi', 'bbq'],
    industry: 'food & hospitality',
    tone: 'warm, community-focused, and inviting — like one local business owner talking to another',
    opening: 'Open by acknowledging how much effort goes into running a restaurant or food business, then gently pivot to how their online presence may not be doing justice to the experience they offer in person.',
    structure: 'Start with genuine respect for their craft, highlight the gap between their in-person quality and online presence, then offer to bridge that gap.',
    subject_hint: 'Make the subject feel personal and local, e.g. referencing their food or neighbourhood.',
  },
  {
    industries: ['clinic', 'dental', 'dentist', 'doctor', 'medical', 'health', 'pharmacy', 'physio', 'therapy', 'hospital', 'care', 'skin', 'beauty', 'salon', 'spa', 'wellness', 'yoga', 'fitness', 'gym'],
    industry: 'health, wellness, or beauty',
    tone: 'professional, trustworthy, and calm — like a trusted advisor, not a salesperson',
    opening: 'Open by acknowledging the trust patients or clients place in them, then mention that their website is often the very first touchpoint — and first impressions matter enormously in healthcare and wellness.',
    structure: 'Build trust first, then identify specific credibility or UX gaps on their site, then offer a solution that reflects their professionalism.',
    subject_hint: 'Keep the subject line clean and professional, not salesy. Focus on trust and credibility.',
  },
  {
    industries: ['law', 'legal', 'solicitor', 'attorney', 'barrister', 'advocate', 'notary', 'accountant', 'accounting', 'finance', 'financial', 'tax', 'audit', 'consulting', 'consultant'],
    industry: 'professional services (legal, financial, or consulting)',
    tone: 'highly professional, precise, and respectful — peer-to-peer, not vendor-to-client',
    opening: 'Open by noting that in professional services, a firm\'s website is a direct reflection of its credibility and attention to detail — then point out specific areas where their site falls short of that standard.',
    structure: 'Lead with credibility and the high standards their clients expect, surface specific site weaknesses as a risk to their reputation, position the redesign as protecting and growing that reputation.',
    subject_hint: 'Use a subject line that feels formal and credible, focused on reputation or client experience.',
  },
  {
    industries: ['shop', 'store', 'retail', 'boutique', 'fashion', 'clothing', 'jewellery', 'jewelry', 'gift', 'ecommerce', 'online store', 'product', 'furniture', 'decor', 'toys', 'electronics'],
    industry: 'retail or ecommerce',
    tone: 'results-focused and commercial — speak directly to sales, conversions, and lost revenue',
    opening: 'Open by pointing out that for a retail or ecommerce business, the website IS the storefront — and every friction point is a lost sale.',
    structure: 'Lead with a specific revenue or conversion angle, identify the UX and trust gaps costing them sales, then offer a direct solution.',
    subject_hint: 'Use a subject line focused on growth, sales, or "leaving money on the table."',
  },
  {
    industries: ['school', 'college', 'university', 'academy', 'education', 'tutor', 'tutoring', 'training', 'coach', 'coaching', 'course', 'learning', 'childcare', 'nursery', 'kindergarten'],
    industry: 'education or coaching',
    tone: 'encouraging, clear, and parent- or student-focused — approachable but professional',
    opening: 'Open by acknowledging the important work they do in educating or developing people, then point out that families and students are increasingly making decisions based on first impressions online.',
    structure: 'Lead with the impact of their work, highlight how their digital presence may not reflect that quality, offer to help them attract the right students or clients.',
    subject_hint: 'Keep the subject line warm and focused on reach or enrolment, not technical issues.',
  },
  {
    industries: ['construction', 'builder', 'building', 'contractor', 'architecture', 'architect', 'plumber', 'plumbing', 'electrician', 'electric', 'roofing', 'painting', 'renovation', 'interior', 'landscape', 'landscaping', 'cleaning', 'pest', 'hvac', 'solar'],
    industry: 'trades or construction',
    tone: 'straight-talking, practical, and no-nonsense — tradies respect directness over fluff',
    opening: 'Open bluntly: their work is clearly good, but their website doesn\'t show it. Potential clients are choosing competitors purely based on first impressions online.',
    structure: 'Skip lengthy pleasantries. Say what the problem is clearly, show you understand their industry, offer a practical fix.',
    subject_hint: 'Make the subject direct and practical, e.g. "Your website is losing you jobs" or similar.',
  },
  {
    industries: ['hotel', 'accommodation', 'motel', 'resort', 'airbnb', 'rental', 'travel', 'tour', 'tourism', 'real estate', 'realty', 'property', 'estate agent', 'letting'],
    industry: 'hospitality, travel, or real estate',
    tone: 'aspirational and experience-driven — focus on the emotions and expectations their clients arrive with',
    opening: 'Open by noting that in hospitality, travel, or property, the website sets the emotional expectation before a client ever arrives — and a poor site creates doubt, not excitement.',
    structure: 'Paint the picture of what their ideal customer expects to feel, highlight the gap on their current site, offer to create a digital experience that matches the real one.',
    subject_hint: 'Use a subject line that evokes quality and experience, not just technical improvements.',
  },
  {
    industries: ['tech', 'software', 'app', 'startup', 'saas', 'digital', 'agency', 'marketing', 'seo', 'media', 'design', 'creative', 'studio', 'it ', 'it services', 'developer', 'development'],
    industry: 'tech, digital, or creative',
    tone: 'peer-level, sharp, and insight-driven — they are tech-savvy, so avoid generic observations and go specific',
    opening: 'Open by noting that as a digital-first business, their website is their number one sales tool — and right now it may be quietly undermining the quality of work they actually deliver.',
    structure: 'Lead with a sharp, specific insight about their site, not generic fluff. Identify a few concrete issues, then offer clear measurable value.',
    subject_hint: 'Make the subject crisp and specific — no clichés. It should feel like it came from someone who actually looked at their site.',
  },
];

const DEFAULT_TONE = {
  industry: 'small business',
  tone: 'professional yet approachable — genuine, human, and respectful of their time',
  opening: 'Open by acknowledging that running a business is demanding and that their website might not be getting the attention it deserves, then gently point out specific areas where it could be working harder for them.',
  structure: 'Keep it simple: acknowledge their effort, surface 2-3 real issues, offer a clear next step.',
  subject_hint: 'Keep the subject line conversational and curious, not salesy.',
};

function detectIndustryTone(lead) {
  const text = ((lead.name || '') + ' ' + (lead.website || '') + ' ' + (lead.email || '')).toLowerCase();
  for (const profile of INDUSTRY_TONES) {
    if (profile.industries.some(keyword => text.includes(keyword))) {
      return profile;
    }
  }
  return DEFAULT_TONE;
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

  const style = detectIndustryTone(lead);

  const prompt = `You are a real human — a senior web strategist at a boutique web design agency — writing a personal outreach email to a potential client. You are NOT an AI assistant generating a template. You are writing one specific email to one specific business.

${senderContext}

CLIENT DETAILS:
- Business Name: ${lead.name || 'Unknown'}
- Industry: ${style.industry}
- Email: ${lead.email || 'N/A'}
- Phone: ${lead.phone || 'N/A'}
- ${websiteContext}

TONE & VOICE (this is critical — do NOT ignore):
- Write in this exact tone: ${style.tone}
- Opening: ${style.opening}
- Email structure: ${style.structure}
- Subject line guidance: ${style.subject_hint}

STRICT HUMAN WRITING RULES — read these carefully:
1. Do NOT use AI phrases like "I hope this email finds you well", "I wanted to reach out", "I came across your website", "touch base", "moving forward", "leverage", "game-changer", "tailored solutions", or any corporate filler.
2. Do NOT open with a compliment followed immediately by a "but". That pattern is obvious and robotic.
3. Write short sentences. Vary sentence length. Use plain, everyday language.
4. Sound like a real person who actually visited the website and noticed something — not someone running a bulk email campaign.
5. Be specific. Generic lines like "your website needs improvement" are not acceptable. Reference their actual business type and realistic issues.
6. Do not use bullet points inside the email body. Write in natural prose paragraphs.
7. Never use exclamation marks more than once in the entire email (if at all).
8. The email must feel like it was written specifically for this one business, not copy-pasted with a name swapped.

YOUR TASK:
1. WEBSITE ANALYSIS: Identify 3–5 specific, realistic problems likely affecting this type of business website:
   - Issues that hurt first impressions for their specific type of customer
   - Conversion problems relevant to their industry
   - Trust, credibility, or UX gaps a real visitor would notice
   - Technical issues common in their sector (slow speed, no mobile layout, outdated design, weak CTAs, no reviews/testimonials, poor navigation, missing contact info, no SSL, thin copy, etc.)

2. EMAIL: Write the outreach email following all tone and structure rules above.
   - Address the client by first name (extract from business name if needed, otherwise use their business name naturally)
   - Reference their specific website and 2–3 of the identified problems woven naturally into the text
   - ${callCTA}
   - 170–230 words max — tight, readable, no waffle
   - End with a natural sign-off using the SENDER details above

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

async function sendBulk(selectedOnly) {  if (!STATE.smtp.password) {
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

// ── SOCIAL HANDLE FINDER ──────────────────────────────────────
async function findSocialsForLead(lead) {
  if (!lead.website) { toast('This lead has no website', true); return; }
  updateLeadStatus(lead.id, 'finding');

  try {
    const res = await fetch(`${SMTP_API}/find-socials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ website: lead.website }),
    });
    const data = await res.json();
    lead.instagram = data.instagram || lead.instagram || '';
    lead.linkedin  = data.linkedin  || lead.linkedin  || '';

    // Update table cells in-place
    const igCell = document.getElementById(`ig-cell-${lead.id}`);
    const liCell = document.getElementById(`li-cell-${lead.id}`);
    if (igCell) igCell.innerHTML = renderSocialCell(lead.instagram, 'ig', lead.id);
    if (liCell) liCell.innerHTML = renderSocialCell(lead.linkedin, 'li', lead.id);
    // Re-bind buttons
    if (igCell) { const b = igCell.querySelector('.find-social-btn'); if (b) b.addEventListener('click', () => findSocialsForLead(lead)); }
    if (liCell) { const b = liCell.querySelector('.find-social-btn'); if (b) b.addEventListener('click', () => findSocialsForLead(lead)); }

    updateLeadStatus(lead.id, lead.instagram || lead.linkedin ? 'done' : 'pending');
    updateStats();
    return data;
  } catch (err) {
    updateLeadStatus(lead.id, 'error');
    console.error('find-socials error:', err);
    return {};
  }
}

async function runFindSocials() {
  const leads = STATE.leads.filter(l => l.website);
  if (leads.length === 0) { toast('No leads with websites', true); return; }

  showProgress('Finding social handles…', 0);

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    updateProgress(`Finding socials for ${lead.name || lead.website}…`, Math.round(i / leads.length * 100), `${i + 1} of ${leads.length}`);
    await findSocialsForLead(lead);
    await sleep(600);
  }

  updateProgress('Done!', 100, '');
  await sleep(500);
  hideProgress();

  renderSocialsTab();
  switchTab('socials');
  updateStats();
  toast(`Socials search complete — ${STATE.leads.filter(l => l.instagram || l.linkedin).length} found`);
}

function renderSocialsTab() {
  if (!socialsList) return;
  socialsList.innerHTML = '';
  const withSocials = STATE.leads.filter(l => l.instagram || l.linkedin);
  const withoutWebsite = STATE.leads.filter(l => !l.website);

  if (withSocials.length === 0 && STATE.leads.length === 0) {
    socialsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No leads uploaded yet.</p></div>';
    if (socialsActions) socialsActions.style.display = 'none';
    return;
  }

  if (socialsActions) socialsActions.style.display = 'flex';

  STATE.leads.forEach(lead => {
    const card = document.createElement('div');
    card.className = 'email-card';
    const igHtml = lead.instagram
      ? `<a href="https://instagram.com/${esc(lead.instagram)}" target="_blank">@${esc(lead.instagram)}</a>`
      : `<button class="find-social-btn" data-leadid="${lead.id}" data-type="ig">🔍 Find IG</button>`;
    const liHtml = lead.linkedin
      ? `<a href="https://linkedin.com/company/${esc(lead.linkedin)}" target="_blank">${esc(lead.linkedin)}</a>`
      : `<button class="find-social-btn" data-leadid="${lead.id}" data-type="li">🔍 Find LinkedIn</button>`;

    card.innerHTML = `
      <div class="email-card-header">
        <div class="email-card-info">
          <div class="email-card-name">${esc(lead.name || '—')}</div>
          <div class="email-card-meta">${esc(trimUrl(lead.website || ''))}</div>
        </div>
        <div class="email-card-actions">
          <button class="btn-ghost btn-sm refind-btn">🔍 Re-scan</button>
        </div>
      </div>
      <div class="email-card-body open" style="display:flex;gap:2rem;padding:1.1rem 1.25rem">
        <div><div class="issues-label">📸 Instagram</div><div>${igHtml}</div></div>
        <div><div class="issues-label">🔗 LinkedIn</div><div>${liHtml}</div></div>
      </div>
    `;

    card.querySelector('.refind-btn').addEventListener('click', async () => {
      await findSocialsForLead(lead);
      renderSocialsTab();
    });
    card.querySelectorAll('.find-social-btn').forEach(btn => {
      btn.addEventListener('click', async () => { await findSocialsForLead(lead); renderSocialsTab(); });
    });

    socialsList.appendChild(card);
  });
}

function exportSocialsCSV() {
  const rows = ['Name,Email,Website,Instagram,LinkedIn'];
  STATE.leads.forEach(l => {
    rows.push([l.name, l.email, l.website, l.instagram || '', l.linkedin || ''].map(v => `"${(v||'').replace(/"/g,'""')}"`).join(','));
  });
  download('socials.csv', rows.join('\n'));
}

// ── COLD DM GENERATION ────────────────────────────────────────
async function runGenerateDMs() {
  if (!STATE.apiKey) { toast('Please enter your Claude API key first', true); return; }

  const selectedIds = Array.from(document.querySelectorAll('.lead-check:checked'))
    .map(c => parseInt(c.dataset.id));
  const leads = STATE.leads.filter(l => selectedIds.includes(l.id));
  if (leads.length === 0) { toast('No leads selected', true); return; }

  showProgress('Generating Cold DMs…', 0);
  STATE.dms = [];
  dmsList.innerHTML = '';

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const pct = Math.round((i / leads.length) * 100);
    updateProgress(`Generating DMs for ${lead.name || lead.website}…`, pct, `${i + 1} of ${leads.length}`);

    try {
      const result = await generateDMsForLead(lead);
      STATE.dms.push({ lead, ...result });
      renderDMCard({ lead, ...result });
    } catch (err) {
      console.error(err);
      if (i === 0) toast('⚠ ' + err.message, true);
    }
    await sleep(700);
  }

  updateProgress('Done!', 100, '');
  await sleep(500);
  hideProgress();

  if (STATE.dms.length > 0) {
    if (dmsActions) dmsActions.style.display = 'flex';
    switchTab('dms');
    updateStats();
    toast(`${STATE.dms.length} DM set${STATE.dms.length !== 1 ? 's' : ''} generated`);
  }
}

async function generateDMsForLead(lead) {
  const a = STATE.agency;
  const agencyBlurb = [a.agencyName, a.tagline, a.website].filter(Boolean).join(' — ');
  const websiteNote = lead.website ? `Their website: ${lead.website}` : 'No website provided.';
  const igHandle = lead.instagram ? `Their Instagram: @${lead.instagram}` : '';
  const liHandle = lead.linkedin  ? `Their LinkedIn: ${lead.linkedin}` : '';

  const prompt = `You are writing two short cold outreach DMs for a web design agency. Agency: ${agencyBlurb || 'a professional web design agency'}.

CLIENT:
- Business: ${lead.name || 'Unknown'}
- ${websiteNote}
${igHandle}
${liHandle}

Write TWO DMs:

1. INSTAGRAM DM — Casual, friendly, conversational. Max 150 characters. No hashtags. Sound human, not salesy. Should feel like a genuine compliment + quick pitch in 1-2 sentences. Start with their first name if available.

2. LINKEDIN DM — Professional but warm. Max 300 characters. Mention you looked at their business. One specific observation + one clear offer. End with a soft CTA.

Respond ONLY with valid JSON:
{
  "instagram_dm": "...",
  "linkedin_dm": "..."
}`;

  const response = await callClaude(prompt);
  const data = parseJSON(response);
  return {
    instagram_dm: data.instagram_dm || '',
    linkedin_dm:  data.linkedin_dm  || '',
  };
}

function renderDMCard(item) {
  const noEmpty = dmsList.querySelector('.empty-state');
  if (noEmpty) noEmpty.remove();

  const card = document.createElement('div');
  card.className = 'dm-card';
  let activePlatform = 'ig';

  const igIcon = item.lead.instagram ? `📸 @${esc(item.lead.instagram)}` : '📸 Instagram';
  const liIcon = item.lead.linkedin  ? `🔗 ${esc(item.lead.linkedin)}`   : '🔗 LinkedIn';

  const igHandle = (item.lead.instagram || '').replace(/^@/, '');
  const liHandle = (item.lead.linkedin  || '').replace(/^@/, '');
  const igBadgeId = `dm-send-badge-instagram-${igHandle.replace(/[^a-z0-9]/gi, '_')}`;
  const liBadgeId = `dm-send-badge-linkedin-${liHandle.replace(/[^a-z0-9]/gi, '_')}`;

  card.innerHTML = `
    <div class="dm-card-header">
      <div>
        <div class="dm-card-name">${esc(item.lead.name || 'Unknown')}</div>
        <div class="dm-card-handles">
          <span>${igIcon}</span>
          <span>${liIcon}</span>
        </div>
      </div>
      <div class="email-card-actions">
        <button class="btn-primary btn-sm copy-dm-btn">Copy</button>
        ${igHandle ? `<button class="btn-ghost btn-sm send-ig-btn" title="Send Instagram DM">📤 IG</button>` : ''}
        ${liHandle ? `<button class="btn-ghost btn-sm send-li-btn" title="Send LinkedIn DM">📤 LI</button>` : ''}
      </div>
    </div>
    <div class="dm-card-body">
      <div class="dm-platform-tabs">
        <button class="dm-tab active" data-platform="ig">📸 Instagram</button>
        <button class="dm-tab" data-platform="li">🔗 LinkedIn</button>
      </div>
      <div class="dm-text" id="dm-text-${item.lead.id || Date.now()}">${esc(item.instagram_dm)}</div>
      <div class="dm-char-count" id="dm-chars-${item.lead.id || Date.now()}">${(item.instagram_dm||'').length} chars</div>
      <div class="dm-send-badges">
        ${igHandle ? `<span class="dm-send-badge pending" id="${igBadgeId}">IG: Not sent</span>` : ''}
        ${liHandle ? `<span class="dm-send-badge pending" id="${liBadgeId}">LI: Not sent</span>` : ''}
      </div>
    </div>
  `;

  const dmTextEl  = card.querySelector('.dm-text');
  const dmCharsEl = card.querySelector('.dm-char-count');

  card.querySelectorAll('.dm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      card.querySelectorAll('.dm-tab').forEach(t => t.classList.toggle('active', t === tab));
      activePlatform = tab.dataset.platform;
      const text = activePlatform === 'ig' ? item.instagram_dm : item.linkedin_dm;
      dmTextEl.textContent = text;
      dmCharsEl.textContent = `${(text||'').length} chars`;
    });
  });

  card.querySelector('.copy-dm-btn').addEventListener('click', () => {
    const text = activePlatform === 'ig' ? item.instagram_dm : item.linkedin_dm;
    navigator.clipboard.writeText(text).then(() => toast('DM copied!'));
  });

  // Per-card send buttons
  const sendIGBtn = card.querySelector('.send-ig-btn');
  if (sendIGBtn) {
    sendIGBtn.addEventListener('click', async () => {
      const creds = STATE.socialCreds;
      if (!creds.igUsername || !creds.igPassword) { toast('Add Instagram credentials in Settings first.', 'error'); switchTab('settings'); return; }
      sendIGBtn.disabled = true; sendIGBtn.textContent = '⏳ Sending…';
      const badge = document.getElementById(igBadgeId);
      try {
        const resp = await fetch(`${BASE}/send-instagram-dm`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ igUsername: creds.igUsername, igPassword: creds.igPassword, recipientHandle: igHandle, message: item.instagram_dm }),
        });
        const data = await resp.json();
        if (!resp.ok || data.error) throw new Error(data.error || 'Failed');
        if (badge) { badge.textContent = '✓ IG Sent'; badge.className = 'dm-send-badge sent'; }
        sendIGBtn.textContent = '✓ Sent'; toast(`IG DM sent to @${igHandle}`);
      } catch (err) {
        if (badge) { badge.textContent = `✗ ${err.message}`; badge.className = 'dm-send-badge failed'; }
        sendIGBtn.disabled = false; sendIGBtn.textContent = '📤 IG'; toast(`IG DM failed: ${err.message}`, 'error');
      }
    });
  }

  const sendLIBtn = card.querySelector('.send-li-btn');
  if (sendLIBtn) {
    sendLIBtn.addEventListener('click', async () => {
      const creds = STATE.socialCreds;
      if (!creds.liEmail || !creds.liPassword) { toast('Add LinkedIn credentials in Settings first.', 'error'); switchTab('settings'); return; }
      sendLIBtn.disabled = true; sendLIBtn.textContent = '⏳ Sending…';
      const badge = document.getElementById(liBadgeId);
      try {
        const resp = await fetch(`${BASE}/send-linkedin-dm`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ liEmail: creds.liEmail, liPassword: creds.liPassword, recipientHandle: liHandle, message: item.linkedin_dm }),
        });
        const data = await resp.json();
        if (!resp.ok || data.error) throw new Error(data.error || 'Failed');
        if (badge) { badge.textContent = '✓ LI Sent'; badge.className = 'dm-send-badge sent'; }
        sendLIBtn.textContent = '✓ Sent'; toast(`LI DM sent to ${liHandle}`);
      } catch (err) {
        if (badge) { badge.textContent = `✗ ${err.message}`; badge.className = 'dm-send-badge failed'; }
        sendLIBtn.disabled = false; sendLIBtn.textContent = '📤 LI'; toast(`LI DM failed: ${err.message}`, 'error');
      }
    });
  }

  dmsList.appendChild(card);
}

function exportAllDMs() {
  if (!STATE.dms.length) return;
  const text = STATE.dms.map(d =>
    `=== ${d.lead.name} (${d.lead.email || '—'}) ===\n` +
    `Instagram (@${d.lead.instagram || '?'}): ${d.instagram_dm}\n\n` +
    `LinkedIn (${d.lead.linkedin || '?'}): ${d.linkedin_dm}\n` +
    '─'.repeat(60) + '\n'
  ).join('\n');
  download('dms.txt', text);
}

function copyAllDMsText() {
  const text = STATE.dms.map(d =>
    `[${d.lead.name}]\nIG: ${d.instagram_dm}\nLI: ${d.linkedin_dm}`
  ).join('\n\n');
  navigator.clipboard.writeText(text).then(() => toast('All DMs copied!'));
}

// ── SOCIAL CREDENTIALS ────────────────────────────────────────
function saveSocialCredentials() {
  STATE.socialCreds = {
    igUsername: (igUsernameInput ? igUsernameInput.value.trim().replace(/^@/, '') : ''),
    igPassword: (igPasswordInput ? igPasswordInput.value : ''),
    liEmail:    (liEmailInput    ? liEmailInput.value.trim() : ''),
    liPassword: (liPasswordInput ? liPasswordInput.value : ''),
  };
  localStorage.setItem('socialCreds', JSON.stringify(STATE.socialCreds));
  if (socialCredsStatus) {
    socialCredsStatus.classList.remove('hidden');
    setTimeout(() => socialCredsStatus.classList.add('hidden'), 2500);
  }
  toast('Social credentials saved');
}

function loadSocialCredentials() {
  try {
    const stored = localStorage.getItem('socialCreds');
    if (!stored) return;
    const creds = JSON.parse(stored);
    STATE.socialCreds = { ...STATE.socialCreds, ...creds };
    if (igUsernameInput) igUsernameInput.value = creds.igUsername || '';
    if (igPasswordInput) igPasswordInput.value = creds.igPassword || '';
    if (liEmailInput)    liEmailInput.value    = creds.liEmail    || '';
    if (liPasswordInput) liPasswordInput.value = creds.liPassword || '';
  } catch (e) { /* ignore */ }
}

// ── SEND ALL DMs ──────────────────────────────────────────────
async function runSendAllDMs(platform) {
  if (!STATE.dms.length) { toast('No DMs generated yet.'); return; }

  const creds = STATE.socialCreds;
  if (platform === 'instagram' && (!creds.igUsername || !creds.igPassword)) {
    toast('Please save your Instagram credentials in Settings first.', 'error');
    switchTab('settings'); return;
  }
  if (platform === 'linkedin' && (!creds.liEmail || !creds.liPassword)) {
    toast('Please save your LinkedIn credentials in Settings first.', 'error');
    switchTab('settings'); return;
  }

  const platformLabel = platform === 'instagram' ? 'Instagram' : 'LinkedIn';
  const dmKey = platform === 'instagram' ? 'instagram_dm' : 'linkedin_dm';
  const handleKey = platform === 'instagram' ? 'instagram' : 'linkedin';

  const eligible = STATE.dms.filter(d => d.lead[handleKey] && d[dmKey]);
  if (!eligible.length) {
    toast(`No leads have a ${platformLabel} handle + generated DM.`);
    return;
  }

  if (!confirm(`Send ${eligible.length} ${platformLabel} DMs automatically?\n\nThis will use browser automation. Make sure 2FA is disabled on the account.`)) return;

  showProgress(`Sending ${platformLabel} DMs…`, 0);

  const dmsPayload = eligible.map(d => ({
    handle: d.lead[handleKey].replace(/^@/, ''),
    message: d[dmKey],
  }));

  try {
    const body = {
      platform,
      dms: dmsPayload,
      igUsername: creds.igUsername,
      igPassword: creds.igPassword,
      liEmail:    creds.liEmail,
      liPassword: creds.liPassword,
    };

    const resp = await fetch(`${BASE}/send-bulk-dms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await resp.json();

    if (!resp.ok) throw new Error(data.error || 'Server error');

    // Update badges on DM cards
    const results = data.results || [];
    let sent = 0, failed = 0;
    results.forEach(r => {
      if (r.ok) sent++;
      else failed++;
      // Update card badge
      const badge = document.getElementById(`dm-send-badge-${platform}-${r.handle.replace(/[^a-z0-9]/gi, '_')}`);
      if (badge) {
        badge.textContent = r.ok ? '✓ Sent' : `✗ ${r.error || 'Failed'}`;
        badge.className = `dm-send-badge ${r.ok ? 'sent' : 'failed'}`;
      }
    });

    hideProgress();
    toast(`${platformLabel}: ${sent} sent${failed ? `, ${failed} failed` : ''}`);
  } catch (err) {
    hideProgress();
    toast(`Send failed: ${err.message}`, 'error');
  }
}

