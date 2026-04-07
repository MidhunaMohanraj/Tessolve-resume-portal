// ─── Pure JSON file-based database ───────────────────────────────
// Zero native dependencies — works on any Node version
const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db
const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

// ── tiny helpers ──────────────────────────────────────────────────
function readTable(name) {
  const file = path.join(DB_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeTable(name, data) {
  fs.writeFileSync(path.join(DB_DIR, `${name}.json`), JSON.stringify(data, null, 2));
}

function nextId(rows) {
  return rows.length === 0 ? 1 : Math.max(...rows.map(r => r.id || 0)) + 1;
}

// ── public API (mimics the old db module) ─────────────────────────

const db = {
  // users ──────────────────────────────────────────────────────────
  findUser(field, value) {
    return readTable('users').find(u => String(u[field]) === String(value)) || null;
  },
  findUserByIdOrUsername(val) {
    const v = String(val);
    return readTable('users').find(u =>
      String(u.emp_id) === v || u.username === v
    ) || null;
  },
  createUser(data) {
    const users = readTable('users');
    if (users.find(u => String(u.emp_id) === String(data.emp_id)))
      throw new Error('Employee ID already exists');
    const row = { id: nextId(users), ...data, created_at: new Date().toISOString() };
    users.push(row);
    writeTable('users', users);
    return row;
  },
  getReportees(managerId, role) {
    const users = readTable('users');
    if (role === 'techlead') return users.filter(u => String(u.techlead_id) === String(managerId));
    if (role === 'manager')  return users.filter(u => String(u.manager_id)  === String(managerId) && u.role === 'employee');
    return [];
  },

  // resumes ────────────────────────────────────────────────────────
  getResume(emp_id) {
    return readTable('resumes').find(r => String(r.emp_id) === String(emp_id)) || null;
  },
  saveResume(data) {
    const resumes = readTable('resumes');
    const idx = resumes.findIndex(r => String(r.emp_id) === String(data.emp_id));
    const row = { ...data, uploaded_at: new Date().toISOString() };
    if (idx >= 0) resumes[idx] = { ...resumes[idx], ...row };
    else resumes.push({ id: nextId(resumes), ...row });
    writeTable('resumes', resumes);
  },

  // feedback ───────────────────────────────────────────────────────
  addFeedback(data) {
    const rows = readTable('feedback');
    const row  = { id: nextId(rows), ...data, created_at: new Date().toISOString() };
    rows.push(row);
    writeTable('feedback', rows);
    return row;
  },
  getFeedback(emp_id) {
    const rows  = readTable('feedback').filter(f => String(f.emp_id) === String(emp_id));
    const users = readTable('users');
    return rows.map(f => ({
      ...f,
      reviewer_name: users.find(u => String(u.emp_id) === String(f.reviewer_id))?.full_name || f.reviewer_id
    })).reverse();
  },

  // help tickets ───────────────────────────────────────────────────
  addTicket(data) {
    const rows = readTable('help_tickets');
    const row  = { id: nextId(rows), ...data, status: 'open', created_at: new Date().toISOString() };
    rows.push(row);
    writeTable('help_tickets', rows);
    return row;
  },
  getMyTickets(emp_id) {
    return readTable('help_tickets')
      .filter(t => String(t.emp_id) === String(emp_id))
      .reverse();
  },
  getAllTickets() {
    const users = readTable('users');
    return readTable('help_tickets').map(t => ({
      ...t,
      full_name: users.find(u => String(u.emp_id) === String(t.emp_id))?.full_name || ''
    })).reverse();
  },
  updateTicket(id, status) {
    const rows = readTable('help_tickets');
    const idx  = rows.findIndex(t => t.id === Number(id));
    if (idx >= 0) { rows[idx].status = status; writeTable('help_tickets', rows); }
  },
};

// ── seed on first boot ────────────────────────────────────────────
function seed() {
  if (readTable('users').length > 0) return;   // already seeded

  const empData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'employees.json'), 'utf8')
  );

  const users = empData.map((emp, i) => ({
    id:          i + 1,
    emp_id:      String(emp.emp_id),
    username:    String(emp.emp_id),            // login = emp id
    password:    bcrypt.hashSync(String(emp.emp_id), 10),  // password = emp id
    role:        emp.role,
    full_name:   emp.full_name,
    manager_id:  emp.manager_id  ? String(emp.manager_id)  : null,
    techlead_id: emp.techlead_id ? String(emp.techlead_id) : null,
    created_at:  new Date().toISOString(),
  }));

  writeTable('users', users);
  console.log(`✅  Seeded ${users.length} Tessolve employees`);
}

seed();
module.exports = db;
