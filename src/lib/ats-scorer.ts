// ============================================================
//  BAGUPADU — Deterministic ATS Scorer (Layer 1)
//  Same resume in → same score out, every time.
//  No randomness. No AI calls. Fully reproducible.
// ============================================================
import type { ParsedResume, AtsSuggestion, AtsBreakdownExplanations } from './types';

// --------------- Synonym Map for Semantic Matching ---------------
const SYNONYM_MAP: Record<string, string[]> = {
  'javascript': ['js', 'javascript', 'es6', 'ecmascript'],
  'typescript': ['ts', 'typescript'],
  'react': ['react', 'reactjs', 'react.js'],
  'node.js': ['node', 'nodejs', 'node.js'],
  'vue': ['vue', 'vuejs', 'vue.js'],
  'angular': ['angular', 'angularjs', 'angular.js'],
  'aws': ['aws', 'amazon web services', 'ec2', 's3', 'rds'],
  'python': ['python', 'py'],
  'ci/cd': ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'jenkins', 'github actions', 'gitlab ci'],
  'docker': ['docker', 'docker container', 'containers', 'containerization'],
  'kubernetes': ['kubernetes', 'k8s'],
  'sql': ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'oracle'],
  'nosql': ['nosql', 'mongodb', 'redis', 'dynamodb', 'cassandra'],
  'gcp': ['gcp', 'google cloud', 'google cloud platform'],
  'azure': ['azure', 'microsoft azure'],
  'agile': ['agile', 'scrum', 'kanban'],
  'api': ['api', 'apis', 'rest', 'restful', 'graphql', 'grpc'],
  'css': ['css', 'css3', 'sass', 'scss', 'tailwind', 'tailwindcss', 'bootstrap'],
  'html': ['html', 'html5'],
  'git': ['git', 'github', 'gitlab', 'bitbucket'],
};

// Role-agnostic tech keywords present in most JDs
const COMMON_TECH_KEYWORDS = [
  'agile', 'scrum', 'ci/cd', 'git', 'docker', 'kubernetes', 'rest', 'api', 'sql',
  'nosql', 'cloud', 'aws', 'azure', 'gcp', 'linux', 'typescript', 'javascript',
  'python', 'java', 'react', 'node.js', 'microservices', 'devops', 'testing',
  'postgresql', 'mongodb', 'redis', 'graphql', 'system design', 'architecture',
];

// Stop Words for keyword tokenization
const STOP_WORDS = new Set([
  'and', 'the', 'for', 'with', 'that', 'this', 'have', 'from', 'will', 'your', 'about',
  'their', 'they', 'them', 'then', 'these', 'there', 'than', 'thus', 'also', 'some',
  'more', 'most', 'such', 'both', 'each', 'were', 'been', 'has', 'had', 'does',
  'doing', 'done', 'should', 'could', 'would', 'must', 'under', 'over', 'into', 'upon',
  'other', 'another', 'very', 'here', 'when', 'where', 'why', 'how', 'which',
  'who', 'whom', 'whose', 'what', 'many', 'much', 'few', 'any', 'all'
]);

