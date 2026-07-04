import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { isUserMock, callSelectedLlm, mockDelay } from '@/lib/ai';
import { parseResumeText } from '@/lib/resume-parser';
import type { ParsedResume } from '@/lib/types';

function generateMockJd(resume: ParsedResume): string {
  const title = resume.title || 'Software Engineer';
  const skills = resume.skills || ['React', 'TypeScript', 'Node.js'];
  
  return `# Job Description: Senior ${title}

## Company Overview
Join a fast-growing technology company dedicated to building next-generation web applications and scaling infrastructure. We value innovation, craftsmanship, and a focus on user experience.

## Role Summary
We are seeking a talented Senior ${title} who is passionate about technology, design, and building high-performance systems. You will play a key role in designing, implementing, and optimizing our product features and development pipelines.

## Key Responsibilities
- Architect and develop clean, performant, and maintainable application code.
- Collaborate with product designers and engineering leadership to define product requirements.
- Optimize systems for maximum speed, security, and scalability.
- Mentor junior engineers and champion clean code and architecture practices.

## Required Skills & Qualifications
- Extensive experience working as a ${title} or similar engineering role.
- Proficient in: ${skills.slice(0, 6).join(', ')}.
- Strong experience with modern cloud environments (AWS, GCP, or Azure), containerization (Docker, Kubernetes), and CI/CD practices.
- Excellent communication and collaboration skills.
`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resume_id, resume_text } = body;
    const userId = req.headers.get('x-user-id') || 'demo-001';

    let parsed: ParsedResume | null = null;

    if (resume_id) {
      const resumeRecord = mockDb.getResume(resume_id);
      if (resumeRecord?.parsed_data) {
        parsed = resumeRecord.parsed_data;
      }
    }

    if (!parsed && resume_text) {
      const parseResult = parseResumeText(resume_text);
      if (parseResult.success && parseResult.parsed) {
        parsed = parseResult.parsed;
      }
    }

    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'No resume data available to generate job description.' },
        { status: 400 }
      );
    }

    if (isUserMock(userId)) {
      await mockDelay('slow');
      const jdText = generateMockJd(parsed);
      return NextResponse.json({ success: true, data: { jd: jdText } });
    }

    // Live mode: query active LLM
    try {
      const prompt = `You are a senior technical recruiter. Based on the candidate's resume below, generate a matching, realistic Job Description (in markdown format) for a role this candidate is qualified for. It should include:
- A title (e.g. Senior Software Engineer, DevOps Architect, etc.)
- About the Company (1 paragraph)
- Role Summary (1 paragraph)
- Key Responsibilities (4-6 bullet points)
- Required Skills & Qualifications (4-6 bullet points)

Resume Details:
${JSON.stringify(parsed, null, 2)}

Return ONLY the markdown content. Do not include markdown code fence formatting (like \`\`\`markdown) around the entire output. Just output the clean markdown.`;

      const jdText = await callSelectedLlm(userId, prompt);
      return NextResponse.json({ success: true, data: { jd: jdText } });
    } catch (llmErr: any) {
      console.error('[Generate JD LLM Error]', llmErr);
      const errType = llmErr?.message?.includes('NO_') ? 'NO_API_KEY' : 'API_FAILED';
      return NextResponse.json(
        { success: false, error: llmErr?.message || 'Failed to generate JD via LLM.', error_type: errType },
        { status: errType === 'NO_API_KEY' ? 400 : 500 }
      );
    }

  } catch (err: any) {
    console.error('[Generate JD Route Error]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error while generating job description.' },
      { status: 500 }
    );
  }
}
