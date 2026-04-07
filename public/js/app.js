// ═══════════════════════════════════════
//  Tessolve Resume Portal
// ═══════════════════════════════════════

const $app = document.getElementById('app');
let USER = null;

// ── theme ────────────────────────────
const theme = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
if (localStorage.getItem('theme') === 'dark') document.documentElement.setAttribute('data-theme','dark');
function toggleTheme() {
  const dark = theme() === 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  localStorage.setItem('theme', dark ? 'light' : 'dark');
  document.querySelectorAll('.theme-icon').forEach(el => el.textContent = dark ? '🌙' : '☀️');
}

// ── api ──────────────────────────────
async function api(url, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(url, {
    credentials: 'include',
    headers: isForm ? {} : { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body && !isForm ? JSON.stringify(opts.body) : opts.body,
  });
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const txt = await res.text();
    throw new Error(`Server error (${res.status}): ${txt.substring(0,120)}`);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── toast ────────────────────────────
function toast(msg, type = 'info') {
  const wrap = document.getElementById('toast-root');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.animation='toastOut .25s ease forwards'; setTimeout(()=>t.remove(),250); }, 3500);
}

// ── init ─────────────────────────────
async function init() {
  try { USER = await api('/api/auth/me'); renderApp(); }
  catch { renderLogin(); }
}

// ════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════

function renderLogin() {
  const dark = theme() === 'dark';
  $app.innerHTML = `
  <div class="auth-page">
    <div class="auth-logo-wrap"><img src="/logo.jpg" alt="Tessolve" /></div>
    <div class="auth-card">
      <h1>Employee Sign In</h1>
      <p class="auth-sub">Access the Tessolve Resume Portal</p>
      <div class="field">
        <label>Employee ID</label>
        <input id="u" type="text" placeholder="e.g. 11741 or T1959" autocomplete="username" />
      </div>
      <div class="field">
        <label>Password</label>
        <input id="p" type="password" placeholder="Default: your Employee ID" autocomplete="current-password" />
      </div>
      <button class="btn btn-orange btn-full mt-4" onclick="doLogin()">Sign In →</button>
      <div class="auth-hint">
        Your default password is your <strong>Employee ID</strong>.<br/>
        Example: ID <strong>T1959</strong> → password <strong>T1959</strong>
      </div>
    </div>
    <div style="position:fixed;top:16px;right:16px">
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme">
        <span class="theme-icon">${dark ? '☀️' : '🌙'}</span>
      </button>
    </div>
  </div>`;
  document.getElementById('p').addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });
  document.getElementById('u').addEventListener('keydown', e => { if (e.key==='Enter') document.getElementById('p').focus(); });
}

async function doLogin() {
  const username = document.getElementById('u').value.trim();
  const password = document.getElementById('p').value.trim();
  if (!username || !password) return toast('Enter your Employee ID and password', 'error');
  try {
    USER = await api('/api/auth/login', { method:'POST', body:{ username, password } });
    toast(`Welcome, ${USER.full_name?.split(' ')[0]}!`, 'success');
    renderApp();
  } catch(e) { toast(e.message, 'error'); }
}

async function doLogout() {
  await api('/api/auth/logout', { method:'POST' });
  USER = null; toast('Signed out', 'info'); renderLogin();
}

// ════════════════════════════════════════
//  APP SHELL — navbar + content
// ════════════════════════════════════════

