// ============================================================
//  POST /api/interview/feedback
//  Body: { session_id, question_id, question_text, answer }
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { mockInterviewFeedback, mockDelay, IS_MOCK } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { session_id, question_id, question_text, answer } = await req.json();
    const userId = req.headers.get('x-user-id') || 'demo-001';

    if (!answer || answer.trim().length < 5) {
      return NextResponse.json({ success: false, error: 'Answer is too short' }, { status: 400 });
    }

    if (IS_MOCK) {
      await mockDelay('medium');
    }

    const feedback = mockInterviewFeedback(question_text, answer);

    // Update session with answer
    const session = mockDb.getInterviews(userId).find(s => s.id === session_id);
    if (session) {
      const newAnswer = {
        question_id,
        answer,
        score: feedback.score,
        feedback: feedback.feedback,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
      };
      mockDb.updateInterview(session_id, {
        answers: [...session.answers, newAnswer],
      });
    }

    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    console.error('[Interview Feedback Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to generate feedback' }, { status: 500 });
  }
}
