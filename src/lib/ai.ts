// ============================================================
//  AI Provider Router — Routes to real AI or realistic mocks
//  Set NEXT_PUBLIC_APP_MODE=live to use real APIs
// ============================================================

const IS_MOCK = process.env.NEXT_PUBLIC_APP_MODE !== 'live';

// --------------- Mock AI Responses ---------------

const MOCK_DELAYS = { fast: 800, medium: 1500, slow: 2500 };

export async function mockDelay(type: keyof typeof MOCK_DELAYS = 'medium') {
  await new Promise(r => setTimeout(r, MOCK_DELAYS[type]));
}

// Realistic ATS analysis mock
export function mockAtsAnalysis(resumeText: string, jobDescription: string) {
  const hasKeywords = (text: string, keywords: string[]) => keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));

  const techKeywords = ['react', 'typescript', 'node.js', 'aws', 'graphql', 'postgresql', 'docker', 'kubernetes', 'python', 'ci/cd', 'microservices', 'redis', 'terraform', 'agile'];
  const matched = hasKeywords(resumeText + ' ' + jobDescription, techKeywords);
  const missing = techKeywords.filter(k => !matched.includes(k)).slice(0, 5);

  const score = Math.min(98, Math.max(45, 60 + matched.length * 2.5 + Math.floor(Math.random() * 10)));

  return {
    score: Math.round(score),
    breakdown: {
      content_quality: Math.round(score + 2),
      keyword_match: Math.round(score - 4),
      skills_match: Math.round(score + 5),
      format_score: Math.round(score + 8),
      readability: Math.round(score - 2),
      label: score >= 85 ? 'Excellent' : score >= 70 ? 'Very Good' : score >= 55 ? 'Good' : 'Needs Work',
      compatibility: score >= 85 ? 'Highly Compatible' : score >= 70 ? 'Compatible' : 'Partially Compatible',
      content_analysis: {
        has_summary: resumeText.length > 200,
        has_metrics: /\d+%|\$\d+|^\d+ /m.test(resumeText),
        action_verbs_count: (resumeText.match(/\b(architected|led|built|developed|optimized|delivered|reduced|increased|implemented|managed)\b/gi) || []).length,
        total_words: resumeText.split(' ').length,
      },
      format_check: { single_column: true, standard_fonts: true, no_tables: true, no_images: true },
    },
    matched_keywords: matched.slice(0, 10),
    missing_keywords: missing,
    suggestions: [
      'Add quantifiable metrics to each experience bullet point',
      'Include more industry-specific keywords from the job description',
      'Strengthen your professional summary with key achievements',
      'Add relevant certifications to boost credibility',
      missing.length > 0 ? `Consider adding experience with: ${missing.slice(0, 3).join(', ')}` : 'Keywords are well-matched to the job description',
    ],
  };
}

// Realistic cover letter mock
export function mockCoverLetter(params: { jobTitle: string; company: string; tone: string; resumeName: string; resumeTitle: string; jobDescription?: string }) {
  const { jobTitle, company, tone, resumeName, resumeTitle, jobDescription } = params;

  let jdKeywords = '';
  if (jobDescription) {
    const commonSkills = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes', 'SQL', 'CI/CD'];
    const matched = commonSkills.filter(s => jobDescription.toLowerCase().includes(s.toLowerCase()));
    if (matched.length > 0) {
      jdKeywords = ` Specifically, I am excited to leverage my skills in ${matched.join(', ')} to support your team.`;
    }
  }

  const toneMap: Record<string, { opening: string; closing: string }> = {
    Professional: { opening: 'I am writing to express my strong interest in', closing: 'I would welcome the opportunity to discuss how my experience aligns with your team\'s goals.' },
    Enthusiastic: { opening: 'I am thrilled to apply for', closing: 'I am genuinely excited about the possibility of joining your team and contributing to your mission!' },
    Formal: { opening: 'I am applying for the position of', closing: 'I look forward to the opportunity to discuss my qualifications in further detail.' },
    Creative: { opening: 'When I came across', closing: 'I look forward to the chance to bring my unique perspective to your team.' },
  };

  const t = toneMap[tone] || toneMap.Professional;

  return `Dear Hiring Manager,

${t.opening} the ${jobTitle} position at ${company}.${jdKeywords} As a ${resumeTitle || 'professional'} with extensive experience building scalable, user-centric products, I am confident in my ability to make a meaningful contribution to your team.

Throughout my career, I have consistently delivered results that matter — architecting systems that serve millions of users, leading cross-functional teams to exceed goals, and driving measurable improvements in performance and reliability. My technical expertise spans the full stack, with particular depth in React, TypeScript, and cloud infrastructure.

What draws me to ${company} specifically is your commitment to building products that genuinely improve how people work and create. The engineering challenges you face — at scale, with quality — are exactly the kind I thrive on.

${t.closing}

Sincerely,
${resumeName}`;
}