function renderApp(tab) {
  if (!USER) return renderLogin();
  const dark    = theme() === 'dark';
  const initial = (USER.full_name||'?').charAt(0).toUpperCase();
  const roleLabel = { employee:'Employee', techlead:'Tech Lead', manager:'Manager' }[USER.role];

  // Tab list per role
  const tabsByRole = {
    employee: [['resume','Resume'],['help','Help & Issues']],
    techlead: [['resume','My Resume'],['team','My Team'],['help','Help & Issues']],
    manager:  [['team','Reportees'],['helpdesk','Help Desk']],
  };
  const tabs   = tabsByRole[USER.role];
  const active = tab || tabs[0][0];

  $app.innerHTML = `
  <nav class="navbar">
    <div class="navbar-logo"><img src="/logo.jpg" alt="Tessolve" /></div>
    <div class="navbar-right">
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme">
        <span class="theme-icon">${dark ? '☀️' : '🌙'}</span>
      </button>
      <div class="user-pill">
        <div class="user-avatar">${initial}</div>
        <div class="user-info">
          <div class="user-name-nav">${USER.full_name||USER.emp_id}</div>
          <div class="user-id-nav">#${USER.emp_id}</div>
        </div>
        <span class="role-chip ${USER.role}">${roleLabel}</span>
      </div>
      <button class="signout-btn" onclick="doLogout()">Sign Out</button>
    </div>
  </nav>
  <div class="page-wrap">
    <div class="tabs" id="tab-bar">
      ${tabs.map(([id,label]) => `<div class="tab ${id===active?'active':''}" data-tab="${id}" onclick="switchTab('${id}')">${label}</div>`).join('')}
    </div>
    <div id="tab-content"></div>
  </div>`;

  loadTab(active);
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  loadTab(tab);
}

function loadTab(tab) {
  const c = document.getElementById('tab-content');
  if (!c) return;
  if      (tab === 'resume')   { c.innerHTML = resumeHTML();   initResumePage(); }
  else if (tab === 'help')     { c.innerHTML = helpHTML();     initHelpPage(); }
  else if (tab === 'team')     { c.innerHTML = teamHTML();     initTeamPage(); }
  else if (tab === 'helpdesk') { c.innerHTML = helpdeskHTML(); initHelpdeskPage(); }
}

// ════════════════════════════════════════
//  RESUME TAB
// ════════════════════════════════════════

function resumeHTML() {
  return `
  <div class="two-col">
    <div>
      <div class="card">
        <div class="section-head">
          <div class="section-title"><span class="dot"></span>Upload Resume</div>
        </div>
        <div class="upload-zone" id="uz">
          <input type="file" id="rf" accept=".pdf,.doc,.docx,.txt" onchange="onFileChange(this)" />
          <div class="upload-icon">📁</div>
          <div class="upload-label">Drop your resume here</div>
          <div class="upload-hint">PDF, DOCX or TXT — max 10 MB</div>
        </div>
        <div class="selected-file" id="sf"></div>
        <div id="uprog" style="display:none"><div class="prog-wrap"><div class="prog-bar" id="pb" style="width:0%"></div></div></div>
        <button class="btn btn-orange btn-full mt-4" id="ubtn" onclick="uploadResume()" disabled>Upload Resume</button>
      </div>
    </div>
    <div id="resume-panel">
      <div class="card"><div class="empty"><div class="e-icon">📄</div><p>Loading your resume…</p></div></div>
    </div>
  </div>`;
}

function onFileChange(input) {
  const file = input.files[0]; if (!file) return;
  const sf = document.getElementById('sf');
  sf.style.display = 'block';
  sf.textContent = `📎 ${file.name}  (${(file.size/1024).toFixed(1)} KB)`;
  document.getElementById('ubtn').disabled = false;
}

async function initResumePage() { await loadResumePanel(); }

async function uploadResume() {
  const fi = document.getElementById('rf');
  if (!fi?.files[0]) return toast('Select a file first','error');
  const btn = document.getElementById('ubtn');
  btn.disabled = true; btn.textContent = 'Uploading…';
  document.getElementById('uprog').style.display = 'block';
  document.getElementById('pb').style.width = '45%';
  const fd = new FormData(); fd.append('resume', fi.files[0]);
  try {
    await fetch('/api/resume/upload', { method:'POST', body:fd, credentials:'include' });
    document.getElementById('pb').style.width = '100%';
    toast('Resume uploaded & parsed!', 'success');
    setTimeout(loadResumePanel, 600);
  } catch(e) { toast(e.message,'error'); }
  finally { btn.disabled=false; btn.textContent='Upload Resume'; }
}

