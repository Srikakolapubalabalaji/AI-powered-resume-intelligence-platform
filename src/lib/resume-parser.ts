// ============================================================
//  BAGUPADU — Deterministic Resume Parser
//  Converts raw extracted text (from PDF/DOCX) into a
//  structured ParsedResume. No AI calls. Fully reproducible.
// ============================================================
import type { ParsedResume, ExperienceItem, EducationItem, ProjectItem } from './types';

// --------------- Section Header Regexes ---------------
const SECTION_PATTERNS: Record<string, RegExp> = {
  summary: /^(summary|profile|objective|about|professional\s+summary|career\s+objective)\s*:?\s*$/im,
  experience: /^(experience|work\s+experience|employment|professional\s+experience|work\s+history|career\s+history)\s*:?\s*$/im,
  education: /^(education|academic|qualifications|educational\s+background)\s*:?\s*$/im,
  skills: /^(skills|technical\s+skills|core\s+competencies|competencies|technologies|tools\s+&\s+technologies|key\s+skills)\s*:?\s*$/im,
  projects: /^(projects|personal\s+projects|key\s+projects|notable\s+projects|side\s+projects)\s*:?\s*$/im,
  certifications: /^(certifications|certificates|credentials|licenses|professional\s+certifications)\s*:?\s*$/im,
};

// --------------- Contact Regexes ---------------
const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,7}\b/;
const PHONE_RE = /(\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/;
const LINKEDIN_RE = /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([A-Za-z0-9\-_%]+)/i;
const GITHUB_RE = /(?:github\.com\/)([A-Za-z0-9\-_.]+)/i;
const DATE_RANGE_RE = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\s,]\d{4}\s*(?:[\-–—]+\s*(?:present|current|now|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)?[\s,]?\d{0,4})?|\b\d{4}\s*[\-–—]+\s*(?:\d{4}|present|current|now)\b/gi;
const YEAR_ONLY_RE = /\b(19|20)\d{2}\b/g;
const BULLET_RE = /^[\s]*[•\-\*\u25CF\u25E6\u2022\u2023\u2043►▪▶◦>]\s+/;

// --------------- Common Stop Words (for name detection) ---------------
const HEADER_STOP_WORDS = new Set([
  'resume', 'curriculum', 'vitae', 'cv', 'profile', 'page', 'name',
  'address', 'email', 'phone', 'contact', 'objective', 'summary',
]);

// --------------- Helpers ---------------
function lines(text: string): string[] {
  return text.split(/\r?\n/).map(l => l.trim());
}

function cleanLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function isBullet(line: string): boolean {
  return BULLET_RE.test(line);
}

function cleanBullet(line: string): string {
  return line.replace(BULLET_RE, '').trim();
}

function hasDate(line: string): boolean {
  return DATE_RANGE_RE.test(line) || YEAR_ONLY_RE.test(line);
}

function extractName(allLines: string[]): string {
  // Try first 6 non-empty lines — pick the one most likely to be a name
  for (const line of allLines.slice(0, 6)) {
    const clean = cleanLine(line);
    if (!clean || clean.length > 60) continue;
    const lower = clean.toLowerCase();
    if (HEADER_STOP_WORDS.has(lower)) continue;
    if (EMAIL_RE.test(clean) || PHONE_RE.test(clean)) continue;
    if (hasDate(clean)) continue;
    if (clean.includes('@') || clean.includes('http')) continue;
    // At least 2 words, no digits, plausible name length
    const words = clean.split(/\s+/);
    if (words.length >= 2 && words.length <= 5 && !/\d/.test(clean)) {
      return clean;
    }
  }
  return '';
}

function extractTitle(allLines: string[], nameIndex: number): string {
  // Title usually follows the name within the first 8 lines
  for (let i = nameIndex + 1; i < Math.min(nameIndex + 6, allLines.length); i++) {
    const line = cleanLine(allLines[i]);
    if (!line || line.length > 80) continue;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line)) continue;
    if (hasDate(line)) continue;
    if (line.includes('@')) continue;
    const words = line.split(/\s+/);
    if (words.length >= 1 && words.length <= 8) return line;
  }
  return '';
}

