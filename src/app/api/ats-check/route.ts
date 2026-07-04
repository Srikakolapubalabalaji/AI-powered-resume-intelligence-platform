// ============================================================
//  POST /api/ats-check
//  Body: { resume_text: string, job_description?: string, resume_id?: string }
//  OR:   { parsed_resume: ParsedResume, job_description?: string, resume_id?: string }
//  
//  Layer 1: Deterministic scorer (always runs, always first)
//  Layer 2: Claude qualitative analysis (live mode only)
//  Returns combined ATS report. If Layer 2 fails, Layer 1 result
//  is returned with qualitative_available: false — never faked.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { IS_MOCK } from '@/lib/ai';
import { parseResumeText } from '@/lib/resume-parser';
import { runDeterministicAts, scoreToStatus } from '@/lib/ats-scorer';
import type { ParsedResume, Resume, AtsSuggestion } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resume_text, parsed_resume, job_description, resume_id } = body;
    const userId = req.headers.get('x-user-id') || 'demo-001';

    // ── Resolve parsed resume ──
    let parsed: ParsedResume | null = parsed_resume ?? null;
    let resumeRecord: Resume | null = null;
    let resolvedResumeId = resume_id;

    if (!resolvedResumeId) {
      const existingResumes = mockDb.getResumes(userId);
      if (existingResumes.length > 0) {
        resolvedResumeId = existingResumes[0].id;
        resumeRecord = existingResumes[0];
        if (!parsed && resumeRecord.parsed_data) {
          parsed = resumeRecord.parsed_data;
        }
      }
    } else {
      resumeRecord = mockDb.getResume(resolvedResumeId);
      if (resumeRecord) {
        if (resumeRecord.parsed_data) {
          parsed = resumeRecord.parsed_data;
        } else {
          return NextResponse.json(
            { success: false, error: 'The selected resume does not contain parsed data. Please try re-uploading.' },
            { status: 422 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: `Resume with ID "${resolvedResumeId}" was not found.` },
          { status: 404 }
        );
      }
    }

    if (!parsed && resume_text) {
      const parseResult = parseResumeText(resume_text);
      if (!parseResult.success || !parseResult.parsed) {
        return NextResponse.json(
          { success: false, error: parseResult.error || 'Could not parse the resume text for ATS analysis.' },
          { status: 422 }
        );
      }
      parsed = parseResult.parsed;
    }

    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'Resume data is missing. Either parsed_resume, resume_text, or a valid resume_id is required.' },
        { status: 400 }
      );
    }

    // ── Cache Lookup for ATS Score Consistency ──
    if (resolvedResumeId && resumeRecord) {
      const normalizedJd = (job_description || '').trim();
      const existingScores = mockDb.getAtsScoresByResume(resolvedResumeId);
      
      const cachedScore = existingScores.find(s => {
        const sJd = (s.job_description || '').trim();
        const scoreTime = new Date(s.created_at).getTime();
        const resumeUpdateTime = new Date(resumeRecord!.updated_at).getTime();
        return sJd === normalizedJd && scoreTime >= resumeUpdateTime;
      });

      if (cachedScore) {
        return NextResponse.json({
          success: true,
          data: {
            id: cachedScore.id,
            score: cachedScore.score,
            label: cachedScore.breakdown.label,
            breakdown: cachedScore.breakdown,
            matched_keywords: cachedScore.matched_keywords,
            missing_keywords: cachedScore.missing_keywords,
            suggestions: cachedScore.suggestions,
            // Layer 2 qualitative fields
            qualitative_available: !!cachedScore.strengths?.length,
            strengths: cachedScore.strengths || [],
            weaknesses: cachedScore.weaknesses || [],
            industry_relevance: cachedScore.industry_relevance || '',
            reproducible: true,
          },
        });
      }
    }

    // ── Layer 1: Deterministic scorer ──
    const layer1 = runDeterministicAts(parsed, job_description);

    // ── Layer 2: Claude qualitative (live mode only) ──
    let strengths: string[] = [];
    let weaknesses: string[] = [];
    let industryRelevance = '';
    let qualitativeSuggestions: string[] = [];
    let qualitative_available = false;
    let qualitative_error: string | undefined;

    const { isUserMock, callSelectedLlm } = await import('@/lib/ai');
    if (!isUserMock(userId)) {
      try {
        const claudePrompt = `You are a senior ATS and career consultant. Analyze this resume${job_description ? ' against the job description' : ''} and return ONLY a JSON object with these fields:

{
  "strengths": string[],       // 3–5 genuine resume strengths
  "weaknesses": string[],      // 3–5 specific areas to improve
  "industry_relevance": string, // 1–2 sentences on industry fit
  "suggestions": string[]      // 3–5 actionable, specific improvements
}

${job_description ? `Job Description:\n${job_description}\n\n` : ''}Resume Data:
${JSON.stringify(parsed, null, 2)}

Layer 1 ATS score: ${layer1.score}/100
Missing keywords identified: ${layer1.missing_keywords.join(', ')}

Return ONLY valid JSON. Do not include markdown. Do not fabricate information not present in the resume.`;

        const claudeRaw = await callSelectedLlm(userId, claudePrompt);
        const jsonText = claudeRaw.substring(claudeRaw.indexOf('{'), claudeRaw.lastIndexOf('}') + 1);
        const claudeResult = JSON.parse(jsonText);
        strengths = claudeResult.strengths || [];
        weaknesses = claudeResult.weaknesses || [];
        industryRelevance = claudeResult.industry_relevance || '';
        qualitativeSuggestions = claudeResult.suggestions || [];
        qualitative_available = true;
      } catch (claudeErr: any) {
        console.error('[ATS Check] Qualitative Layer 2 failed:', claudeErr);
        if (claudeErr?.message?.includes('NO_') || claudeErr?.message?.includes('key')) {
          qualitative_error = 'AI qualitative analysis is unavailable. Please check your API key in Settings → AI & API Settings.';
        } else {
          qualitative_error = `AI qualitative analysis unavailable: ${claudeErr?.message || 'Error executing request'}`;
        }
      }
    }

    // ── Combine final score (Sole source: Custom ATS Scorer) ──
    const finalScore = layer1.score;

    // Convert qualitative suggestions to structured object type
    const mappedQualitativeSuggestions: AtsSuggestion[] = qualitativeSuggestions.map(qs => ({
      text: qs,
      impact: 'AI Analysis',
      section: 'General'
    }));

    const combinedSuggestions = [
      ...layer1.suggestions,
      ...mappedQualitativeSuggestions.filter(qs => !layer1.suggestions.some(ls => ls.text.toLowerCase().includes(qs.text.toLowerCase().slice(0, 20)))),
    ].slice(0, 5); // Strictly Top 5 improvements

    // ── Persist to database ──
    const saved = mockDb.createAtsScore({
      resume_id: resolvedResumeId || '',
      user_id: userId,
      job_description,
      score: finalScore,
      breakdown: {
        keyword_match: layer1.breakdown.keyword_match,
        skills_match: layer1.breakdown.skills_match,
        experience_relevance: layer1.breakdown.experience_relevance,
        content_quality: layer1.breakdown.content_quality,
        resume_structure: layer1.breakdown.resume_structure,
        readability: layer1.breakdown.readability,
        profile_completeness: layer1.breakdown.profile_completeness,
        label: layer1.label,
        compatibility: finalScore >= 55 ? 'ATS Compatible' : 'Needs Improvement',
        explanations: layer1.explanations,
        // Legacy compat fields
        quantified_achievements: layer1.breakdown.quantified_achievements,
        format_score: layer1.breakdown.format_score,
        content_analysis: layer1.breakdown.content_analysis,
        format_check: layer1.breakdown.format_check,
      },
      explanations: layer1.explanations,
      matched_keywords: layer1.matched_keywords,
      missing_keywords: layer1.missing_keywords,
      suggestions: combinedSuggestions,
      strengths,
      weaknesses,
      industry_relevance: industryRelevance,
    });

    // Update resume status if resolvedResumeId resolved
    if (resolvedResumeId) {
      const status = scoreToStatus(finalScore);
      mockDb.updateResume(resolvedResumeId, { ats_score: finalScore, status: status as Resume['status'] });
    }

    mockDb.addActivity({
      user_id: userId,
      action_type: 'ats_check',
      description: `ATS analysis completed — Score: ${finalScore}/100${qualitative_available ? ' (AI-enhanced)' : ''}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: saved.id,
        score: finalScore,
        label: layer1.label,
        breakdown: saved.breakdown,
        matched_keywords: layer1.matched_keywords,
        missing_keywords: layer1.missing_keywords,
        suggestions: combinedSuggestions,
        // Layer 2 qualitative fields
        qualitative_available,
        strengths,
        weaknesses,
        industry_relevance: industryRelevance,
        qualitative_error,
        reproducible: true,
      },
    });

  } catch (error: any) {
    console.error('[ATS Check Error]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'ATS analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resumeId = searchParams.get('resume_id');
    const userId = req.headers.get('x-user-id') || 'demo-001';

    if (!resumeId) {
      return NextResponse.json({ success: false, error: 'Resume ID is required' }, { status: 400 });
    }

    const history = searchParams.get('history') === 'true';
    const scores = mockDb.getAtsScoresByResume(resumeId);
    if (scores.length === 0) {
      return NextResponse.json({ success: false, data: null, message: 'No ATS score found' });
    }

    if (history) {
      // Return all history (reversed to keep chronological order for graphing)
      return NextResponse.json({ success: true, data: [...scores].reverse() });
    } else {
      return NextResponse.json({ success: true, data: scores[0] });
    }
  } catch (error) {
    console.error('[ATS Check Fetch Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch ATS report' }, { status: 500 });
  }
}