async function loadResumePanel(empId=null) {
  const panel = document.getElementById('resume-panel');
  if (!panel) return;
  try {
    const r = empId ? await api(`/api/resume/view/${empId}`) : await api('/api/resume/my');
    if (!r) { panel.innerHTML='<div class="card"><div class="empty"><div class="e-icon">📭</div><p>No resume uploaded yet</p></div></div>'; return; }
    const tid = empId || USER.emp_id;
    panel.innerHTML = `
    <div class="card">
      <div class="section-head">
        <div class="section-title"><span class="dot"></span>Parsed Resume</div>
        <a href="/api/resume/download/${tid}" class="btn btn-ghost-blue btn-sm" target="_blank">⬇ Download</a>
      </div>
      <div class="info-grid">
        <div class="info-cell"><div class="lbl">Name</div><div class="val">${r.parsed_name||'—'}</div></div>
        <div class="info-cell"><div class="lbl">Email</div><div class="val">${r.parsed_email||'—'}</div></div>
        <div class="info-cell"><div class="lbl">Phone</div><div class="val">${r.parsed_phone||'—'}</div></div>
        <div class="info-cell"><div class="lbl">Uploaded</div><div class="val">${new Date(r.uploaded_at).toLocaleDateString()}</div></div>
      </div>
      <div class="rsec">
        <div class="rsec-label">🧩 Skills</div>
        <div class="tags">${(r.parsed_skills||[]).map(s=>`<span class="tag">${s}</span>`).join('')||'<span class="muted" style="font-size:13px;font-weight:600">None detected</span>'}</div>
      </div>
      <div class="rsec">
        <div class="rsec-label">💼 Experience</div>
        ${(r.parsed_experience||[]).map(e=>`<div class="exp-item">${e}</div>`).join('')||'<span class="muted" style="font-size:13px;font-weight:600">Not detected</span>'}
      </div>
      <div class="rsec">
        <div class="rsec-label">🎓 Education</div>
        ${(r.parsed_education||[]).map(e=>`<div class="exp-item">${e}</div>`).join('')||'<span class="muted" style="font-size:13px;font-weight:600">Not detected</span>'}
      </div>
      <div class="rsec">
        <div class="rsec-label">📝 Summary</div>
        <div class="exp-item">${r.parsed_summary||'—'}</div>
      </div>
      <div class="rsec">
        <div class="rsec-label">⭐ KPI Score</div>
        <div class="kpi-box">${r.kpi||'<span style="color:var(--text3);font-weight:600">KPI is set by your manager — not editable here</span>'}</div>
      </div>
    </div>`;
  } catch(e) { panel.innerHTML=`<div class="card"><p style="color:var(--text3);font-weight:600;font-size:13px">${e.message}</p></div>`; }
}

// ════════════════════════════════════════
//  HELP TAB
// ════════════════════════════════════════

function helpHTML() {
  return `
  <div class="two-col">
    <div class="card">
      <div class="section-head"><div class="section-title"><span class="dot"></span>Submit a Ticket</div></div>
      <div class="field">
        <label>Your Employee ID</label>
        <input type="text" value="${USER.emp_id}" readonly />
      </div>
      <div class="field">
        <label>Issue Description</label>
        <textarea id="issue-txt" rows="5" style="resize:vertical" placeholder="Describe your issue in detail…"></textarea>
      </div>
      <button class="btn btn-orange btn-full" onclick="submitTicket()">Submit Ticket</button>
    </div>
    <div class="card">
      <div class="section-head"><div class="section-title"><span class="dot"></span>My Tickets</div></div>
      <div id="my-tickets"><div class="empty"><div class="e-icon">🎫</div><p>Loading…</p></div></div>
    </div>
  </div>`;
}

