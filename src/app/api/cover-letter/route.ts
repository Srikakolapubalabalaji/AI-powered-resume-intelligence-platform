// ============================================================
//  POST /api/cover-letter
//  Body: { job_title, company, tone, length, resume_id, include_options }
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { mockCoverLetter, mockDelay, IS_MOCK } from '@/lib/ai';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id') || 'demo-001';
  const letters = mockDb.getCoverLetters(userId);
  return NextResponse.json({ success: true, data: letters });
}

export async function POST(req: NextRequest) {
  try {
    const { job_title, company, tone = 'Professional', length = 'Standard', resume_id, include_options, job_description } = await req.json();
    const userId = req.headers.get('x-user-id') || 'demo-001';

    if (!job_title || !company) {
      return NextResponse.json({ success: false, error: 'job_title and company are required' }, { status: 400 });
    }

    // Get resume data
    const resume = resume_id ? mockDb.getResume(resume_id) : mockDb.getResumes(userId)[0];
    const resumeName = resume?.parsed_data?.name || '[Your Name]';
    const resumeTitle = resume?.parsed_data?.title || '';

    let content: string;

    if (IS_MOCK) {
      await mockDelay('medium');
      content = mockCoverLetter({ jobTitle: job_title, company, tone, resumeName, resumeTitle, jobDescription: job_description });
    } else {
      const { callClaude } = await import('@/lib/ai');
      const resumeSummary = resume?.parsed_data ? JSON.stringify(resume.parsed_data, null, 2) : '';
      const lengthInstruction = length === 'Brief' ? 'Keep it to 2 short paragraphs.' : length === 'Detailed' ? 'Write 4-5 detailed paragraphs with specific examples.' : 'Write 3 professional paragraphs.';
      
      const prompt = `Write a ${tone.toLowerCase()} cover letter for ${resumeName} applying to ${job_title} at ${company}.
      
Resume Data:
${resumeSummary}

${job_description ? `Target Job Description:\n${job_description}\n` : ''}

Instructions:
- Tone: ${tone}
- Length: ${lengthInstruction}
- ${include_options?.salary ? 'Include salary expectations if appropriate.' : ''}
- ${include_options?.availability ? 'Mention availability to start.' : ''}
- Do NOT invent fake companies, degrees, or experience not in the resume.
- Highlight matching skills, experience, achievements, and keywords from the Job Description.
- Make it personal, specific, and compelling. Ensure the letter is ATS-friendly, professional, and tailored to the target role.

Return only the cover letter text, no meta commentary.`;

      content = await callClaude(prompt);
    }

    // Save to DB
    const saved = mockDb.createCoverLetter({
      user_id: userId,
      resume_id: resume_id || resume?.id,
      job_title,
      company,
      tone,
      content,
      template: 'Modern',
    });

    mockDb.addActivity({
      user_id: userId,
      action_type: 'cover_letter',
      description: `Cover letter generated — ${job_title} at ${company}`,
    });

    return NextResponse.json({ success: true, data: { ...saved, content } });
  } catch (error) {
    console.error('[Cover Letter Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to generate cover letter. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  mockDb.deleteCoverLetter(id);
  return NextResponse.json({ success: true });
}
