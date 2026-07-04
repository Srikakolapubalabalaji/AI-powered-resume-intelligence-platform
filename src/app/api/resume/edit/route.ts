import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { runDeterministicAts, scoreToStatus } from '@/lib/ats-scorer';

export async function POST(req: NextRequest) {
  try {
    const { resume_id, resume_data, job_description } = await req.json();
    const userId = req.headers.get('x-user-id') || 'demo-001';

    if (!resume_id || !resume_data) {
      return NextResponse.json({ success: false, error: 'Resume ID and edited data are required' }, { status: 400 });
    }

    const resume = mockDb.getResume(resume_id);
    if (!resume || resume.user_id !== userId) {
      return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
    }

    // 1. Create a version snapshot record in versions history
    const versionRecord = mockDb.createResumeVersion(resume_id, resume_data);

    // Get the job description (either passed or resolved from latest score history)
    let jobDescription = job_description || '';
    if (!jobDescription) {
      const scores = mockDb.getAtsScoresByResume(resume_id);
      if (scores && scores.length > 0) {
        jobDescription = scores[0].job_description || '';
      }
    }

    // 2. Recalculate ATS score for the updated data
    const atsResult = runDeterministicAts(resume_data, jobDescription);
    const newScore = atsResult.score;
    const newStatus = scoreToStatus(newScore);

    // 3. Update the main resume table entry with new score & status
    mockDb.updateResume(resume_id, {
      parsed_data: resume_data,
      ats_score: newScore,
      status: newStatus as any,
    });

    // 4. Save a new ATS score record so history remains in sync
    mockDb.createAtsScore({
      resume_id,
      user_id: userId,
      job_description: jobDescription,
      score: newScore,
      breakdown: {
        keyword_match: atsResult.breakdown.keyword_match,
        skills_match: atsResult.breakdown.skills_match,
        experience_relevance: atsResult.breakdown.experience_relevance,
        content_quality: atsResult.breakdown.content_quality,
        resume_structure: atsResult.breakdown.resume_structure,
        readability: atsResult.breakdown.readability,
        profile_completeness: atsResult.breakdown.profile_completeness,
        label: atsResult.label,
        compatibility: newScore >= 55 ? 'ATS Compatible' : 'Needs Improvement',
      },
      matched_keywords: atsResult.matched_keywords,
      missing_keywords: atsResult.missing_keywords,
      suggestions: atsResult.suggestions,
    });

    mockDb.addActivity({
      user_id: userId,
      action_type: 'optimize', // mapped to standard activity types
      description: `Resume edited — Recalculated ATS Score: ${newScore}/100. Created Version ${versionRecord.version} for "${resume.filename}"`,
    });

    return NextResponse.json({
      success: true,
      data: {
        version: versionRecord.version,
        id: versionRecord.id,
        score: newScore,
        status: newStatus,
      },
    });

  } catch (error: any) {
    console.error('[Edit Resume Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to save resume edits.' }, { status: 500 });
  }
}

