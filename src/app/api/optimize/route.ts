// ============================================================
//  POST /api/optimize
//  Body: { resume_text?, resume_id?, job_description? }
//  Accepts raw resume_text directly (from ai-chat) or resume_id
//  Returns: { optimized: ResumeData, changes: string[] }
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { mockOptimizeResume, mockDelay, isUserMock, callSelectedLlm } from '@/lib/ai';
import { parseResumeText } from '@/lib/resume-parser';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resume_id, resume_text, job_description } = body;
    const userId = req.headers.get('x-user-id') || 'demo-001';

    // ── If we have raw resume_text (from AI Chat page) ──
    if (resume_text) {
      if (isUserMock(userId)) {
        await mockDelay('slow');
        const parsedResult = parseResumeText(resume_text);
        if (!parsedResult.success || !parsedResult.parsed) {
          return NextResponse.json({ success: false, error: parsedResult.error || 'Parsing failed.' }, { status: 422 });
        }
        const parsed = parsedResult.parsed;
        const result = mockOptimizeResume(parsed, job_description || '');
        mockDb.addActivity({ user_id: userId, action_type: 'optimize', description: 'Resume optimized via AI Chat' });
        return NextResponse.json({ success: true, data: result });
      }

      // Live mode: use active LLM to parse + optimize in one step
      try {
        const prompt = `You are an expert resume optimizer. Given the raw resume text below, extract and optimize it.

RULES:
- Preserve all real facts (companies, dates, education) — DO NOT fabricate anything.
- Strengthen bullet points with action verbs and quantified impact (%, $, numbers) in the experience section to increase the ATS score.
- Add relevant industry keywords.
- Improve the professional summary.
- Only add real technical skills and keywords from the job description. Do NOT add generic descriptors like "fast", "growing", "overview", "key", or "clean" as skills or keywords.

Resume text:
${resume_text.slice(0, 8000)}

${job_description ? `Target job: ${job_description}` : ''}

Return ONLY valid JSON (no markdown): {
  "optimized": { name, title, email, phone, location, linkedin, github, summary, experience: [{title, company, dates, bullets:[]}], education: [{degree, institution, dates}], skills: [] },
  "changes": ["change 1", "change 2", ...]
}`;

        const raw = await callSelectedLlm(userId, prompt);
        const jsonText = raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
        const result = JSON.parse(jsonText);
        
        mockDb.addActivity({ user_id: userId, action_type: 'optimize', description: 'Resume optimized via AI Chat' });
        return NextResponse.json({ success: true, data: result });
      } catch (err: any) {
        console.error('[Optimize Error]', err);
        const errType = err?.message?.includes('NO_') ? 'NO_API_KEY' : 'API_FAILED';
        return NextResponse.json({ success: false, error: err?.message || 'Optimization failed.', error_type: errType }, { status: errType === 'NO_API_KEY' ? 400 : 500 });
      }
    }

    // ── Existing flow: optimize by resume_id ──
    const resume = resume_id ? mockDb.getResume(resume_id) : mockDb.getResumes(userId)[0];
    if (!resume?.parsed_data) {
      return NextResponse.json({ success: false, error: 'Resume not found or not parsed yet' }, { status: 404 });
    }

    let result;
    if (isUserMock(userId)) {
      await mockDelay('slow');
      result = mockOptimizeResume(resume.parsed_data, job_description || '');
      mockDb.updateResume(resume.id, { status: 'Optimized' });
    } else {
      // Live: selected LLM optimization by resume_id
      try {
        const prompt = `You are an expert resume optimizer. Improve this resume.

IMPORTANT RULES:
- DO NOT invent fake companies, degrees, or experience.
- Only rewrite and strengthen existing content.
- Add relevant keywords from the job description where appropriate.
- Use powerful action verbs and quantifiable metrics (%, $, numbers) in the experience section to increase the ATS score.
- Ensure all original layout, name, and contact details are preserved.
- Only add real technical skills and keywords from the job description. Do NOT add generic descriptors like "fast", "growing", "overview", "key", or "clean" as skills or keywords.
- Retain all existing valid skills and qualifications. Do not delete them.

Original Resume:
${JSON.stringify(resume.parsed_data, null, 2)}

${job_description ? `Job Description: ${job_description}` : 'Target: Senior Software Engineer role'}

Return ONLY valid JSON: { "optimized": <full resume JSON>, "changes": string[] }`;

        const raw = await callSelectedLlm(userId, prompt);
        const jsonText = raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
        result = JSON.parse(jsonText);
        mockDb.updateResume(resume.id, { status: 'Optimized' });
      } catch (err: any) {
        console.error('[Optimize Error]', err);
        const errType = err?.message?.includes('NO_') ? 'NO_API_KEY' : 'API_FAILED';
        return NextResponse.json({ success: false, error: err?.message || 'Optimization failed.', error_type: errType }, { status: errType === 'NO_API_KEY' ? 400 : 500 });
      }
    }

    // Also run ATS Layer 1 scorer on the optimized version to save its ATS report
    const { runDeterministicAts, scoreToStatus } = await import('@/lib/ats-scorer');
    const atsLayer1 = runDeterministicAts(result.optimized, job_description);
    const status = scoreToStatus(atsLayer1.score);

    // Save optimized content back to the existing resume (in-place update)
    mockDb.updateResume(resume.id, {
      parsed_data: result.optimized,
      ats_score: atsLayer1.score,
      status: status as any,
    });

    mockDb.createAtsScore({
      resume_id: resume.id,
      user_id: userId,
      job_description,
      score: atsLayer1.score,
      breakdown: {
        keyword_match: atsLayer1.breakdown.keyword_match,
        skills_match: atsLayer1.breakdown.skills_match,
        experience_relevance: atsLayer1.breakdown.experience_relevance,
        content_quality: atsLayer1.breakdown.content_quality,
        resume_structure: atsLayer1.breakdown.resume_structure,
        readability: atsLayer1.breakdown.readability,
        profile_completeness: atsLayer1.breakdown.profile_completeness,
        label: atsLayer1.label,
        compatibility: atsLayer1.score >= 55 ? 'ATS Compatible' : 'Needs Improvement',
        // Legacy compat fields
        quantified_achievements: atsLayer1.breakdown.quantified_achievements,
        format_score: atsLayer1.breakdown.format_score,
        content_analysis: atsLayer1.breakdown.content_analysis,
        format_check: atsLayer1.breakdown.format_check,
      },
      matched_keywords: atsLayer1.matched_keywords,
      missing_keywords: atsLayer1.missing_keywords,
      suggestions: atsLayer1.suggestions,
    });

    mockDb.addActivity({ user_id: userId, action_type: 'optimize', description: `Resume optimized in-place — ATS Score updated to ${atsLayer1.score}` });

    return NextResponse.json({
      success: true,
      data: {
        optimized: result.optimized,
        changes: result.changes,
        originalId: resume.id,
        optimizedId: resume.id,
      }
    });

  } catch (error) {
    console.error('[Optimize Error]', error);
    return NextResponse.json({ success: false, error: 'Optimization failed. Please try again.' }, { status: 500 });
  }
}