// Realistic interview questions mock
export function mockInterviewQuestions(role: string, category: string): object[] {
  const behavioral = [
    { id: 'q1', text: `Tell me about a time you led a team through a challenging technical decision as a ${role}.`, type: 'behavioral', difficulty: 'medium' },
    { id: 'q2', text: 'Describe a situation where you had to balance technical debt with new feature development.', type: 'behavioral', difficulty: 'hard' },
    { id: 'q3', text: 'Give an example of a time you disagreed with a manager and how you handled it.', type: 'behavioral', difficulty: 'medium' },
    { id: 'q4', text: 'Tell me about your most impactful project. What was your role and what was the outcome?', type: 'behavioral', difficulty: 'easy' },
    { id: 'q5', text: 'Describe a time you failed. What did you learn from it?', type: 'behavioral', difficulty: 'medium' },
  ];
  const technical = [
    { id: 'q1', text: `How would you design a scalable API for a ${role.includes('Senior') ? 'high-traffic' : 'medium-scale'} application?`, type: 'technical', difficulty: 'hard' },
    { id: 'q2', text: 'Explain the difference between SQL and NoSQL databases and when you\'d choose each.', type: 'technical', difficulty: 'medium' },
    { id: 'q3', text: 'What is your approach to performance optimization in a React application?', type: 'technical', difficulty: 'medium' },
    { id: 'q4', text: 'How do you ensure code quality and maintainability in a team environment?', type: 'technical', difficulty: 'easy' },
    { id: 'q5', text: 'Describe your experience with CI/CD pipelines. What tools have you used?', type: 'technical', difficulty: 'medium' },
  ];
  const situational = [
    { id: 'q1', text: 'If you joined our team and discovered a critical security vulnerability in production, what would you do?', type: 'situational', difficulty: 'hard' },
    { id: 'q2', text: 'How would you prioritize a backlog with limited engineering resources?', type: 'situational', difficulty: 'medium' },
    { id: 'q3', text: 'What would you do if a stakeholder kept changing requirements mid-sprint?', type: 'situational', difficulty: 'medium' },
    { id: 'q4', text: 'Imagine you\'re onboarding to a new codebase. How would you approach it?', type: 'situational', difficulty: 'easy' },
    { id: 'q5', text: 'If you disagreed with a technical direction the team chose, how would you handle it?', type: 'situational', difficulty: 'medium' },
  ];

  if (category === 'Technical') return technical;
  if (category === 'Situational') return situational;
  return behavioral;
}

