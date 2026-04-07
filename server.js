const express = require('express');
const session = require('express-session');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── body parsing ──────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── sessions ──────────────────────────────────────────────────────
app.use(session({
  secret: 'tessolve_portal_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }   // 8 hours
}));

// ── API routes FIRST (before static) ─────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/resume',    require('./routes/resume'));
app.use('/api/employees', require('./routes/employees'));

// ── catch any API 404 so it returns JSON, not HTML ────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

// ── static files AFTER api routes ─────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── SPA fallback ──────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀  Tessolve Resume Portal → http://localhost:${PORT}`);
  console.log(`\n🔑  Login with your Employee ID as both username and password`);
  console.log(`     e.g.  T1959 / T1959   or   10100 / 10100\n`);
});