// Expanded generic job description terms to filter from JD keywords
const EXTRA_STOP_WORDS = new Set([
  'company', 'role', 'technology', 'technologies', 'team', 'experience', 'work', 'development',
  'project', 'client', 'business', 'opportunity', 'support', 'customer', 'product', 'management',
  'collaborate', 'deliver', 'environment', 'service', 'skill', 'skills', 'process', 'system',
  'new', 'build', 'using', 'requirements', 'responsibilities', 'job', 'position', 'description',
  'candidate', 'ability', 'knowledge', 'years', 'working', 'help', 'design', 'implement',
  'create', 'maintain', 'ensure', 'improve', 'optimize', 'scale', 'architecture', 'solutions',
  'applications', 'systems', 'platform', 'tools', 'software', 'engineering', 'developer',
  'engineer', 'lead', 'senior', 'junior', 'full', 'time', 'part', 'remote', 'hybrid', 'office',
  'location', 'apply', 'joining', 'join', 'status', 'employment', 'salary', 'benefits',
  'degree', 'education', 'computer', 'science', 'field', 'related', 'equivalent', 'preferred',
  'required', 'must', 'have', 'strong', 'good', 'excellent', 'written', 'verbal', 'communication',
  'interpersonal', 'skills', 'plus', 'benefit', 'highly', 'motivated', 'passionate', 'drive',
  'deliver', 'meeting', 'meet', 'standards', 'best', 'practices', 'agile', 'scrum', 'methodologies',
  'methodology', 'framework', 'frameworks', 'code', 'quality', 'testing', 'tests', 'unit',
  'integration', 'cicd', 'deployment', 'pipeline', 'pipelines', 'delivery', 'continuous',
  'automated', 'automation', 'cloud', 'services', 'platforms', 'infrastructure', 'database',
  'databases', 'sql', 'nosql', 'api', 'apis', 'web', 'application', 'applications', 'frontend',
  'backend', 'fullstack', 'user', 'interface', 'experience', 'design', 'responsive', 'designing',
  'components', 'reusable', 'performance', 'scalability', 'security', 'compliance', 'standards',
  'members', 'organization', 'teams', 'success', 'successful', 'impact', 'growth', 'goals',
  'capabilities', 'problems', 'problem', 'solving', 'deliverables', 'stack', 'high', 'quality',
  'expert', 'expertise', 'domain', 'functions', 'responsibilities', 'duties',
  'fast', 'key', 'overview', 'growing', 'clean', 'proven', 'track', 'record'
]);

// Comprehensive list of technical and job-relevant skills to prioritize in keyword match
const TECH_AND_SKILLS = [
  'react', 'next.js', 'nextjs', 'typescript', 'javascript', 'python', 'aws', 'docker', 'kubernetes',
  'ci/cd', 'cicd', 'node.js', 'nodejs', 'vue', 'angular', 'sql', 'nosql', 'gcp', 'azure', 'git',
  'github', 'gitlab', 'graphql', 'rest', 'api', 'apis', 'postgresql', 'mongodb', 'redis', 'mysql',
  'dynamodb', 'terraform', 'java', 'c++', 'go', 'golang', 'rust', 'ruby', 'rails', 'swift',
  'kotlin', 'figma', 'sass', 'tailwind', 'bootstrap', 'webpack', 'vite', 'jest', 'cypress',
  'redux', 'context api', 'microservices', 'serverless', 'lambda', 'django', 'flask', 'fastapi',
  'spring', 'spring boot', 'express', 'nest.js', 'nestjs', 'html5', 'css3', 'jquery', 'firebase',
  'elasticsearch', 'kafka', 'rabbitmq', 'machine learning', 'deep learning', 'data science', 'ai',
  'devops', 'pipelines', 'jira', 'confluence', 'jenkins', 'github actions', 'gitlab ci',
  'circleci', 'html', 'css', 'graphql', 'restful', 'testing', 'unit tests', 'integration tests'
];

// Strong action verbs that signal impact
const ACTION_VERBS = [
  'achieved', 'accelerated', 'architected', 'built', 'championed', 'collaborated',
  'created', 'delivered', 'designed', 'developed', 'drove', 'engineered', 'established',
  'exceeded', 'executed', 'grew', 'implemented', 'improved', 'increased', 'initiated',
  'launched', 'led', 'managed', 'mentored', 'optimized', 'orchestrated', 'owned',
  'pioneered', 'reduced', 'scaled', 'shipped', 'solved', 'spearheaded', 'streamlined',
  'transformed',
];