// Realistic interview feedback mock
export function mockInterviewFeedback(question: string, answer: string) {
  const wordCount = answer.split(' ').length;
  const hasStructure = answer.includes('situation') || answer.includes('result') || answer.includes('I') || answer.split('.').length > 2;
  const score = Math.min(10, Math.max(4, 6 + (wordCount > 50 ? 1 : 0) + (hasStructure ? 1 : 0) + (wordCount > 100 ? 1 : 0)));

  return {
    score,
    overall: score >= 8 ? 'Excellent' : score >= 6 ? 'Good' : 'Needs Improvement',
    feedback: score >= 8
      ? 'Strong answer! You demonstrated clear thinking with specific examples and measurable outcomes.'
      : score >= 6
      ? 'Good response. You covered the key points, but could strengthen it with more specific metrics and outcomes.'
      : 'Your answer is a good start, but needs more structure. Try using the STAR method: Situation, Task, Action, Result.',
    strengths: [
      wordCount > 80 ? 'Comprehensive and detailed response' : 'Concise and focused',
      hasStructure ? 'Good use of structured storytelling' : 'Clear and direct communication',
    ],
    improvements: [
      wordCount < 50 ? 'Add more specific details and examples' : 'Consider trimming for brevity',
      'Include quantifiable results (%, numbers, revenue impact)',
      'Explicitly connect your experience to the role\'s requirements',
    ].slice(0, 2),
    model_answer: `A strong answer would use the STAR method: Start with the Situation (briefly set the context), describe your Task (your responsibility), explain the Action you took (focus on YOUR actions, not the team's), and share the measurable Result. For this question: "${question.slice(0, 80)}...", highlight a specific scenario with data-backed outcomes.`,
  };
}

// Deterministic match score calculator
export function computeMatchScore(resumeSkills: string[], jobSkills: string[], resumeTitle: string, jobTitle: string): number {
  const normalize = (s: string) => s.toLowerCase().trim();
  const resumeSet = new Set(resumeSkills.map(normalize));
  const jobSet = jobSkills.map(normalize);

  const overlap = jobSet.filter(s => resumeSet.has(s)).length;
  const skillScore = jobSet.length > 0 ? Math.round((overlap / jobSet.length) * 78) : 30;

  // Title similarity bonus (up to 12 pts)
  const rTitle = normalize(resumeTitle);
  const jTitle = normalize(jobTitle);
  const titleBonus = jTitle.includes(rTitle) || rTitle.includes(jTitle) ? 12 : jTitle.split(' ').some(w => rTitle.includes(w) && w.length > 3) ? 5 : 0;

  // Base score so even zero-skill match gets something reasonable
  return Math.min(98, Math.max(12, skillScore + titleBonus + 10));
}

