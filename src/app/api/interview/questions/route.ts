// ============================================================
//  POST /api/interview/questions
//  Body: { role: string, category: string }
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { mockInterviewQuestions, mockDelay, IS_MOCK } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { role = 'Software Engineer', category = 'Behavioral' } = await req.json();
    const userId = req.headers.get('x-user-id') || 'demo-001';

    if (IS_MOCK) {
      await mockDelay('medium');
    } else {
      // Live: generate with Claude
    }

    const questions = mockInterviewQuestions(role, category);

    // Create session
    const session = mockDb.createInterview({
      user_id: userId,
      role,
      category,
      questions: questions as Parameters<typeof mockDb.createInterview>[0]['questions'],
      answers: [],
    });

    return NextResponse.json({ success: true, data: { session_id: session.id, questions, role, category } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to generate questions' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') || 'demo-001';
  const sessions = mockDb.getInterviews(userId);
  return NextResponse.json({ success: true, data: sessions });
}
