import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resumeId = searchParams.get('resume_id');

    if (!resumeId) {
      return NextResponse.json({ success: false, error: 'Resume ID is required' }, { status: 400 });
    }

    const versions = mockDb.getResumeVersions(resumeId);
    return NextResponse.json({ success: true, data: versions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Failed to fetch resume versions.' }, { status: 500 });
  }
}
