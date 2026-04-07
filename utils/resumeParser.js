// Local resume parser — no API needed, uses regex + heuristics

function parseResume(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  return {
    name: extractName(text, lines),
    email: extractEmail(text),
    phone: extractPhone(text),
    skills: extractSkills(text),
    experience: extractExperience(text, lines),
    education: extractEducation(text, lines),
    summary: extractSummary(text, lines),
  };
}

function extractName(text, lines) {
  // First non-empty line is usually the name
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && line.length < 60 && !/[@\d]/.test(line) && !/resume|curriculum|vitae/i.test(line)) {
      return toTitleCase(line.replace(/[^a-zA-Z\s\-\.]/g, '').trim());
    }
  }
  return 'N/A';
}

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : 'N/A';
}

function extractPhone(text) {
  const match = text.match(/(\+?\d[\d\s\-().]{8,15}\d)/);
  return match ? match[0].trim() : 'N/A';
}

function extractSkills(text) {
  const techSkills = [
    'JavaScript','TypeScript','Python','Java','C++','C#','Ruby','Go','Rust','Swift','Kotlin','PHP','Scala',
    'React','Angular','Vue','Node.js','Express','Django','Flask','Spring','Laravel','Rails',
    'HTML','CSS','SASS','Bootstrap','Tailwind',
    'MySQL','PostgreSQL','MongoDB','SQLite','Redis','Oracle','SQL Server',
    'AWS','Azure','GCP','Docker','Kubernetes','Jenkins','CI/CD','Git','GitHub','GitLab',
    'REST','GraphQL','gRPC','Microservices','API','JSON','XML',
    'Machine Learning','Deep Learning','TensorFlow','PyTorch','NLP','AI',
    'Agile','Scrum','Kanban','JIRA','Confluence',
    'Linux','Windows','MacOS','Bash','Shell','PowerShell',
    'Excel','Power BI','Tableau','Data Analysis','Statistics',
    'Figma','Sketch','UI/UX','Photoshop','Adobe',
    'Project Management','Leadership','Communication','Problem Solving',
    'Testing','QA','Selenium','JUnit','Jest','Pytest'
  ];

  const found = new Set();
  const lowerText = text;

  for (const skill of techSkills) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) found.add(skill);
  }

  // Also try to find skills section
  const skillsSection = extractSection(text, ['skills', 'technical skills', 'core competencies', 'technologies']);
  if (skillsSection) {
    const extras = skillsSection.split(/[,|•·\n\t\/]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 40);
    extras.forEach(e => found.add(toTitleCase(e)));
  }

  return [...found].slice(0, 20);
}

function extractExperience(text, lines) {
  const section = extractSection(text, ['experience', 'work experience', 'employment', 'work history', 'professional experience']);
  if (!section) return [];

  const experiences = [];
  const blocks = section.split(/\n{2,}/);
  for (const block of blocks.slice(0, 5)) {
    const trimmed = block.trim();
    if (trimmed.length > 20) {
      experiences.push(trimmed.substring(0, 300));
    }
  }
  return experiences.length ? experiences : [section.substring(0, 500)];
}

function extractEducation(text, lines) {
  const section = extractSection(text, ['education', 'academic', 'qualification', 'degree']);
  if (!section) return [];

  const edu = [];
  const blocks = section.split(/\n{1,}/);
  for (const block of blocks.slice(0, 8)) {
    const trimmed = block.trim();
    if (trimmed.length > 5) edu.push(trimmed);
  }
  return edu.slice(0, 6);
}

function extractSummary(text, lines) {
  const section = extractSection(text, ['summary', 'objective', 'profile', 'about', 'overview', 'professional summary']);
  if (section) return section.substring(0, 500);

  // fallback: first paragraph-like block
  const firstBlocks = text.split(/\n{2,}/);
  for (const block of firstBlocks.slice(0, 3)) {
    if (block.length > 80 && block.length < 600) return block.trim();
  }
  return 'N/A';
}

function extractSection(text, headings) {
  const headingPattern = headings.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(
    `(?:^|\\n)\\s*(?:${headingPattern})\\s*[:\\-]?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:[A-Z][A-Za-z ]{2,30}\\s*[:\\n])|$)`,
    'i'
  );
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

module.exports = { parseResume };
