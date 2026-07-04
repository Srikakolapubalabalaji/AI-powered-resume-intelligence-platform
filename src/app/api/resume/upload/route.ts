// ============================================================
//  POST /api/resume/upload
//  Accepts multipart/form-data with a file field "resume"
//  Parses PDF/DOCX, extracts text, runs deterministic parser.
//  In live mode: also uses Claude for enhanced structuring.
//  NEVER returns hardcoded/sample resume data.
// ============================================================
if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
  (global as any).DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { IS_MOCK } from '@/lib/ai';
import { parseResumeText } from '@/lib/resume-parser';
import { runDeterministicAts, scoreToStatus } from '@/lib/ats-scorer';
import path from 'path';
import { pathToFileURL } from 'url';

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-001';
    const formData = await req.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided. Please upload a PDF or DOCX resume.' }, { status: 400 });
    }

    const filename = file.name;
    const ext = filename.split('.').pop()?.toLowerCase();

    if (!['pdf', 'docx'].includes(ext || '')) {
      return NextResponse.json({ success: false, error: 'Unsupported file type. Please upload a PDF or DOCX file.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File size exceeds 10 MB limit. Please upload a smaller file.' }, { status: 400 });
    }

    // ── Step 1: Extract raw text from file ──
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let rawText = '';

    try {
      if (ext === 'pdf') {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).toString();
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        rawText = result.text || '';
      } else if (ext === 'docx') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value || '';
      }
    } catch (extractErr) {
      console.error('[Resume Upload] Text extraction failed:', extractErr);
      return NextResponse.json({
        success: false,
        error: `Could not extract text from "${filename}". The file may be password-protected, corrupted, or a scanned image. Please try a different file.`,
      }, { status: 422 });
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json({
        success: false,
        error: `"${filename}" appears to be empty or contains no readable text. Scanned image PDFs are not supported. Please use a text-based PDF or DOCX.`,
      }, { status: 422 });
    }

    // ── Step 2: Parse the extracted text ──
    let parsedResult: ReturnType<typeof parseResumeText>;

    if (IS_MOCK) {
      // In mock mode: use deterministic parser only (no Claude call)
      parsedResult = parseResumeText(rawText);
    } else {
      // In live mode: use deterministic parser for structure, then enhance with Claude
      const deterministicResult = parseResumeText(rawText);
      if (!deterministicResult.success) {
        parsedResult = deterministicResult;
      } else {
        try {
          const { callClaude } = await import('@/lib/ai');
          const prompt = `You are an expert resume parser. Extract structured data from the resume text below and return ONLY valid JSON with these exact fields (use null for missing fields):
{
  "name": string,
  "title": string,
  "email": string,
  "phone": string,
  "location": string,
  "linkedin": string | null,
  "github": string | null,
  "summary": string,
  "experience": [{"title": string, "company": string, "dates": string, "bullets": string[]}],
  "education": [{"degree": string, "institution": string, "dates": string}],
  "skills": string[],
  "projects": [{"name": string, "description": string, "technologies": string[], "url": string | null}] | null,
  "certifications": string[] | null
}

DO NOT invent or fabricate any information. Extract only what is present in the text.

Resume text:
${rawText.slice(0, 8000)}

Return ONLY the JSON object, no markdown formatting, no explanation.`;
          const claudeRaw = await callClaude(prompt);
          const claudeParsed = JSON.parse(claudeRaw);
          parsedResult = { success: true, parsed: claudeParsed };
        } catch (claudeErr) {
          console.error('[Resume Upload] Claude parsing failed, falling back to deterministic parser:', claudeErr);
          parsedResult = parseResumeText(rawText); // fallback to deterministic if Claude fails
        }
      }
    }

    if (!parsedResult.success || !parsedResult.parsed) {
      return NextResponse.json({
        success: false,
        error: parsedResult.error || 'Resume parsing failed. The document structure could not be recognized. Please ensure it is a standard resume format.',
      }, { status: 422 });
    }

    const parsed = parsedResult.parsed;

    // ── Step 3: Run deterministic ATS Layer 1 ──
    const atsLayer1 = runDeterministicAts(parsed);
    const status = scoreToStatus(atsLayer1.score);

    // ── Step 4: Persist to database ──
    const existingResumes = mockDb.getResumes(userId);
    let resume;
    if (existingResumes.length > 0) {
      resume = mockDb.updateResume(existingResumes[0].id, {
        filename,
        parsed_data: parsed,
        ats_score: atsLayer1.score,
        status,
      }) || mockDb.createResume({
        user_id: userId,
        filename,
        file_url: '',
        parsed_data: parsed,
        ats_score: atsLayer1.score,
        template: 'Modern Professional',
        status,
      });
    } else {
      resume = mockDb.createResume({
        user_id: userId,
        filename,
        file_url: '',  // would be Supabase Storage URL in live mode
        parsed_data: parsed,
        ats_score: atsLayer1.score,
        template: 'Modern Professional',
        status,
      });
    }

    // Save ATS score tied to this resume
    mockDb.createAtsScore({
      resume_id: resume.id,
      user_id: userId,
      job_description: undefined,
      score: atsLayer1.score,
      breakdown: {
        keyword_match: atsLayer1.breakdown.keyword_match,
        skills_match: atsLayer1.breakdown.skills_match,
        experience_relevance: atsLayer1.breakdown.experience_relevance,
        content_quality: atsLayer1.breakdown.content_quality,
        quantified_achievements: atsLayer1.breakdown.quantified_achievements,
        resume_structure: atsLayer1.breakdown.resume_structure,
        readability: atsLayer1.breakdown.readability,
        profile_completeness: atsLayer1.breakdown.profile_completeness,
        contact_info: atsLayer1.breakdown.contact_info,
        label: atsLayer1.label,
        compatibility: atsLayer1.score >= 55 ? 'ATS Compatible' : 'Needs Improvement',
        explanations: atsLayer1.explanations,
        // Legacy compat fields
        format_score: atsLayer1.breakdown.format_score,
        content_analysis: atsLayer1.breakdown.content_analysis,
        format_check: atsLayer1.breakdown.format_check,
      },
      explanations: atsLayer1.explanations,
      matched_keywords: atsLayer1.matched_keywords,
      missing_keywords: atsLayer1.missing_keywords,
      suggestions: atsLayer1.suggestions,
    });

    mockDb.addActivity({
      user_id: userId,
      action_type: 'resume_upload',
      description: `Resume uploaded: ${parsed.name ? `"${parsed.name}"` : `"${filename}"`} — ATS Score: ${atsLayer1.score}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        resume,
        parsed,
        ats: {
          score: atsLayer1.score,
          label: atsLayer1.label,
          breakdown: {
            ...atsLayer1.breakdown,
            explanations: atsLayer1.explanations,
          },
          matched_keywords: atsLayer1.matched_keywords,
          missing_keywords: atsLayer1.missing_keywords,
          suggestions: atsLayer1.suggestions,
        },
        message: `Resume parsed successfully. ATS Score: ${atsLayer1.score}/100.`,
      },
    });

  } catch (error) {
    console.error('[Resume Upload Error]', error);
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred while processing your resume. Please try again.',
    }, { status: 500 });
  }
}
