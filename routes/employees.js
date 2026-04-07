const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { requireLogin, requireRole } = require('../middleware/auth');

router.get('/reportees', requireLogin, (req, res) => {
  const user = req.session.user;
  if (!['techlead','manager'].includes(user.role))
    return res.status(403).json({ error: 'Access denied' });
  const reportees = db.getReportees(user.emp_id, user.role);
  const result = reportees.map(r => ({
    ...r,
    has_resume:      !!db.getResume(r.emp_id),
    resume_uploaded: db.getResume(r.emp_id)?.uploaded_at || null,
  }));
  res.json(result);
});

router.post('/feedback', requireRole('techlead','manager'), (req, res) => {
  const reviewer = req.session.user;
  const { emp_id, comment } = req.body;
  if (!emp_id || !comment) return res.status(400).json({ error: 'Missing fields' });

  const target = db.findUser('emp_id', emp_id);
  if (!target) return res.status(404).json({ error: 'Employee not found' });

  if (reviewer.role === 'techlead' && String(target.techlead_id) !== String(reviewer.emp_id))
    return res.status(403).json({ error: 'You can only comment on your reportees' });
  if (reviewer.role === 'manager' && (String(target.manager_id) !== String(reviewer.emp_id) || target.role === 'techlead'))
    return res.status(403).json({ error: 'Access denied' });

  const row = db.addFeedback({ emp_id: String(emp_id), reviewer_id: reviewer.emp_id, reviewer_role: reviewer.role, comment });
  res.json({ success: true, row });
});

router.get('/feedback/:emp_id', requireLogin, (req, res) => {
  res.json(db.getFeedback(req.params.emp_id));
});

router.post('/help', requireLogin, (req, res) => {
  const { issue } = req.body;
  if (!issue) return res.status(400).json({ error: 'Issue description required' });
  const ticket = db.addTicket({ emp_id: req.session.user.emp_id, issue });
  res.json({ success: true, ticket_id: ticket.id });
});

router.get('/help/all', requireRole('manager'), (req, res) => {
  res.json(db.getAllTickets());
});

router.patch('/help/:id', requireRole('manager'), (req, res) => {
  const { status } = req.body;
  if (!['open','in_progress','resolved'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  db.updateTicket(req.params.id, status);
  res.json({ success: true });
});

router.get('/help/my', requireLogin, (req, res) => {
  res.json(db.getMyTickets(req.session.user.emp_id));
});

module.exports = router;