async function initHelpPage() {
  const tickets = await api('/api/employees/help/my').catch(()=>[]);
  const c = document.getElementById('my-tickets');
  if (!c) return;
  if (!tickets.length) { c.innerHTML='<div class="empty"><div class="e-icon">🎫</div><p>No tickets yet</p></div>'; return; }
  c.innerHTML = tickets.map(t=>`
    <div class="ticket ${t.status}">
      <div class="ticket-head">
        <span class="ticket-id">#${t.id} · ${new Date(t.created_at).toLocaleDateString()}</span>
        <span class="status-badge ${t.status}">${t.status.replace('_',' ')}</span>
      </div>
      <div class="ticket-body">${t.issue}</div>
    </div>`).join('');
}

async function submitTicket() {
  const issue = document.getElementById('issue-txt')?.value.trim();
  if (!issue) return toast('Please describe your issue','error');
  try {
    const r = await api('/api/employees/help',{method:'POST',body:{issue}});
    toast(`Ticket #${r.ticket_id} submitted!`,'success');
    document.getElementById('issue-txt').value='';
    await initHelpPage();
  } catch(e) { toast(e.message,'error'); }
}

// ════════════════════════════════════════
//  TEAM TAB (Tech Lead + Manager)
// ════════════════════════════════════════

function teamHTML() {
  return `
  <div class="card" id="team-card">
    <div class="section-head">
      <div class="section-title"><span class="dot"></span>Team Members</div>
      <span id="team-count" style="font-size:13px;font-weight:700;color:var(--text3)"></span>
    </div>
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input type="text" placeholder="Search by name or employee ID…" oninput="filterTeam(this.value)" />
    </div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Emp ID</th><th>Name</th><th>Role</th><th>Resume</th><th>Action</th></tr></thead>
        <tbody id="team-tbody"><tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">Loading…</td></tr></tbody>
      </table>
    </div>
  </div>
  <div id="emp-detail"></div>`;
}

let _teamData = [];

async function initTeamPage() {
  _teamData = await api('/api/employees/reportees').catch(()=>[]);
  renderTeamTable(_teamData);
  const el = document.getElementById('team-count');
  if (el) el.textContent = `${_teamData.length} member${_teamData.length!==1?'s':''}`;
}

function filterTeam(q) {
  const f = q ? _teamData.filter(r =>
    r.full_name?.toLowerCase().includes(q.toLowerCase()) ||
    String(r.emp_id).toLowerCase().includes(q.toLowerCase())
  ) : _teamData;
  renderTeamTable(f);
}

function renderTeamTable(data) {
  const tb = document.getElementById('team-tbody');
  if (!tb) return;
  if (!data.length) { tb.innerHTML='<tr><td colspan="5"><div class="empty"><div class="e-icon">👥</div><p>No members found</p></div></td></tr>'; return; }
  tb.innerHTML = data.map(r=>`
    <tr>
      <td><span class="emp-badge">${r.emp_id}</span></td>
      <td style="font-weight:700;color:var(--text)">${r.full_name||'—'}</td>
      <td><span class="role-chip ${r.role}" style="font-size:10px">${r.role}</span></td>
      <td>${r.has_resume
        ? `<span style="color:var(--green);font-weight:800;font-size:13px">✅ Uploaded</span>`
        : `<span style="color:var(--text3);font-weight:700;font-size:13px">Pending</span>`}</td>
      <td><button class="btn btn-ghost-blue btn-sm" onclick="openEmpDetail('${r.emp_id}','${(r.full_name||'').replace(/'/g,"\\'")}')">View Details</button></td>
    </tr>`).join('');
}

