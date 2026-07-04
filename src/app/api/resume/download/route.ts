import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { mockDb } from '@/lib/mock-db';

export async function POST(req: NextRequest) {
  try {
    const { resume_id, resume_data, format } = await req.json();
    const userId = req.headers.get('x-user-id') || 'demo-001';

    let parsed = resume_data;
    let filename = 'resume';

    if (resume_id) {
      const record = mockDb.getResume(resume_id);
      if (record) {
        parsed = record.parsed_data;
        filename = record.filename;
      }
    }

    if (!parsed) {
      return NextResponse.json({ success: false, error: 'No resume data provided' }, { status: 400 });
    }

    // Dynamic filename: CandidateName_Resume_Optimized.docx
    const candidateName = parsed.name ? parsed.name.replace(/\s+/g, '_') : 'Candidate';
    const isOptimized = filename.toLowerCase().includes('optimized') || resume_id?.toString().includes('optimized');
    const suffix = isOptimized ? '_Optimized' : '';
    const finalFilename = `${candidateName}_Resume${suffix}.${format}`;

    if (format === 'docx') {
      const children: any[] = [];

      // Name
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: parsed.name || 'Your Name',
              bold: true,
              size: 32, // 16pt
              font: 'Calibri',
            }),
          ],
        })
      );

      // Title
      if (parsed.title) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: parsed.title,
                italics: true,
                size: 24, // 12pt
                font: 'Calibri',
              }),
            ],
          })
        );
      }

      // Contact info
      const contactInfo = [parsed.email, parsed.phone, parsed.location, parsed.linkedin, parsed.github]
        .filter(Boolean)
        .join('  |  ');
      if (contactInfo) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: contactInfo,
                size: 19, // 9.5pt
                font: 'Calibri',
              }),
            ],
          })
        );
      }

      // Divider line helper
      const addHeading = (text: string) => {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
            keepNext: true,
            children: [
              new TextRun({
                text: text.toUpperCase(),
                bold: true,
                size: 20, // 10pt
                color: '6C5CE7',
                font: 'Calibri',
              }),
            ],
          })
        );
      };

      // Summary Section
      if (parsed.summary) {
        addHeading('Summary');
        children.push(
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({
                text: parsed.summary,
                size: 21, // 10.5pt
                font: 'Calibri',
              }),
            ],
          })
        );
      }

      // Experience Section
      if (parsed.experience && parsed.experience.length > 0) {
        addHeading('Experience');
        parsed.experience.forEach((exp: any) => {
          children.push(
            new Paragraph({
              spacing: { before: 120, after: 60 },
              keepNext: true,
              children: [
                new TextRun({
                  text: exp.title || '',
                  bold: true,
                  size: 22,
                  font: 'Calibri',
                }),
                new TextRun({
                  text: exp.company ? `  ·  ${exp.company}` : '',
                  italics: true,
                  size: 21,
                  font: 'Calibri',
                }),
                new TextRun({
                  text: exp.dates ? `  (${exp.dates})` : '',
                  size: 19,
                  color: '666666',
                  font: 'Calibri',
                }),
              ],
            })
          );

          if (exp.bullets && exp.bullets.length > 0) {
            exp.bullets.forEach((b: string) => {
              children.push(
                new Paragraph({
                  bullet: { level: 0 },
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: b,
                      size: 21,
                      font: 'Calibri',
                    }),
                  ],
                })
              );
            });
          }
        });
      }

      // Education Section
      if (parsed.education && parsed.education.length > 0) {
        addHeading('Education');
        parsed.education.forEach((edu: any) => {
          children.push(
            new Paragraph({
              spacing: { before: 120, after: 60 },
              children: [
                new TextRun({
                  text: edu.degree || '',
                  bold: true,
                  size: 22,
                  font: 'Calibri',
                }),
                new TextRun({
                  text: edu.institution ? `  ·  ${edu.institution}` : '',
                  italics: true,
                  size: 21,
                  font: 'Calibri',
                }),
                new TextRun({
                  text: edu.dates ? `  (${edu.dates})` : '',
                  size: 19,
                  color: '666666',
                  font: 'Calibri',
                }),
              ],
            })
          );
        });
      }

      // Skills Section
      if (parsed.skills && parsed.skills.length > 0) {
        addHeading('Skills');
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: parsed.skills.join(', '),
                size: 21,
                font: 'Calibri',
              }),
            ],
          })
        );
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children,
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      
      mockDb.addActivity({
        user_id: userId,
        action_type: 'download',
        description: `Downloaded resume "${finalFilename}" in DOCX format`,
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${finalFilename}"`,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported format' }, { status: 400 });

  } catch (error: any) {
    console.error('[Download Error]', error);
    return NextResponse.json({ success: false, error: 'Download generation failed' }, { status: 500 });
  }
}
