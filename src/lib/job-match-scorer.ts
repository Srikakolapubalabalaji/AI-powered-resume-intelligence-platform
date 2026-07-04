// ============================================================
//  BAGUPADU — Job Match Scorer
//  Scores a specific job posting against a parsed resume.
//  Fully deterministic — same inputs always produce same output.
//  4-factor model: Skills (40) + Keywords (25) + Experience (20) + Title (15)
// ============================================================
import type { ParsedResume } from './types';

// Synonym expansion (mirrors ats-scorer.ts)
const SYNONYM_MAP: Record<string, string[]> = {
  'javascript':  ['js', 'javascript', 'es6', 'ecmascript'],
  'typescript':  ['ts', 'typescript'],
  'react':       ['react', 'reactjs', 'react.js'],
  'node.js':     ['node', 'nodejs', 'node.js'],
  'vue':         ['vue', 'vuejs', 'vue.js'],
  'angular':     ['angular', 'angularjs'],
  'aws':         ['aws', 'amazon web services', 'ec2', 's3', 'rds', 'lambda'],
  'python':      ['python', 'py'],
  'ci/cd':       ['ci/cd', 'cicd', 'continuous integration', 'jenkins', 'github actions', 'gitlab ci'],
  'docker':      ['docker', 'containers', 'containerization'],
  'kubernetes':  ['kubernetes', 'k8s'],
  'sql':         ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'oracle'],
  'nosql':       ['nosql', 'mongodb', 'redis', 'dynamodb', 'cassandra', 'firebase'],
  'gcp':         ['gcp', 'google cloud', 'google cloud platform'],
  'azure':       ['azure', 'microsoft azure'],
  'agile':       ['agile', 'scrum', 'kanban'],
  'api':         ['api', 'rest', 'restful', 'graphql', 'grpc'],
  'git':         ['git', 'github', 'gitlab', 'bitbucket'],
  'java':        ['java', 'spring', 'spring boot', 'hibernate', 'maven'],
  'microservices': ['microservices', 'micro-services', 'soa', 'service mesh'],
};

const TECH_KEYWORDS = [
  'react', 'next.js', 'typescript', 'javascript', 'python', 'aws', 'docker',
  'kubernetes', 'ci/cd', 'node.js', 'vue', 'angular', 'sql', 'nosql', 'gcp',
  'azure', 'git', 'graphql', 'rest', 'postgresql', 'mongodb', 'redis', 'mysql',
  'java', 'c++', 'go', 'rust', 'ruby', 'terraform', 'kafka', 'elasticsearch',
  'spring', 'spring boot', 'django', 'flask', 'fastapi', 'express', 'nestjs',
  'microservices', 'devops', 'agile', 'scrum', 'figma', 'sass', 'tailwind',
  'jest', 'cypress', 'selenium', 'linux', 'bash', 'html', 'css', 'sass',
  'webpack', 'vite', 'redux', 'flutter', 'react native', 'swift', 'kotlin',
];

function expandSkill(skill: string): Set<string> {
  const normalized = skill.toLowerCase().trim();
  const result = new Set<string>([normalized]);
  for (const [key, list] of Object.entries(SYNONYM_MAP)) {
    if (list.includes(normalized) || key === normalized) {
      list.forEach(s => result.add(s));
      result.add(key);
    }
  }
  return result;
}