// Realistic job scraping mock — uses actual resume skills for realistic scoring
export function mockJobScrape(jobTitle: string, location: string, resumeSkills: string[] = [], resumeTitle: string = '') {
  const jobs = [
    { id: 'mock-stripe',  title: `Senior ${jobTitle}`, company: 'Stripe',   location: location || 'Remote',         work_mode: 'Remote',  job_type: 'Full-time', experience: 'Senior',    description: `We are looking for a talented ${jobTitle} to join our team and help build the financial infrastructure of the internet. You'll work on highly scalable systems serving millions of developers worldwide.`, skills: ['React', 'TypeScript', 'Node.js', 'AWS', 'GraphQL'],           posted_date: '2h ago',  apply_url: 'https://stripe.com/jobs',    logo: '💳', source: 'Mock' },
    { id: 'mock-notion',  title: jobTitle,              company: 'Notion',   location: 'San Francisco, CA',           work_mode: 'Hybrid',  job_type: 'Full-time', experience: 'Mid-level', description: `Join Notion as a ${jobTitle} and help us build the connected workspace of the future. We value creativity, curiosity, and a passion for great product.`,                                                   skills: ['React', 'TypeScript', 'PostgreSQL', 'Node.js'],               posted_date: '5h ago',  apply_url: 'https://notion.so/jobs',     logo: '📝', source: 'Mock' },
    { id: 'mock-figma',   title: `${jobTitle} II`,      company: 'Figma',    location: 'New York, NY',                work_mode: 'Hybrid',  job_type: 'Full-time', experience: 'Mid-level', description: `Help Figma build the future of collaborative design. You'll work on real-time systems, browser rendering, and developer tooling.`,                                                                        skills: ['TypeScript', 'WebAssembly', 'C++', 'React'],                  posted_date: '1d ago',  apply_url: 'https://figma.com/jobs',     logo: '🎨', source: 'Mock' },
    { id: 'mock-linear',  title: jobTitle,              company: 'Linear',   location: 'Remote',                      work_mode: 'Remote',  job_type: 'Full-time', experience: 'Mid-level', description: 'Linear is a tool for teams who ship. We are looking for engineers who care deeply about product quality and performance.',                                                                                   skills: ['React', 'TypeScript', 'Electron', 'GraphQL'],                 posted_date: '2d ago',  apply_url: 'https://linear.app/jobs',    logo: '📐', source: 'Mock' },
    { id: 'mock-vercel',  title: `Lead ${jobTitle}`,    company: 'Vercel',   location: 'Remote',                      work_mode: 'Remote',  job_type: 'Full-time', experience: 'Senior',    description: 'Scale Next.js and frontend infrastructure used by millions of developers globally. Own critical systems end to end.',                                                                                         skills: ['Next.js', 'Node.js', 'Rust', 'Distributed Systems'],         posted_date: '3d ago',  apply_url: 'https://vercel.com/careers', logo: '▲', source: 'Mock' },
    { id: 'mock-loom',    title: jobTitle,              company: 'Loom',     location: 'San Francisco, CA',           work_mode: 'Hybrid',  job_type: 'Full-time', experience: 'Mid-level', description: 'Build async video communication tools used by millions of teams. Work on video infrastructure, real-time features, and AI integration.',                                                                        skills: ['React', 'Python', 'WebRTC', 'AWS'],                           posted_date: '4d ago',  apply_url: 'https://loom.com/jobs',      logo: '🎬', source: 'Mock' },
    { id: 'mock-linear2', title: `${jobTitle}`,         company: 'Atlassian',location: 'Austin, TX',                  work_mode: 'Hybrid',  job_type: 'Full-time', experience: 'Entry',     description: 'Atlassian builds enterprise collaboration tools used by 300,000+ companies. Work on Jira, Confluence, or Bitbucket with a world-class engineering team.',                                                   skills: ['Java', 'React', 'PostgreSQL', 'Kubernetes', 'Docker'],        posted_date: '1d ago',  apply_url: 'https://atlassian.com/jobs', logo: '⚡', source: 'Mock' },
    { id: 'mock-shopify', title: `${jobTitle}`,         company: 'Shopify',  location: 'Remote',                      work_mode: 'Remote',  job_type: 'Full-time', experience: 'Mid-level', description: 'Help millions of merchants build their businesses online. Work on one of the largest Ruby on Rails codebases in the world with a mission-driven team.',                                                       skills: ['Ruby on Rails', 'React', 'GraphQL', 'MySQL', 'Redis'],        posted_date: '2d ago',  apply_url: 'https://shopify.com/careers',logo: '🛍️', source: 'Mock' },
    { id: 'mock-airbnb',  title: `Senior ${jobTitle}`,  company: 'Airbnb',   location: location || 'San Francisco, CA',work_mode: 'Hybrid', job_type: 'Full-time', experience: 'Senior',    description: 'Build products that help people belong anywhere. Work on payments, search, ML personalization, and global scale infrastructure.',                                                                              skills: ['Python', 'React', 'Kafka', 'Kubernetes', 'Airflow'],          posted_date: '3d ago',  apply_url: 'https://airbnb.com/careers', logo: '🏠', source: 'Mock' },
    { id: 'mock-github',  title: `${jobTitle}`,         company: 'GitHub',   location: 'Remote',                      work_mode: 'Remote',  job_type: 'Full-time', experience: 'Mid-level', description: 'Help build the platform where the world\'s developers collaborate. Work on code review, CI/CD, Copilot, and security tooling.',                                                                               skills: ['Ruby', 'TypeScript', 'Elasticsearch', 'Docker', 'Git'],       posted_date: '5d ago',  apply_url: 'https://github.com/about/careers', logo: '🐙', source: 'Mock' },
    { id: 'mock-datadog', title: `${jobTitle}`,         company: 'Datadog',  location: location || 'New York, NY',    work_mode: 'Hybrid',  job_type: 'Full-time', experience: 'Mid-level', description: 'Build observability tooling for tens of thousands of customers. Work on metrics, tracing, logs, and AI/ML-powered insights at massive scale.',                                                                  skills: ['Go', 'Python', 'Kubernetes', 'Prometheus', 'Apache Kafka'],   posted_date: '1d ago',  apply_url: 'https://datadoghq.com/careers',logo: '🐶', source: 'Mock' },
    { id: 'mock-netflix', title: `Senior ${jobTitle}`,  company: 'Netflix',  location: 'Los Gatos, CA',               work_mode: 'On-site', job_type: 'Full-time', experience: 'Senior',    description: 'Power the world\'s leading streaming platform. Work on distributed systems, content delivery, and personalization at 200M+ subscriber scale.',                                                                 skills: ['Java', 'Python', 'Cassandra', 'AWS', 'Apache Spark'],         posted_date: '4d ago',  apply_url: 'https://jobs.netflix.com',   logo: '🎬', source: 'Mock' },
  ];

  // Compute match scores from actual resume skills
  return jobs.map(job => ({
    ...job,
    match_score: computeMatchScore(resumeSkills, job.skills, resumeTitle, job.title),
  })).sort((a, b) => b.match_score - a.match_score);
}