async function openEmpDetail(empId, empName) {
  const d = document.getElementById('emp-detail');
  if (!d) return;
  d.innerHTML = `
  <div class="divider"></div>
  <div class="section-head">
    <div class="section-title"><span class="dot"></span>${empName} <span class="emp-badge" style="margin-left:8px">${empId}</span></div>
    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('emp-detail').innerHTML=''">✕ Close</button>
  </div>
  <div class="two-col">
    <div id="ed-resume"><div class="card"><div class="empty"><div class="e-icon">📄</div><p>Loading…</p></div></div></div>
    <div>
      <div class="card mb-4">
        <div class="section-head"><div class="section-title"><span class="dot"></span>Leave Feedback</div></div>
        <div class="field">
          <textarea id="fb-txt" rows="4" style="resize:vertical" placeholder="Write your feedback or comment…"></textarea>
        </div>
        <button class="btn btn-orange btn-full" onclick="submitFeedback('${empId}')">Submit Feedback</button>
      </div>
      <div class="card">
        <div class="section-head"><div class="section-title"><span class="dot"></span>Feedback History</div></div>
        <div id="ed-feedback"><div class="empty"><div class="e-icon">💬</div><p>Loading…</p></div></div>
      </div>
    </div>
  </div>`;
  d.scrollIntoView({ behavior:'smooth', block:'start' });

  // Load resume
  try {
    const r = await api(`/api/resume/view/${empId}`);
    const rp = document.getElementById('ed-resume');
    if (!rp) return;
    if (!r) { rp.innerHTML='<div class="card"><div class="empty"><div class="e-icon">📭</div><p>No resume uploaded</p></div></div>'; }
    else rp.innerHTML=`
      <div class="card">
        <div class="section-head">
          <div class="section-title"><span class="dot"></span>Resume</div>
          <a href="/api/resume/download/${empId}" class="btn btn-ghost-blue btn-sm" target="_blank">⬇ Download</a>
        </div>
        <div class="info-grid">
          <div class="info-cell"><div class="lbl">Name</div><div class="val">${r.parsed_name||'—'}</div></div>
          <div class="info-cell"><div class="lbl">Email</div><div class="val">${r.parsed_email||'—'}</div></div>
          <div class="info-cell"><div class="lbl">Phone</div><div class="val">${r.parsed_phone||'—'}</div></div>
          <div class="info-cell"><div class="lbl">Uploaded</div><div class="val">${new Date(r.uploaded_at).toLocaleDateString()}</div></div>
        </div>
        <div class="rsec"><div class="rsec-label">🧩 Skills</div>
          <div class="tags">${(r.parsed_skills||[]).map(s=>`<span class="tag">${s}</span>`).join('')||'<span class="muted" style="font-size:13px;font-weight:600">None</span>'}</div>
        </div>
        <div class="rsec"><div class="rsec-label">💼 Experience</div>
          ${(r.parsed_experience||[]).map(e=>`<div class="exp-item">${e}</div>`).join('')||'<span class="muted" style="font-size:13px;font-weight:600">N/A</span>'}
        </div>
        <div class="rsec"><div class="rsec-label">⭐ KPI</div>
          <div class="kpi-box">${r.kpi||'<span style="color:var(--text3);font-weight:600">Not set</span>'}</div>
        </div>
      </div>`;
  } catch(e) { const rp=document.getElementById('ed-resume'); if(rp) rp.innerHTML=`<div class="card"><p style="color:var(--text3);font-weight:600">${e.message}</p></div>`; }

  await loadFeedbackHistory(empId);
}

async function loadFeedbackHistory(empId) {
  const fbs = await api(`/api/employees/feedback/${empId}`).catch(()=>[]);
  const c = document.getElementById('ed-feedback');
  if (!c) return;
  if (!fbs.length) { c.innerHTML='<div class="empty"><div class="e-icon">💬</div><p>No feedback yet</p></div>'; return; }
  c.innerHTML = fbs.map(f=>`
    <div class="fb-item">
      <div class="fb-meta">
        <span class="fb-author">${f.reviewer_name||f.reviewer_id}</span>
        <span class="role-chip ${f.reviewer_role}" style="font-size:9px">${f.reviewer_role}</span>
        <span class="fb-date">${new Date(f.created_at).toLocaleDateString()}</span>
      </div>
      <div class="fb-body">${f.comment}</div>
    </div>`).join('');
}

