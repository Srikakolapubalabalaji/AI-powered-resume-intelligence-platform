import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { callSelectedLlm, getLlmConfig } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      resume_id?: string;
      job_title: string;
      company: string;
      description?: string;
      skills?: string[];
      experience?: string;
      location?: string;
      match_score?: number;
      matched_skills?: string[];
      missing_skills?: string[];
    };

    const userId = req.headers.get('x-user-id') || 'demo-001';
    const config = getLlmConfig(userId);
    const hasLlm = !!(
      config.anthropic_key || config.openai_key || config.gemini_key || config.groq_key ||
      process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY ||
      process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY
    );

    // Fetch resume context
    const resume = body.resume_id ? mockDb.getResume(body.resume_id) : null;
    const resumeText = resume?.parsed_data
      ? [
          resume.parsed_data.title || '',
          resume.parsed_data.summary || '',
          ...(resume.parsed_data.skills ?? []),
          ...(resume.parsed_data.experience?.flatMap((e: { title?: string; company?: string; bullets?: string[] }) =>
            [e.title, e.company, ...(e.bullets ?? [])]) ?? []),
        ].join(' ')
      : '';

    const resumeTitle = resume?.parsed_data?.title || 'Professional';
    const resumeSkills = resume?.parsed_data?.skills ?? [];

    // ── Deterministic analysis (always available) ─────────────────
    const matchedSkills = body.matched_skills || [];
    const missingSkills = body.missing_skills || [];
    const score = body.match_score || 0;

    // Extract skills from description if not provided
    const TECH_PATTERN = /\b(React|Vue|Angular|TypeScript|JavaScript|Python|Java|Go|Golang|Node\.js|Next\.js|AWS|GCP|Azure|Docker|Kubernetes|Terraform|PostgreSQL|MySQL|MongoDB|Redis|GraphQL|REST|CI\/CD|Git|Linux|Agile|Scrum|Spring|Django|Flutter|Kotlin|Swift|Kafka|Elasticsearch|Spark|Scala|Ruby|PHP|Laravel|C\+\+|C#|\.NET|Generative AI|LLM|LangChain|OpenAI|GPT|Gemini|NLP|Pandas|NumPy|TensorFlow|PyTorch|Scikit|XGBoost|Tableau|Figma|Selenium|Cypress|Playwright|Jira|HTML|CSS|SASS|Tailwind|Webpack|Vite|Redux)\b/gi;
    const descSkills = body.description
      ? [...new Set((body.description.match(TECH_PATTERN) || []).map(s => s.trim()))]
      : [];
    const allJobSkills = [...new Set([...(body.skills || []), ...descSkills])];

    // Skill gap analysis
    const resumeSkillsLower = new Set(resumeSkills.map((s: string) => s.toLowerCase()));
    const skillGapAnalysis = allJobSkills.map(skill => ({
      skill,
      have: resumeSkillsLower.has(skill.toLowerCase()) || matchedSkills.some(m => m.toLowerCase() === skill.toLowerCase()),
    }));

    // Application strength assessment
    const strength =
      score >= 85 ? { label: 'Excellent Match', color: '#00b894', description: 'Your profile is an outstanding fit. Apply with confidence.' } :
      score >= 70 ? { label: 'Strong Match', color: '#6C5CE7', description: 'You meet most requirements. Highlight your matched skills upfront.' } :
      score >= 55 ? { label: 'Good Match', color: '#f0a500', description: 'Solid fit with some gaps. Address missing skills in your cover letter.' } :
                    { label: 'Partial Match', color: '#e17055', description: 'Consider upskilling before applying, or target similar roles.' };

    // ── AI Analysis (if LLM key is available) ────────────────────
    let aiInsights: {
      summary: string;
      why_apply: string[];
      skill_tips: string[];
      application_strategy: string;
      red_flags: string[];
      salary_insight: string;
    } | null = null;

    if (hasLlm && body.description && body.description.length > 100) {
      try {
        const prompt = `You are an expert career coach analyzing a job match. Analyze this job for a candidate and provide concise, actionable insights.

CANDIDATE PROFILE:
- Title: ${resumeTitle}
- Key Skills: ${resumeSkills.slice(0, 15).join(', ')}
- Match Score: ${score}%
- Matched Skills: ${matchedSkills.slice(0, 8).join(', ')}
- Missing Skills: ${missingSkills.slice(0, 6).join(', ')}

JOB POSTING:
- Role: ${body.job_title} at ${body.company}
- Location: ${body.location || 'Not specified'}
- Experience Required: ${body.experience || 'Not specified'}
- Description: ${body.description.slice(0, 1500)}

Respond ONLY with valid JSON in this exact format:
{
  "summary": "2-sentence summary of what this role is about and why it could be a good fit or not",
  "why_apply": ["reason 1", "reason 2", "reason 3"],
  "skill_tips": ["specific tip 1 about skills/experience", "specific tip 2", "specific tip 3"],
  "application_strategy": "1-2 sentence specific advice on HOW to apply and what to emphasize",
  "red_flags": ["potential concern 1 if any", "potential concern 2 if any"],
  "salary_insight": "Brief insight about typical salary range for this role and location based on general market knowledge"
}`;

        const raw = await callSelectedLlm(userId, prompt, 'You are an expert career coach. Always respond with valid JSON only, no markdown, no extra text.');
        // Parse JSON — strip any markdown fences
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        aiInsights = JSON.parse(cleaned);
      } catch (err) {
        console.error('[Jobs/Analyze] AI call failed:', err);
        // Fall through — deterministic analysis still returned
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        strength,
        skill_gap: skillGapAnalysis,
        all_job_skills: allJobSkills,
        ai_insights: aiInsights,
        resume_skills: resumeSkills,
        matched_skills: matchedSkills,
        missing_skills: missingSkills,
        score,
      },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
