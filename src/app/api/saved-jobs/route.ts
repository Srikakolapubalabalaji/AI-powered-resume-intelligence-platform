// ============================================================
//  GET /api/saved-jobs        — list saved jobs
//  POST /api/saved-jobs       — save a job
//  DELETE /api/saved-jobs     — remove saved job
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') || 'demo-001';
  const jobs = mockDb.getSavedJobs(userId);
  return NextResponse.json({ success: true, data: jobs });
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-001';
    const body = await req.json();
    const job = mockDb.saveJob({ ...body, user_id: userId });
    mockDb.addActivity({ user_id: userId, action_type: 'job_match', description: `Job saved — ${body.job_title} at ${body.company}` });
    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save job' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    mockDb.deleteSavedJob(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete saved job' }, { status: 500 });
  }
}
