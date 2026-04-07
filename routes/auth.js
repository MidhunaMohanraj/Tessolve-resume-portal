const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../db/database');
  
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Please enter your Employee ID and password' });

  const user = db.findUserByIdOrUsername(username);
  if (!user)
    return res.status(401).json({ error: `No account found for ID "${username}". Check your Employee ID.` });

  if (!bcrypt.compareSync(String(password), user.password))
    return res.status(401).json({ error: 'Incorrect password. Default password is your Employee ID.' });

  req.session.user = {
    emp_id: user.emp_id, username: user.username,
    role: user.role, full_name: user.full_name,
    manager_id: user.manager_id, techlead_id: user.techlead_id,
  };
  res.json({ success: true, ...req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Not logged in' });
  res.json(req.session.user);
});

module.exports = router;