function findSectionBoundaries(allLines: string[]): Record<string, { start: number; end: number }> {
  const found: { name: string; idx: number }[] = [];
  allLines.forEach((line, idx) => {
    const trimmed = cleanLine(line);
    for (const [sectionName, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(trimmed)) {
        found.push({ name: sectionName, idx });
        break;
      }
    }
  });
  const boundaries: Record<string, { start: number; end: number }> = {};
  found.forEach((s, i) => {
    const nextStart = i + 1 < found.length ? found[i + 1].idx : allLines.length;
    boundaries[s.name] = { start: s.idx + 1, end: nextStart };
  });
  return boundaries;
}

function extractSectionText(allLines: string[], bounds: { start: number; end: number }): string[] {
  return allLines.slice(bounds.start, bounds.end).map(l => cleanLine(l)).filter(Boolean);
}

function parseExperience(sectionLines: string[]): ExperienceItem[] {
  const items: ExperienceItem[] = [];
  let current: ExperienceItem | null = null;

  for (const line of sectionLines) {
    if (!line) {
      if (current && current.bullets.length > 0) {
        items.push(current);
        current = null;
      }
      continue;
    }

    const dateMatch = hasDate(line);
    const isBull = isBullet(line);

    if (isBull && current) {
      current.bullets.push(cleanBullet(line));
    } else if (dateMatch) {
      if (current) items.push(current);
      // Line contains dates — try to split "Title at Company | 2020 – 2022"
      const datePart = line.match(DATE_RANGE_RE)?.[0] || line.match(YEAR_ONLY_RE)?.[0] || '';
      const withoutDate = line.replace(datePart, '').replace(/[\|\-–—]?\s*$/, '').trim();
      const parts = withoutDate.split(/\s*(?:\||@|at|,)\s*/i);
      current = {
        title: cleanLine(parts[0] || ''),
        company: cleanLine(parts[1] || ''),
        dates: datePart,
        bullets: [],
      };
    } else if (!current) {
      // Start a new experience block
      current = { title: line, company: '', dates: '', bullets: [] };
    } else if (!current.company) {
      current.company = line;
    } else {
      // Might be a bullet without bullet char
      if (line.length < 200) current.bullets.push(line);
    }
  }
  if (current) items.push(current);
  return items.filter(e => e.title || e.company);
}

function parseEducation(sectionLines: string[]): EducationItem[] {
  const items: EducationItem[] = [];
  let current: Partial<EducationItem> | null = null;

  for (const line of sectionLines) {
    if (!line) {
      if (current?.degree || current?.institution) {
        items.push({ degree: current.degree || '', institution: current.institution || '', dates: current.dates || '' });
        current = null;
      }
      continue;
    }
    const dateMatch = hasDate(line);
    if (!current) {
      current = { degree: line, dates: dateMatch ? (line.match(DATE_RANGE_RE)?.[0] || line.match(YEAR_ONLY_RE)?.[0] || '') : '' };
    } else if (dateMatch && !current.dates) {
      current.dates = line.match(DATE_RANGE_RE)?.[0] || line.match(YEAR_ONLY_RE)?.[0] || '';
      if (!current.institution) current.institution = line.replace(current.dates, '').trim();
    } else if (!current.institution) {
      current.institution = line;
    }
  }
  if (current?.degree || current?.institution) {
    items.push({ degree: current.degree || '', institution: current.institution || '', dates: current.dates || '' });
  }
  return items;
}

function parseSkills(sectionLines: string[]): string[] {
  const skills: string[] = [];
  for (const line of sectionLines) {
    // Skills can be comma-separated, pipe-separated, or bullet points
    const clean = isBullet(line) ? cleanBullet(line) : line;
    const parts = clean.split(/[,|•\-\*\/]+/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 50);
    skills.push(...parts);
  }
  return [...new Set(skills)].filter(s => s && !/^\d+$/.test(s));
}

function parseProjects(sectionLines: string[]): ProjectItem[] {
  const projects: ProjectItem[] = [];
  let current: Partial<ProjectItem> | null = null;

  for (const line of sectionLines) {
    if (!line) {
      if (current?.name) {
        projects.push({ name: current.name, description: current.description || '', technologies: current.technologies || [], url: current.url });
        current = null;
      }
      continue;
    }
    if (!current) {
      current = { name: line, description: '', technologies: [], url: '' };
    } else {
      const urlMatch = line.match(/https?:\/\/[^\s]+/);
      if (urlMatch && !current.url) { current.url = urlMatch[0]; continue; }
      if (!current.description) { current.description = cleanBullet(line); continue; }
      // Treat as additional tech keywords
      const techs = line.split(/[,|•\-\*\/]+/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 30);
      current.technologies = [...(current.technologies || []), ...techs];
    }
  }
  if (current?.name) {
    projects.push({ name: current.name, description: current.description || '', technologies: current.technologies || [] });
  }
  return projects;
}

