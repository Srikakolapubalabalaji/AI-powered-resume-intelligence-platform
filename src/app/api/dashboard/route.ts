import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-001';
    const stats = mockDb.getDashboardStats(userId);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