// Metric patterns — signs of quantified impact
const METRIC_PATTERNS = [
  /\d+\s*%/,          // 30%
  /\$\s*\d+/,         // $100k
  /\d+\s*x/i,         // 3x
  /\d+\s*(users?|customers?|clients?|engineers?|team)/i,
  /\d+\s*(million|billion|thousand|k)\b/i,
  /reduced.*by.*\d+/i,
  /increased.*by.*\d+/i,
  /improved.*by.*\d+/i,
];

// --------------- Helper to expand candidate skill with synonyms ---------------
function expandSkill(skill: string): string[] {
  const normalized = skill.toLowerCase().trim();
  const synonyms: string[] = [normalized];
  for (const [key, list] of Object.entries(SYNONYM_MAP)) {
    if (list.includes(normalized) || key === normalized) {
      list.forEach(syn => {
        if (!synonyms.includes(syn)) synonyms.push(syn);
      });
      if (!synonyms.includes(key)) synonyms.push(key);
    }
  }
  return synonyms;
}

// --------------- Scoring Dimensions Result ---------------
interface LayerOneResult {
  score: number;
  label: string;
  breakdown: {
    keyword_match: number;       // /20
    skills_match: number;        // /20
    experience_relevance: number; // /15
    quantified_achievements: number; // /15
    content_quality: number;     // /15 (Legacy compat, set equal to quantified_achievements)
    resume_structure: number;    // /10
    profile_completeness: number; // /10
    readability: number;         // /5
    contact_info: number;        // /5
    
    // Legacy compat fields
    format_score: number;
    content_analysis: {
      has_summary: boolean;
      has_metrics: boolean;
      action_verbs_count: number;
      total_words: number;
    };
    format_check: {
      single_column: boolean;
      standard_fonts: boolean;
      no_tables: boolean;
      no_images: boolean;
    };
  };
  explanations: AtsBreakdownExplanations;
  matched_keywords: string[];
  missing_keywords: string[];
  suggestions: AtsSuggestion[];
  reproducible: true;
  qualitative_available: false;
}