function parseCertifications(sectionLines: string[]): string[] {
  return sectionLines.map(l => (isBullet(l) ? cleanBullet(l) : l)).filter(s => s.length > 2 && s.length < 150);
}

// --------------- Main Export ---------------
export type ParseResult = {
  success: true;
  parsed: ParsedResume;
  rawText: string;
} | {
  success: false;
  error: string;
  rawText: string;
};

export function parseResumeText(rawText: string): { success: boolean; parsed?: ParsedResume; error?: string } {
  if (!rawText || rawText.trim().length < 50) {
    return { success: false, error: 'Resume text is too short or could not be extracted. Please ensure the file is not a scanned image.' };
  }

  const allLines = lines(rawText);
  const nonEmpty = allLines.filter(Boolean);
  if (nonEmpty.length < 5) {
    return { success: false, error: 'Could not extract readable text from this file. Please try a text-based PDF or DOCX format.' };
  }

  // Extract name and title from header area
  const name = extractName(nonEmpty);
  const nameLineIdx = name ? nonEmpty.findIndex(l => cleanLine(l) === name) : 0;
  const title = extractTitle(nonEmpty, nameLineIdx);

  // Extract contact info from first ~15 lines
  const headerText = nonEmpty.slice(0, 15).join(' ');
  const email = headerText.match(EMAIL_RE)?.[0] || '';
  const phone = headerText.match(PHONE_RE)?.[0] || '';
  const linkedinMatch = headerText.match(LINKEDIN_RE);
  const linkedin = linkedinMatch ? `linkedin.com/in/${linkedinMatch[1]}` : '';
  const githubMatch = headerText.match(GITHUB_RE);
  const github = githubMatch ? `github.com/${githubMatch[1]}` : '';

  // Find location — line in header that's not name/title/email/phone/linkedin/github
  let location = '';
  for (const line of nonEmpty.slice(1, 10)) {
    if (line === name || line === title) continue;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line)) continue;
    if (LINKEDIN_RE.test(line) || GITHUB_RE.test(line)) continue;
    if (hasDate(line)) continue;
    // Cities often contain commas: "San Francisco, CA"
    if (/[A-Z][a-z]+,?\s+[A-Z]{2}|[A-Z][a-z]+,\s+[A-Z][a-z]+/.test(line) && line.length < 60) {
      location = line;
      break;
    }
  }

  // Section boundaries
  const bounds = findSectionBoundaries(allLines);

  // Extract each section
  const summaryLines = bounds.summary ? extractSectionText(allLines, bounds.summary) : [];
  const summary = summaryLines.join(' ').trim();

  const experience = bounds.experience
    ? parseExperience(extractSectionText(allLines, bounds.experience))
    : [];

  const education = bounds.education
    ? parseEducation(extractSectionText(allLines, bounds.education))
    : [];

  const skills = bounds.skills
    ? parseSkills(extractSectionText(allLines, bounds.skills))
    : [];

  const projects = bounds.projects
    ? parseProjects(extractSectionText(allLines, bounds.projects))
    : [];

  const certifications = bounds.certifications
    ? parseCertifications(extractSectionText(allLines, bounds.certifications))
    : [];

  // Validation — must have at least a name or some experience/skills to be a valid resume
  if (!name && !skills.length && !experience.length) {
    return {
      success: false,
      error: 'This file does not appear to contain a resume. Could not identify any name, skills, or work experience.',
    };
  }

  const parsed: ParsedResume = {
    name:            name,
    title:           title,
    email:           email,
    phone:           phone,
    location:        location,
    linkedin:        linkedin || undefined,
    github:          github || undefined,
    summary:         summary,
    experience:      experience,
    education:       education,
    skills:          skills,
    projects:        projects.length ? projects : undefined,
    certifications:  certifications.length ? certifications : undefined,
  };

  return { success: true, parsed };
}