function safeRegex(term: string): RegExp {
  const escaped = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

// ── Result Shape ─────────────────────────────────────────────
export interface JobMatchResult {
  total_score: number;
  breakdown: {
    skills_match: number;      // 0–40
    keyword_match: number;     // 0–25
    experience_match: number;  // 0–20
    title_match: number;       // 0–15
  };
  matched_skills: string[];
  missing_skills: string[];
  matched_keywords: string[];
  missing_keywords: string[];
  experience_gap: 'Qualified' | 'Overqualified' | 'Under-qualified' | 'Unknown';
  resume_years: number;
  req_min_years: number;
  req_max_years: number;
}

// ── Main Scorer ───────────────────────────────────────────────
export function scoreJobMatch(
  resume: ParsedResume,
  jobSkills: string[],
  jobDescription: string,
  jobTitle: string,
  jobExperience: string,
): JobMatchResult {
  const resumeFullText = [
    resume.title || '',
    resume.summary || '',
    ...(resume.skills ?? []),
    ...(resume.experience?.flatMap(e => [e.title, e.company, ...e.bullets]) ?? []),
    ...(resume.projects?.flatMap(p => [p.name, p.description, ...(p.technologies ?? [])]) ?? []),
    ...(resume.certifications ?? []),
  ].join(' ').toLowerCase();

  const jdText = (jobDescription || '').toLowerCase();

  // ── 1. Skills Match (40 pts) ─────────────────────────────
  const resumeSkillExpanded = new Set<string>();
  (resume.skills ?? []).forEach(s => {
    expandSkill(s).forEach(exp => resumeSkillExpanded.add(exp));
  });

  // Also expand skills found in experience bullets
  const techPattern = /\b(React|Vue|Angular|TypeScript|JavaScript|Python|Java|Go|Node\.js|Next\.js|AWS|GCP|Azure|Docker|Kubernetes|Terraform|PostgreSQL|MySQL|MongoDB|Redis|GraphQL|REST|CI\/CD|Git|Linux|Agile|Scrum|Spring|Django|Flutter|Kotlin|Swift)\b/gi;
  const bulletMatches = resumeFullText.match(techPattern) || [];
  bulletMatches.forEach(m => expandSkill(m).forEach(s => resumeSkillExpanded.add(s)));

  const normalizedJobSkills = jobSkills
    .map(s => s.toLowerCase().trim())
    .filter(s => s.length > 1);

  const matched_skills: string[] = [];
  const missing_skills: string[] = [];

  normalizedJobSkills.forEach(jSkill => {
    const synonyms = expandSkill(jSkill);
    const isMatch = [...synonyms].some(s => resumeSkillExpanded.has(s) || resumeFullText.includes(s));
    if (isMatch) matched_skills.push(jSkill);
    else missing_skills.push(jSkill);
  });

  const skillsRatio = normalizedJobSkills.length > 0
    ? matched_skills.length / normalizedJobSkills.length
    : 0.35;
  const skills_match = Math.round(Math.min(40, skillsRatio * 40));

  // ── 2. Keyword Match from JD (25 pts) ───────────────────
  const jdKeywords = jdText.length > 50
    ? TECH_KEYWORDS.filter(kw => safeRegex(kw).test(jdText))
    : [];

  const matched_keywords: string[] = [];
  const missing_keywords: string[] = [];

  jdKeywords.forEach(kw => {
    const synonyms = expandSkill(kw);
    const isMatch = [...synonyms].some(s => safeRegex(s).test(resumeFullText));
    if (isMatch) matched_keywords.push(kw);
    else missing_keywords.push(kw);
  });

  const kwRatio = jdKeywords.length > 0 ? matched_keywords.length / jdKeywords.length : 0.5;
  const keyword_match = Math.round(Math.min(25, kwRatio * 25));

  // ── 3. Experience Level Match (20 pts) ──────────────────
  let resume_years = 0;
  (resume.experience ?? []).forEach(exp => {
    const years = exp.dates.match(/\b(20\d{2})\b/g);
    if (years && years.length >= 2) {
      resume_years += Math.max(1, Math.abs(parseInt(years[1]) - parseInt(years[0])));
    } else if (years?.length === 1) {
      const isPresent = /present|current|now/i.test(exp.dates);
      resume_years += isPresent ? Math.max(1, 2026 - parseInt(years[0])) : 1;
    } else {
      resume_years += 1;
    }
  });

  // Parse required years from job listing string (e.g. "3-5 yrs", "5+ years", "Senior")
  let req_min_years = 0;
  let req_max_years = 99;

  const rangeMatch = jobExperience.match(/(\d+)\s*[-–to]+\s*(\d+)/);
  const plusMatch  = jobExperience.match(/(\d+)\+/);
  const singleMatch = jobExperience.match(/\b(\d+)\b/);

  if (rangeMatch) {
    req_min_years = parseInt(rangeMatch[1]);
    req_max_years = parseInt(rangeMatch[2]);
  } else if (plusMatch) {
    req_min_years = parseInt(plusMatch[1]);
    req_max_years = req_min_years + 5;
  } else if (singleMatch) {
    req_min_years = parseInt(singleMatch[1]);
    req_max_years = req_min_years + 3;
  } else {
    // Label-based fallback
    const jeLower = jobExperience.toLowerCase();
    if (jeLower.includes('entry') || jeLower.includes('fresher') || jeLower.includes('junior')) {
      req_min_years = 0; req_max_years = 2;
    } else if (jeLower.includes('mid') || jeLower.includes('associate')) {
      req_min_years = 2; req_max_years = 5;
    } else if (jeLower.includes('senior') || jeLower.includes('sr.')) {
      req_min_years = 5; req_max_years = 10;
    } else if (jeLower.includes('lead') || jeLower.includes('principal') || jeLower.includes('staff')) {
      req_min_years = 7; req_max_years = 15;
    }
  }

  let experience_match = 0;
  let experience_gap: JobMatchResult['experience_gap'] = 'Unknown';

  if (req_min_years === 0 && req_max_years === 99) {
    experience_match = 16;
    experience_gap = 'Qualified';
  } else if (resume_years >= req_min_years && resume_years <= req_max_years + 2) {
    experience_match = 20;
    experience_gap = 'Qualified';
  } else if (resume_years > req_max_years + 2) {
    experience_match = 14;
    experience_gap = 'Overqualified';
  } else if (resume_years >= req_min_years - 1) {
    experience_match = 16;
    experience_gap = 'Qualified';
  } else {
    const gap = req_min_years - resume_years;
    experience_match = Math.max(4, 20 - gap * 4);
    experience_gap = 'Under-qualified';
  }

  // ── 4. Title Similarity (15 pts) ────────────────────────
  const normalize = (s: string) => s.toLowerCase().trim();
  const jTitle = normalize(jobTitle);
  const rTitle = normalize(resume.title || '');
  const jWords = jTitle.split(/\s+/).filter(w => w.length > 3 && !['with', 'and', 'for', 'the'].includes(w));
  const rWords = rTitle.split(/\s+/).filter(w => w.length > 3);

  const directMatch = jTitle.includes(rTitle) || rTitle.includes(jTitle);
  const wordOverlap  = jWords.filter(w => rWords.includes(w) || rTitle.includes(w)).length;

  // Also check experience job titles
  const expTitles = (resume.experience ?? []).map(e => normalize(e.title));
  const expTitleMatch = expTitles.some(et => {
    const etWords = et.split(/\s+/).filter(w => w.length > 3);
    return etWords.some(w => jTitle.includes(w)) || jTitle.includes(et.split(' ')[0]);
  });

  let title_match = 0;
  if (directMatch) title_match = 15;
  else if (wordOverlap >= 2) title_match = 12;
  else if (wordOverlap >= 1) title_match = 8;
  else if (expTitleMatch) title_match = 6;
  else title_match = 2;

  // ── Final Score ──────────────────────────────────────────
  const total_score = Math.min(98, Math.max(10,
    skills_match + keyword_match + experience_match + title_match
  ));

  return {
    total_score,
    breakdown: { skills_match, keyword_match, experience_match, title_match },
    matched_skills,
    missing_skills: missing_skills.slice(0, 10),
    matched_keywords,
    missing_keywords: missing_keywords.slice(0, 10),
    experience_gap,
    resume_years,
    req_min_years,
    req_max_years,
  };
}
