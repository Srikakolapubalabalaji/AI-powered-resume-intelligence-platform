// ============================================================
//  GET  /api/resumes        — list all resumes for user
//  POST /api/resumes        — create resume entry
//  DELETE /api/resumes      — delete resume by id
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-001';
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const resume = mockDb.getResume(id);
      if (!resume || resume.user_id !== userId) {
        return NextResponse.json({ success: false, error: 'Resume not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: resume });
    }
    const resumes = mockDb.getResumes(userId);
    return NextResponse.json({ success: true, data: resumes });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch resumes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-001';
    const body = await req.json();
    const resume = mockDb.createResume({ ...body, user_id: userId });
    mockDb.addActivity({ user_id: userId, action_type: 'resume_upload', description: `Resume created — ${body.filename || 'New Resume'}` });
    return NextResponse.json({ success: true, data: resume });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create resume' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    mockDb.deleteResume(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete resume' }, { status: 500 });
  }
}