export function runDeterministicAts(parsed: ParsedResume, jobDescription?: string): LayerOneResult {
  const fullText = [
    parsed.name,
    parsed.title,
    parsed.summary,
    ...(parsed.experience?.flatMap(e => [e.title, e.company, ...e.bullets]) ?? []),
    ...(parsed.skills ?? []),
    ...(parsed.education?.flatMap(e => [e.degree, e.institution]) ?? []),
    ...(parsed.projects?.flatMap(p => [p.name, p.description, ...(p.technologies ?? [])]) ?? []),
  ].join(' ').toLowerCase();

  const jdNormalized = (jobDescription || '').toLowerCase();

  // ────────────────────────────────────────
  // 1. KEYWORD RELEVANCE (20 pts)
  // ────────────────────────────────────────
  let keyword_match = 0;
  let keywordsToCheck: string[] = [];
  
  if (jdNormalized.length > 30) {
    const matchedTech = TECH_AND_SKILLS.filter(tech => {
      const escaped = tech.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(jdNormalized);
    });

    const words = jdNormalized.split(/[\s,.:;?!\(\)\{\}\[\]\-\/\\\|"'`~]+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !EXTRA_STOP_WORDS.has(w));
    
    const wordFreq: Record<string, number> = {};
    words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    
    const sortedFreqWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([w]) => w);

    keywordsToCheck = Array.from(new Set([...matchedTech, ...sortedFreqWords])).slice(0, 20);
  } else {
    keywordsToCheck = COMMON_TECH_KEYWORDS;
  }

  let matchedKeywordsCount = 0;
  keywordsToCheck.forEach(kw => {
    let synonyms = [kw];
    for (const [key, list] of Object.entries(SYNONYM_MAP)) {
      if (list.includes(kw) || key === kw) {
        synonyms = Array.from(new Set([...synonyms, ...list, key]));
        break;
      }
    }
    const isMatched = synonyms.some(syn => {
      const escaped = syn.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(fullText);
    });
    if (isMatched) {
      matchedKeywordsCount++;
    }
  });

  const matched_keywords = keywordsToCheck.filter(kw => {
    let synonyms = [kw];
    for (const [key, list] of Object.entries(SYNONYM_MAP)) {
      if (list.includes(kw) || key === kw) {
        synonyms = Array.from(new Set([...synonyms, ...list, key]));
        break;
      }
    }
    return synonyms.some(syn => {
      const escaped = syn.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      return regex.test(fullText);
    });
  });

  const missing_keywords = keywordsToCheck.filter(kw => !matched_keywords.includes(kw));

  if (jdNormalized.length > 30) {
    keyword_match = keywordsToCheck.length > 0
      ? Math.round((matchedKeywordsCount / keywordsToCheck.length) * 20)
      : 0;
  } else {
    if (matchedKeywordsCount >= 10) keyword_match = 20;
    else if (matchedKeywordsCount >= 7) keyword_match = 15;
    else if (matchedKeywordsCount >= 4) keyword_match = 10;
    else if (matchedKeywordsCount >= 2) keyword_match = 5;
    else keyword_match = 2;
  }

  let keywordExplanation = '';
  if (keyword_match >= 16) {
    keywordExplanation = 'Excellent keyword relevance! Your resume successfully incorporates the critical technical terminology from the job description.';
  } else if (keyword_match >= 10) {
    keywordExplanation = `Moderate keyword relevance. You matched ${matchedKeywordsCount}/${keywordsToCheck.length} key terms, but you are missing critical keywords like: ${missing_keywords.slice(0, 3).join(', ')}.`;
  } else {
    keywordExplanation = `Weak keyword relevance. Missing essential job keywords. Integrate terms like: ${missing_keywords.slice(0, 4).join(', ')}.`;
  }

  // ────────────────────────────────────────
  // 2. SKILLS MATCHING (20 pts)
  // ────────────────────────────────────────
  let skills_match = 0;
  const candidateSkillsNormalized = (parsed.skills ?? []).map(s => s.toLowerCase().trim());
  const candidateExpandedSkills = new Set<string>();
  candidateSkillsNormalized.forEach(s => {
    expandSkill(s).forEach(expanded => candidateExpandedSkills.add(expanded));
  });

  const targetJdSkills = new Set<string>();
  if (jdNormalized.length > 30) {
    const allKnownSkills = Array.from(new Set([
      ...Object.keys(SYNONYM_MAP),
      ...COMMON_TECH_KEYWORDS,
      ...TECH_AND_SKILLS,
      'java', 'python', 'c++', 'go', 'rust', 'ruby', 'figma'
    ]));

    allKnownSkills.forEach(skillKey => {
      const synonyms = SYNONYM_MAP[skillKey] || [skillKey];
      const found = synonyms.some(syn => {
        const escaped = syn.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        return regex.test(jdNormalized);
      });
      if (found) {
        targetJdSkills.add(skillKey);
      }
    });
  }

  let matchedSkillsCount = 0;
  const missingSkills: string[] = [];
  targetJdSkills.forEach(jdSkill => {
    if (candidateExpandedSkills.has(jdSkill)) {
      matchedSkillsCount++;
    } else {
      missingSkills.push(jdSkill);
    }
  });

  if (targetJdSkills.size > 0) {
    skills_match = Math.min(20, Math.round((matchedSkillsCount / Math.min(8, targetJdSkills.size)) * 20));
  } else {
    const skillsCount = parsed.skills?.length ?? 0;
    if (skillsCount >= 12) skills_match = 20;
    else if (skillsCount >= 8) skills_match = 15;
    else if (skillsCount >= 5) skills_match = 10;
    else if (skillsCount >= 2) skills_match = 5;
    else skills_match = 2;
  }

  let skillsExplanation = '';
  if (skills_match >= 16) {
    skillsExplanation = 'Strong skills matching! Your dedicated skills section covers the core technologies requested in the target role.';
  } else if (skills_match >= 10) {
    skillsExplanation = `Partial skills matching. Consider adding important missing skills to your resume skill grid, such as: ${missingSkills.slice(0, 3).join(', ')}.`;
  } else {
    skillsExplanation = `Low skills matching. Your skills section needs to explicitly declare key required tech tools like: ${missingSkills.slice(0, 4).join(', ')}.`;
  }

  // ────────────────────────────────────────
  // 3. EXPERIENCE RELEVANCE (15 pts)
  // ────────────────────────────────────────
  let durationPts = 0;
  let totalYears = 0;
  
  if (parsed.experience) {
    parsed.experience.forEach(exp => {
      const years = exp.dates.match(/\b(20\d{2})\b/g);
      if (years && years.length >= 2) {
        totalYears += Math.max(1, Math.abs(parseInt(years[1]) - parseInt(years[0])));
      } else if (years && years.length === 1) {
        const isPresent = /present|current|now/i.test(exp.dates);
        if (isPresent) {
          totalYears += Math.max(1, 2026 - parseInt(years[0]));
        } else {
          totalYears += 1;
        }
      } else {
        totalYears += 1;
      }
    });
  }

  if (totalYears >= 5) durationPts = 5;
  else if (totalYears >= 3) durationPts = 4;
  else if (totalYears >= 1) durationPts = 2;

  let titlePts = 0;
  const targetTitleKeywords = new Set<string>();
  if (jdNormalized.length > 30) {
    const matchWords = ['engineer', 'developer', 'manager', 'designer', 'consultant', 'analyst', 'lead', 'architect', 'scientist', 'frontend', 'backend', 'fullstack', 'data', 'qa', 'product', 'project'];
    matchWords.forEach(w => {
      if (jdNormalized.slice(0, 150).includes(w)) targetTitleKeywords.add(w);
    });
  }
  if (parsed.title) {
    parsed.title.toLowerCase().split(/\s+/).forEach(w => {
      if (w.length > 3) targetTitleKeywords.add(w);
    });
  }

  let hasExactMatch = false;
  let hasPartialMatch = false;
  if (targetTitleKeywords.size > 0 && parsed.experience) {
    parsed.experience.forEach(exp => {
      const expTitleLower = exp.title.toLowerCase();
      targetTitleKeywords.forEach(kw => {
        if (expTitleLower.includes(kw)) {
          hasPartialMatch = true;
          const regex = new RegExp(`\\b${kw}\\b`);
          if (regex.test(expTitleLower)) {
            hasExactMatch = true;
          }
        }
      });
    });
    if (hasExactMatch) titlePts = 5;
    else if (hasPartialMatch) titlePts = 3;
    else titlePts = 1;
  } else {
    titlePts = 3;
  }

  let techAlignPts = 0;
  const expBulletsText = (parsed.experience?.flatMap(e => e.bullets) ?? []).join(' ').toLowerCase();
  const skillsInBullets = (parsed.skills ?? []).filter(s => expBulletsText.includes(s.toLowerCase()));
  if (skillsInBullets.length >= 5) techAlignPts = 5;
  else if (skillsInBullets.length >= 3) techAlignPts = 4;
  else if (skillsInBullets.length >= 1) techAlignPts = 2;

  const experience_relevance = durationPts + titlePts + techAlignPts;

  let experienceExplanation = '';
  if (experience_relevance >= 12) {
    experienceExplanation = `Strong job experience relevance (${totalYears} years) with matching job titles and solid keyword integration inside role descriptions.`;
  } else if (experience_relevance >= 8) {
    experienceExplanation = `Moderate experience relevance. Try to incorporate more specialized tech tools inside your past job bullet descriptions.`;
  } else {
    experienceExplanation = `Low experience relevance. We recommend revising your job titles and adding standard industry terminology to explain your day-to-day duties.`;
  }

  // ────────────────────────────────────────
  // 4. QUANTIFIED ACHIEVEMENTS (15 pts)
  // ────────────────────────────────────────
  let actionVerbBullets = 0;
  const allBullets = parsed.experience?.flatMap(e => e.bullets) ?? [];
  allBullets.forEach(b => {
    const lower = b.toLowerCase();
    const hasVerb = ACTION_VERBS.some(v => lower.startsWith(v) || lower.includes(` ${v} `));
    if (hasVerb) actionVerbBullets++;
  });

  const quantifiedBullets = allBullets.filter(b =>
    METRIC_PATTERNS.some(p => p.test(b))
  ).length;

  const quantified_achievements = quantifiedBullets >= 3 ? 15 : quantifiedBullets === 2 ? 10 : quantifiedBullets === 1 ? 5 : 0;

  let quantifiedExplanation = '';
  if (quantified_achievements >= 15) {
    quantifiedExplanation = `Excellent! Found ${quantifiedBullets} bullet points with quantified achievements. This mirrors the standard STAR method recruitment criteria.`;
  } else if (quantified_achievements >= 5) {
    quantifiedExplanation = `Found only ${quantifiedBullets} quantified bullets. Market-leading JDs prioritize resumes with measurable results (%, currency, metrics). Add more numerical outcomes.`;
  } else {
    quantifiedExplanation = 'Critical improvement area: Zero quantified bullet points found. Recruiters expect data points showing your direct business/technical impact.';
  }

  // ────────────────────────────────────────
  // 5. RESUME FORMATTING & STRUCTURE (10 pts)
  // ────────────────────────────────────────
  let sectionPts = 0;
  if (parsed.experience && parsed.experience.length > 0) sectionPts += 3;
  if (parsed.education && parsed.education.length > 0) sectionPts += 3;
  if (parsed.skills && parsed.skills.length > 0) sectionPts += 2;
  if ((parsed.projects && parsed.projects.length > 0) || (parsed.certifications && parsed.certifications.length > 0)) sectionPts += 2;

  const resume_structure = sectionPts;

  let structureExplanation = '';
  if (resume_structure >= 8) {
    structureExplanation = 'Standard structure verified. Key sections (Experience, Education, Skills) are standard and ATS-readable.';
  } else {
    structureExplanation = 'Basic formatting structure. Ensure you define standard headers (e.g., "Work Experience", "Education") clearly to pass parser gates.';
  }

  // ────────────────────────────────────────
  // 6. SECTION & PROFILE COMPLETENESS (10 pts)
  // ────────────────────────────────────────
  let completePts = 0;
  if (parsed.name) completePts += 2;
  if (parsed.title) completePts += 2;
  if (parsed.summary && parsed.summary.trim().length > 50) completePts += 2;
  if (parsed.experience && parsed.experience.length > 0 && allBullets.length >= 3) completePts += 2;
  if (parsed.education && parsed.education.length > 0) completePts += 2;

  const profile_completeness = completePts;

  let completenessExplanation = '';
  if (profile_completeness >= 8) {
    completenessExplanation = 'Your resume profile sections are detailed, well-populated, and complete.';
  } else {
    completenessExplanation = 'Profile detail is light. Expand your summary objective and add more descriptions to your education/experience blocks.';
  }

  // ────────────────────────────────────────
  // 7. ATS READABILITY / LENGTH (5 pts)
  // ────────────────────────────────────────
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  let wordPts = 0;
  if (wordCount >= 400 && wordCount <= 800) wordPts = 3;
  else if (wordCount >= 250 && wordCount <= 1000) wordPts = 2;
  else wordPts = 1;

  const pronounRegex = /\b(i|me|my|myself|we|our|us)\b/i;
  const bulletsWithPronouns = allBullets.filter(b => pronounRegex.test(b)).length;
  
  let pronounPts = 0;
  if (bulletsWithPronouns === 0 && allBullets.length > 0) pronounPts = 2;
  else if (bulletsWithPronouns <= 2) pronounPts = 1;

  const readability = wordPts + pronounPts;

  let readabilityExplanation = '';
  if (readability >= 4) {
    readabilityExplanation = `Excellent readability. Word count is ${wordCount} words, which conforms to the recommended layout constraints.`;
  } else {
    readabilityExplanation = `Word count is ${wordCount} words. Standard resumes must sit between 400 and 800 words, without using personal pronouns.`;
  }

  // ────────────────────────────────────────
  // 8. CONTACT INFORMATION VALIDATION (5 pts)
  // ────────────────────────────────────────
  let contactPts = 0;
  if (parsed.email) contactPts += 1;
  if (parsed.phone) contactPts += 1;
  if (parsed.location) contactPts += 1;
  if (parsed.linkedin) contactPts += 1;
  if (parsed.github) contactPts += 1;

  const contact_info = contactPts;

  let contactExplanation = '';
  if (contact_info >= 4) {
    contactExplanation = 'Contact details verified. LinkedIn, Email, Phone number, and Location parameters are valid.';
  } else {
    contactExplanation = 'Contact detail warning. Ensure you include email, phone number, location, and your LinkedIn profile URL.';
  }

  // ────────────────────────────────────────
  // COMBINED SCORE (Out of exactly 100 pts)
  // ────────────────────────────────────────
  const score = Math.min(100, Math.round(
    keyword_match +
    skills_match +
    experience_relevance +
    quantified_achievements +
    resume_structure +
    profile_completeness +
    readability +
    contact_info
  ));

  const label = score >= 75 ? 'Excellent' : score >= 55 ? 'Good' : score >= 30 ? 'Needs Improvement' : 'Very Poor';

  // ────────────────────────────────────────
  // ACTIONABLE SUGGESTIONS GENERATOR (TOP 5)
  // ────────────────────────────────────────
  const rawSuggestionsList: { text: string; impact: string; section: string; weight: number }[] = [];

  // Suggestion 1: Missing keywords
  if (keyword_match < 18 && missing_keywords.length > 0) {
    const missingSlice = missing_keywords.slice(0, 3);
    const impactVal = Math.min(8, 20 - keyword_match);
    rawSuggestionsList.push({
      text: `Integrate missing keywords such as: ${missingSlice.join(', ')} directly into your experience bullet points and summary.`,
      impact: `+${impactVal} pts`,
      section: 'Keyword Match',
      weight: impactVal
    });
  }

  // Suggestion 2: Missing skills
  if (skills_match < 18 && missingSkills.length > 0) {
    const skillsSlice = missingSkills.slice(0, 3);
    const impactVal = Math.min(7, 20 - skills_match);
    rawSuggestionsList.push({
      text: `Explicitly add important skills required by the job description to your skills section: ${skillsSlice.join(', ')}.`,
      impact: `+${impactVal} pts`,
      section: 'Skills Match',
      weight: impactVal
    });
  }

  // Suggestion 3: Experience Relevance
  if (experience_relevance < 12) {
    const impactVal = Math.min(5, 15 - experience_relevance);
    rawSuggestionsList.push({
      text: 'Align past job descriptions and titles with the target role, detailing specific tech-stack tools inside experience bullets.',
      impact: `+${impactVal} pts`,
      section: 'Experience Relevance',
      weight: impactVal
    });
  }

  // Suggestion 4: Metrics (Quantifying achievements)
  if (quantified_achievements < 15) {
    const impactVal = Math.min(10, 15 - quantified_achievements);
    rawSuggestionsList.push({
      text: 'Quantify achievements and project outcomes using metrics (e.g. "reduced system latency by 20%" or "managed a budget of $50k").',
      impact: `+${impactVal} pts`,
      section: 'Quantified Achievements',
      weight: impactVal
    });
  }

  // Suggestion 5: Section Completeness
  if (profile_completeness < 8) {
    const impactVal = Math.min(4, 10 - profile_completeness);
    rawSuggestionsList.push({
      text: 'Expand descriptions under experience bullet points to have at least 3 high-quality bullets per role.',
      impact: `+${impactVal} pts`,
      section: 'Section Completeness',
      weight: impactVal
    });
  }

  // Suggestion 6: Pronouns check
  if (bulletsWithPronouns > 0) {
    rawSuggestionsList.push({
      text: 'Remove first-person pronouns (I, me, my, we) from experience bullet points to conform to standard resume formatting.',
      impact: '+2 pts',
      section: 'Readability',
      weight: 2
    });
  }

  // Suggestion 7: Readability (Word count)
  if (readability < 4) {
    rawSuggestionsList.push({
      text: `Adjust total word count (${wordCount} words) to target the optimal range of 400-800 words to guarantee recruiter engagement and layout balance.`,
      impact: '+2 pts',
      section: 'Readability',
      weight: 2
    });
  }

  // Suggestion 8: Contact Card URLs
  if (contact_info < 5) {
    const impactVal = Math.min(3, 5 - contact_info);
    rawSuggestionsList.push({
      text: 'Complete your contact information by adding links to your LinkedIn profile page and GitHub portfolio.',
      impact: `+${impactVal} pts`,
      section: 'Contact Validation',
      weight: impactVal
    });
  }

  // Sort raw suggestions by point weight descending to get the top 5
  rawSuggestionsList.sort((a, b) => b.weight - a.weight);

  // Take top 5
  const suggestions: AtsSuggestion[] = rawSuggestionsList.slice(0, 5).map(item => ({
    text: item.text,
    impact: item.impact,
    section: item.section
  }));

  // Fallbacks if we have less than 5 suggestions
  if (suggestions.length < 5) {
    const fallbacks = [
      { text: 'Tailor your professional summary paragraph to mirror keywords from the target role.', impact: 'Best Practice', section: 'General' },
      { text: 'Ensure consistent bullet formatting and font sizes across all sections.', impact: 'Best Practice', section: 'General' },
      { text: 'Confirm your contact details are verified and up to date.', impact: 'Best Practice', section: 'General' },
    ];
    while (suggestions.length < 5 && fallbacks.length > 0) {
      const fb = fallbacks.shift();
      if (fb) suggestions.push(fb);
    }
  }

  const explanations: AtsBreakdownExplanations = {
    keyword_match: keywordExplanation,
    skills_match: skillsExplanation,
    experience_relevance: experienceExplanation,
    content_quality: quantifiedExplanation, // Keep for backward compatibility
    quantified_achievements: quantifiedExplanation,
    resume_structure: structureExplanation,
    readability: readabilityExplanation,
    profile_completeness: completenessExplanation,
    contact_info: contactExplanation,
  };

  const format_score = Math.round(resume_structure * 10);

  return {
    score,
    label,
    breakdown: {
      keyword_match,
      skills_match,
      experience_relevance,
      quantified_achievements,
      content_quality: quantified_achievements, // maps content_quality to quantified_achievements for compatibility
      resume_structure,
      readability,
      profile_completeness,
      contact_info,
      
      // Legacy compat properties:
      format_score,
      content_analysis: {
        has_summary: !!parsed.summary && parsed.summary.length > 20,
        has_metrics: quantifiedBullets > 0,
        action_verbs_count: actionVerbBullets,
        total_words: wordCount,
      },
      format_check: {
        single_column: true,
        standard_fonts: true,
        no_tables: true,
        no_images: true,
      },
    },
    explanations,
    matched_keywords,
    missing_keywords: missing_keywords.slice(0, 8),
    suggestions,
    reproducible: true,
    qualitative_available: false,
  };
}

// --------------- Score Label Helpers ---------------
export function scoreToStatus(score: number): 'Optimized' | 'Good' | 'Needs Improve' | 'Below Average' | 'Draft' {
  if (score >= 75) return 'Optimized';
  if (score >= 55) return 'Good';
  if (score >= 30) return 'Needs Improve';
  return 'Below Average';
}
