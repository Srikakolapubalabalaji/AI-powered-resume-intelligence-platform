// ============================================================
//  GET  /api/history  — combined history from all tables
//  DELETE /api/history — delete a history item
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-001';
    const history = mockDb.getHistory(userId);
    return NextResponse.json({ success: true, data: history, total: history.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, type } = await req.json();
    // In mock mode, we can only delete specific types
    if (type === 'Resume') mockDb.deleteResume(id);
    else if (type === 'Cover Letter') mockDb.deleteCoverLetter(id);
    else if (type === 'Saved Job') mockDb.deleteSavedJob(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}
