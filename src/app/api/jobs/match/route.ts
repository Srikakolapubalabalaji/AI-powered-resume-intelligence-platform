// ============================================================
//  POST /api/jobs/match
//  Body: { jobs: JobData[], resume_id?: string }
//  Returns each job scored against the user's resume
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { mockDelay, IS_MOCK } from '@/lib/ai';
import { JobData } from '@/lib/types';

function scoreJobAgainstResume(job: JobData, resumeSkills: string[], resumeTitle: string) {
  const matchedSkills = job.skills.filter((s: string) => resumeSkills.some(r => r.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(r.toLowerCase())));
  const skillsMatch = Math.round((matchedSkills.length / Math.max(job.skills.length, 1)) * 100);
  const roleMatch = resumeTitle.toLowerCase().includes('senior') && job.title.toLowerCase().includes('senior') ? 95 : resumeTitle.toLowerCase().split(' ').some((w: string) => job.title.toLowerCase().includes(w)) ? 80 : 60;
  const expMatch = 80 + Math.floor(Math.random() * 15);
  const keywordMatch = 70 + Math.floor(Math.random() * 20);
  const locationMatch = job.experience?.toLowerCase().includes('remote') ? 100 : 85;
  const educationMatch = 80;

  const overall = Math.round((skillsMatch * 0.3 + roleMatch * 0.25 + expMatch * 0.2 + keywordMatch * 0.15 + locationMatch * 0.05 + educationMatch * 0.05));

  return {
    match_score: Math.min(99, Math.max(40, overall)),
    match_breakdown: {
      skills_match: Math.min(100, skillsMatch + 5),
      experience_match: expMatch,
      keyword_match: keywordMatch,
      role_match: roleMatch,
      location_match: locationMatch,
      education_match: educationMatch,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const { jobs, resume_id } = await req.json();
    const userId = req.headers.get('x-user-id') || 'demo-001';

    const resume = resume_id ? mockDb.getResume(resume_id) : mockDb.getResumes(userId)[0];
    const resumeSkills = resume?.parsed_data?.skills || ['React', 'TypeScript', 'Node.js'];
    const resumeTitle = resume?.parsed_data?.title || 'Software Engineer';

    if (IS_MOCK) {
      await mockDelay('medium');
    }

    const scored = (jobs || []).map((job: JobData) => {
      const { match_score, match_breakdown } = scoreJobAgainstResume(job, resumeSkills, resumeTitle);

      // Save to DB
      const saved = mockDb.createJobMatch({
        user_id: userId,
        resume_id: resume?.id,
        job_data: job,
        match_score,
        match_breakdown,
      });

      return { ...job, match_score, match_breakdown, id: saved.id };
    }).sort((a: { match_score: number }, b: { match_score: number }) => b.match_score - a.match_score);

    mockDb.addActivity({ user_id: userId, action_type: 'job_match', description: `Job matching complete — ${scored.length} jobs scored` });

    return NextResponse.json({ success: true, data: scored });
  } catch (error) {
    console.error('[Jobs Match Error]', error);
    return NextResponse.json({ success: false, error: 'Job matching failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') || 'demo-001';
  const matches = mockDb.getJobMatches(userId);
  return NextResponse.json({ success: true, data: matches });
}
