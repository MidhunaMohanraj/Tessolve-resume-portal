# 💼 TalentVault — Resume Portal

A full-stack resume management portal with role-based dashboards for Employees, Tech Leads, and Managers.

---

## 🚀 How to Run in VS Code

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ installed
- [VS Code](https://code.visualstudio.com/) installed

---

### Step 1 — Open in VS Code

```bash
# Open the folder in VS Code
code resume-portal
```

Or: **File → Open Folder** → select the `resume-portal` folder.

---

### Step 2 — Install Dependencies

Open the **VS Code Terminal** (`Ctrl+`` ` `` ` or View → Terminal) and run:

```bash
npm install
```

This installs Express, SQLite, PDF parser, session handling, etc.

---

### Step 3 — Start the Server

```bash
npm start
```

Or for auto-reload during development:

```bash
npm run dev
```

You'll see:
```
🚀 Resume Portal running at http://localhost:3000

📋 Dummy Login Credentials:
  👤 Employee:  emp001 / emp123
  👤 Employee:  emp002 / emp456
  🔧 Tech Lead: techlead01 / techlead123
  📊 Manager:   manager01 / manager123
```

---

### Step 4 — Open in Browser

Visit: **http://localhost:3000**

---

## 🔑 Login Credentials

| Role       | Username     | Password       | Emp ID  |
|------------|-------------|----------------|---------|
| Employee   | emp001      | emp123         | EMP001  |
| Employee   | emp002      | emp456         | EMP002  |
| Employee   | emp003      | emp789         | EMP003  |
| Tech Lead  | techlead01  | techlead123    | TL001   |
| Tech Lead  | techlead02  | techlead456    | TL002   |
| Manager    | manager01   | manager123     | MGR001  |

---

## 👥 Role Capabilities

### 🟢 Employee
- Upload resume (PDF/DOCX/TXT)
- View parsed resume (name, email, phone, skills, experience, education, summary)
- KPI is **read-only** (set by manager)
- Submit help/issue tickets (with employee ID auto-attached)
- View status of own tickets

### 🟣 Tech Lead (L1)
- Everything employees can do
- View all reportees in a team table
- Click into any reportee → see their parsed resume + download link
- Leave feedback/comments on reportees

### 🟡 Manager (L2)
- No resume upload (manager-level)
- View direct employee reportees only (NOT tech lead's team)
- View and comment on employee resumes
- Access **Help Desk** — view all tickets with employee ID + issue
- Update ticket status: Open → In Progress → Resolved

---

## 🗂️ Database Access

The SQLite database is at:
```
resume-portal/db/portal.db
```

To view it directly, install **SQLite Viewer** extension in VS Code:
1. Press `Ctrl+Shift+X`
2. Search "SQLite Viewer"
3. Install by Florian Klampfer
4. Right-click `portal.db` → "Open With" → SQLite Viewer

### Tables:
- `users` — all user accounts
- `resumes` — uploaded & parsed resume data
- `feedback` — tech lead & manager comments
- `help_tickets` — support tickets (help desk DB)

---

## 📁 Project Structure

```
resume-portal/
├── server.js              # Entry point
├── package.json
├── db/
│   ├── database.js        # SQLite init + seed
│   └── portal.db          # SQLite DB (auto-created)
├── routes/
│   ├── auth.js            # Login, signup, logout
│   ├── resume.js          # Upload, parse, view, download
│   └── employees.js       # Reportees, feedback, help desk
├── middleware/
│   └── auth.js            # Session auth guards
├── utils/
│   └── resumeParser.js    # Local NLP parser (no API)
├── uploads/               # Resume files (auto-created)
└── public/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

---

## 🔧 VS Code Recommended Extensions

- **REST Client** — test API endpoints
- **SQLite Viewer** — browse the database
- **Nodemon** (auto-installed via devDependencies)

---

## ❓ Troubleshooting

**Port already in use?**
```bash
# Change port:
PORT=4000 npm start
# Then visit http://localhost:4000
```

**npm install fails?**
Make sure Node.js 18+ is installed:
```bash
node --version
```

**Database issues?**
Delete `db/portal.db` and restart — it auto-recreates with seed data.
