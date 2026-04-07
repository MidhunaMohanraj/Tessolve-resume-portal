const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');
const db       = require('../db/database');
const { parseResume } = require('../utils/resumeParser');
const { requireLogin } = require('../middleware/auth');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `${req.session.user.emp_id}_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf','.doc','.docx','.txt'].includes(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Only PDF, DOC, DOCX, TXT allowed'));
  },
});

async function extractText(filepath, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  try {
    if (ext === '.pdf')  return (await pdfParse(fs.readFileSync(filepath))).text;
    if (ext === '.docx') return (await mammoth.extractRawText({ path: filepath })).value;
    return fs.readFileSync(filepath, 'utf8');
  } catch (e) { return ''; }
}

router.post('/upload', requireLogin, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const text   = await extractText(req.file.path, req.file.originalname);
    const parsed = parseResume(text);
    db.saveResume({
      emp_id:             req.session.user.emp_id,
      filename:           req.file.originalname,
      filepath:           req.file.path,
      parsed_name:        parsed.name,
      parsed_email:       parsed.email,
      parsed_phone:       parsed.phone,
      parsed_skills:      parsed.skills,
      parsed_experience:  parsed.experience,
      parsed_education:   parsed.education,
      parsed_summary:     parsed.summary,
    });
    res.json({ success: true, parsed });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/my', requireLogin, (req, res) => {
  res.json(db.getResume(req.session.user.emp_id));
});

router.get('/view/:emp_id', requireLogin, (req, res) => {
  const viewer   = req.session.user;
  const targetId = req.params.emp_id;
  const target   = db.findUser('emp_id', targetId);
  if (!target) return res.status(404).json({ error: 'Employee not found' });

  if (viewer.role === 'techlead') {
    if (String(target.techlead_id) !== String(viewer.emp_id) && String(target.emp_id) !== String(viewer.emp_id))
      return res.status(403).json({ error: 'You can only view your reportees' });
  } else if (viewer.role === 'manager') {
    if (String(target.manager_id) !== String(viewer.emp_id))
      return res.status(403).json({ error: 'You can only view your direct reportees' });
    if (target.role === 'techlead')
      return res.status(403).json({ error: 'Managers cannot view tech lead resumes' });
  } else {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(db.getResume(targetId));
});

router.get('/download/:emp_id', requireLogin, (req, res) => {
  const viewer   = req.session.user;
  const targetId = req.params.emp_id;
  const target   = db.findUser('emp_id', targetId);
  if (!target) return res.status(404).json({ error: 'Not found' });

  if (String(viewer.emp_id) !== String(targetId)) {
    if (viewer.role === 'techlead' && String(target.techlead_id) !== String(viewer.emp_id))
      return res.status(403).json({ error: 'Access denied' });
    if (viewer.role === 'manager' && (String(target.manager_id) !== String(viewer.emp_id) || target.role === 'techlead'))
      return res.status(403).json({ error: 'Access denied' });
    if (viewer.role === 'employee')
      return res.status(403).json({ error: 'Access denied' });
  }
  const resume = db.getResume(targetId);
  if (!resume?.filepath || !fs.existsSync(resume.filepath))
    return res.status(404).json({ error: 'File not found' });
  res.download(resume.filepath, resume.filename);
});

module.exports = router;