async function submitFeedback(empId) {
  const comment = document.getElementById('fb-txt')?.value.trim();
  if (!comment) return toast('Write a comment first','error');
  try {
    await api('/api/employees/feedback',{method:'POST',body:{emp_id:empId,comment}});
    toast('Feedback submitted!','success');
    document.getElementById('fb-txt').value='';
    await loadFeedbackHistory(empId);
  } catch(e) { toast(e.message,'error'); }
}

// ════════════════════════════════════════
//  HELP DESK TAB (Manager)
// ════════════════════════════════════════

function helpdeskHTML() {
  return `
  <div class="card">
    <div class="section-head">
      <div class="section-title"><span class="dot"></span>Help Desk Tickets</div>
      <div class="flex-center gap-2">
        <button class="btn btn-ghost btn-sm" onclick="setFilter('all')">All</button>
        <button class="btn btn-ghost-blue btn-sm" onclick="setFilter('open')">Open</button>
        <button class="btn btn-ghost-orange btn-sm" onclick="setFilter('in_progress')">In Progress</button>
        <button class="btn btn-ghost btn-sm" onclick="setFilter('resolved')" style="color:var(--green)">Resolved</button>
      </div>
    </div>
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input type="text" placeholder="Search by name or employee ID…" oninput="searchTickets(this.value)" />
    </div>
    <div id="hd-tickets"><div class="empty"><div class="e-icon">🎫</div><p>Loading…</p></div></div>
  </div>`;
}

let _allTickets = [], _ticketFilter = 'all';

async function initHelpdeskPage() {
  _allTickets = await api('/api/employees/help/all').catch(()=>[]);
  renderTickets();
}

function setFilter(f) { _ticketFilter = f; renderTickets(); }
function searchTickets(q) { renderTickets(q); }

function renderTickets(search='') {
  const c = document.getElementById('hd-tickets');
  if (!c) return;
  let data = _ticketFilter==='all' ? _allTickets : _allTickets.filter(t=>t.status===_ticketFilter);
  if (search) data = data.filter(t =>
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(t.emp_id).includes(search)
  );
  if (!data.length) { c.innerHTML='<div class="empty"><div class="e-icon">🎫</div><p>No tickets found</p></div>'; return; }
  c.innerHTML = data.map(t=>`
    <div class="ticket ${t.status}">
      <div class="ticket-head">
        <div class="flex-center gap-2">
          <span class="ticket-id">#${t.id}</span>
          <span style="font-size:14px;font-weight:800;color:var(--text)">${t.full_name||t.emp_id}</span>
          <span class="emp-badge">${t.emp_id}</span>
        </div>
        <span class="status-badge ${t.status}">${t.status.replace('_',' ')}</span>
      </div>
      <div class="ticket-body">${t.issue}</div>
      <div class="ticket-foot">
        <span>📅 ${new Date(t.created_at).toLocaleString()}</span>
        <div class="flex-center gap-2">
          ${t.status!=='in_progress'?`<button class="btn btn-ghost-orange btn-sm" onclick="updateTicket(${t.id},'in_progress')">Mark In Progress</button>`:''}
          ${t.status!=='resolved'?`<button class="btn btn-sm" style="background:var(--green-bg);color:var(--green);border:1.5px solid rgba(22,163,74,.25);font-weight:800;cursor:pointer;padding:7px 14px;border-radius:var(--r-sm);font-size:12.5px" onclick="updateTicket(${t.id},'resolved')">✅ Resolve</button>`:''}
        </div>
      </div>
    </div>`).join('');
}

async function updateTicket(id, status) {
  try {
    await api(`/api/employees/help/${id}`,{method:'PATCH',body:{status}});
    toast('Ticket updated!','success');
    _allTickets = await api('/api/employees/help/all').catch(()=>[]);
    renderTickets(document.querySelector('#hd-tickets ~ .search-wrap input')?.value||'');
  } catch(e) { toast(e.message,'error'); }
}

// ── boot ─────────────────────────────
init();