import { runDeterministicAts } from './ats-scorer';

// Mock resume optimization
export function mockOptimizeResume(originalResume: any, jobDescription: string) {
  const atsResult = runDeterministicAts(originalResume, jobDescription);
  const extraSkills = atsResult.missing_keywords || [];
  
  const changes = [
    '✅ Strengthened professional summary with quantifiable achievements',
  ];

  if (extraSkills.length > 0) {
    changes.push(`✅ Added missing keywords from job description to skills section: ${extraSkills.join(', ')}`);
  } else {
    changes.push('✅ Added standard industry keywords to skills section');
  }
  changes.push('✅ Replaced weak action verbs with powerful alternatives (e.g. worked -> architected)');
  changes.push('✅ Added metrics to experience bullet points');

  // Return slightly modified version of original
  const optimized = JSON.parse(JSON.stringify(originalResume)); // deep copy

  if (optimized.summary) {
    optimized.summary = `Result-driven professional. ${optimized.summary} Spearheaded system redesign and optimized resource allocation to drive a 30% reduction in cloud infrastructure spend.`;
  } else {
    optimized.summary = `Result-driven professional with a proven track record. Spearheaded system redesign and optimized resource allocation to drive a 30% reduction in cloud infrastructure spend.`;
  }

  if (optimized.skills) {
    const genericStopWords = new Set([
      'fast', 'key', 'overview', 'growing', 'clean', 'proven', 'track', 'record',
      'company', 'role', 'technology', 'technologies', 'team', 'experience', 'work',
      'development', 'project', 'client', 'business', 'opportunity', 'support',
      'customer', 'product', 'management', 'collaborate', 'deliver', 'environment',
      'service', 'skill', 'skills', 'process', 'system', 'new', 'build', 'using',
      'requirements', 'responsibilities', 'job', 'position', 'description', 'results',
      'driven', 'highly', 'successful', 'motivated', 'passionate', 'dynamic'
    ]);
    const skillsToAppend = extraSkills.length > 0 ? extraSkills : ['Docker', 'Kubernetes', 'CI/CD', 'System Design'];
    const cleanSkills = skillsToAppend.filter(s => !genericStopWords.has(s.toLowerCase().trim()));
    // Capitalize the appended skills nicely
    const capitalizedSkills = cleanSkills.map(s => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    optimized.skills = [...new Set([...(optimized.skills || []), ...capitalizedSkills])];
  }

  const verbMap: Record<string, string> = {
    'worked on': 'architected',
    'Worked on': 'Architected',
    'worked': 'engineered',
    'Worked': 'Engineered',
    'helped': 'spearheaded',
    'Helped': 'Spearheaded',
    'managed': 'orchestrated',
    'Managed': 'Orchestrated',
    'did': 'engineered',
    'Did': 'Engineered',
    'made': 'implemented',
    'Made': 'Implemented',
    'wrote': 'developed',
    'Wrote': 'Developed',
  };

  if (optimized.experience && optimized.experience.length > 0) {
    optimized.experience = optimized.experience.map((exp: any, idx: number) => {
      let bullets = exp.bullets || [];
      // Replace weak verbs
      bullets = bullets.map((b: string) => {
        let newBullet = b;
        for (const [weak, strong] of Object.entries(verbMap)) {
          const regex = new RegExp(`\\b${weak}\\b`, 'g');
          newBullet = newBullet.replace(regex, strong);
        }
        return newBullet;
      });

      if (idx === 0) {
        // Add quantified bullet using STAR method
        bullets = [
          'Architected and scaled core platform systems, improving API response times by 45% (STAR method).',
          ...bullets,
        ];
      }
      return {
        ...exp,
        bullets,
      };
    });
  }

  return { optimized, changes, improvements: changes.length };
}

// --------------- Real AI Calls (used when mode=live) ---------------
import { mockDb } from '@/lib/mock-db';

export function isUserMock(userId: string): boolean {
  const user = mockDb.getUser(userId);
  return user?.app_mode !== 'live';
}

export function getLlmConfig(userId: string) {
  const user = mockDb.getUser(userId);
  return {
    app_mode: user?.app_mode || 'mock',
    active_llm: user?.active_llm || 'claude',
    anthropic_key: user?.anthropic_key,
    openai_key: user?.openai_key,
    groq_key: user?.groq_key,
    gemini_key: user?.gemini_key,
  };
}

export async function callSelectedLlm(userId: string, prompt: string, systemPrompt?: string): Promise<string> {
  const config = getLlmConfig(userId);
  const active = config.active_llm;

  if (active === 'openai') {
    if (!config.openai_key) throw new Error('NO_OPENAI_KEY');
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: config.openai_key });
    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: prompt },
      ],
    });
    return res.choices[0]?.message?.content || '';
  }

  if (active === 'groq') {
    if (!config.groq_key) throw new Error('NO_GROQ_KEY');
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({
      apiKey: config.groq_key,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    const res = await client.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user' as const, content: prompt },
      ],
    });
    return res.choices[0]?.message?.content || '';
  }

  if (active === 'gemini') {
    if (!config.gemini_key) throw new Error('NO_GEMINI_KEY');
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.gemini_key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(
      systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
    );
    return result.response.text();
  }

  // Default: Claude
  if (!config.anthropic_key) throw new Error('NO_CLAUDE_KEY');
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: config.anthropic_key });
  const msg = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt || 'You are an expert resume writer and career coach.',
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content[0].type === 'text' ? msg.content[0].text : '';
}

export async function callClaude(prompt: string, systemPrompt?: string, userId = 'demo-001'): Promise<string> {
  const config = getLlmConfig(userId);
  const key = config.anthropic_key || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('NO_CLAUDE_KEY');
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: key });
  const msg = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt || 'You are an expert resume writer and career coach.',
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content[0].type === 'text' ? msg.content[0].text : '';
}

export async function callOpenAI(messages: { role: string; content: string }[], stream = false, userId = 'demo-001') {
  const config = getLlmConfig(userId);
  const key = config.openai_key || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('NO_OPENAI_KEY');
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: key });
  return client.chat.completions.create({
    model: 'gpt-4o',
    messages: messages as Parameters<typeof client.chat.completions.create>[0]['messages'],
    stream,
  });
}

export async function callGemini(prompt: string, userId = 'demo-001'): Promise<string> {
  const config = getLlmConfig(userId);
  const key = config.gemini_key || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('NO_GEMINI_KEY');
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export { IS_MOCK };
