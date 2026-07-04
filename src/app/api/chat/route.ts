// ============================================================
//  POST /api/chat   — Multi-LLM Streaming Chat
//  Body: { model: string, messages: ChatMessage[], resume_id?: string, chat_id?: string }
// ============================================================
import { NextRequest } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { isUserMock, getLlmConfig } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const { messages, model = 'claude', resume_id, chat_id } = await req.json();
  const userId = req.headers.get('x-user-id') || 'demo-001';
  const lastMessage = messages[messages.length - 1]?.content || '';

  const encoder = new TextEncoder();

  if (isUserMock(userId)) {
    // MOCK MODE: No fake AI responses. Tell the user to configure a real API key.
    const msg = '⚠️ **AI Chat is not available in simulated mode.**\n\nTo enable real AI coaching, please go to **Settings → AI & API Settings**, select an active LLM provider, enter your key, and set Execution Mode to **Live AI Mode**.\n\nOnce configured, I can:\n- Analyze your uploaded resume\n- Rewrite bullet points and summaries\n- Score your resume against job descriptions\n- Generate tailored cover letters';

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: msg })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  }

  // --- Live mode: Route to selected active LLM provider ---
  const config = getLlmConfig(userId);
  const activeProvider = config.active_llm;
  const systemPrompt = `You are an expert AI resume coach and career advisor. Help users optimize their resumes, prepare for interviews, and find jobs. Be specific, actionable, and data-driven. Format responses with markdown for clarity.`;

  // Check if active key is configured
  let keyErrorMsg = '';
  if (activeProvider === 'claude' && !config.anthropic_key) {
    keyErrorMsg = '⚠️ **Anthropic Claude key is missing.**\n\nPlease add your Anthropic API Key in **Settings → AI & API Settings** to continue.';
  } else if (activeProvider === 'openai' && !config.openai_key) {
    keyErrorMsg = '⚠️ **OpenAI API key is missing.**\n\nPlease add your OpenAI API Key in **Settings → AI & API Settings** to continue.';
  } else if (activeProvider === 'groq' && !config.groq_key) {
    keyErrorMsg = '⚠️ **Groq API key is missing.**\n\nPlease add your Groq API Key in **Settings → AI & API Settings** to continue.';
  } else if (activeProvider === 'gemini' && !config.gemini_key) {
    keyErrorMsg = '⚠️ **Gemini API key is missing.**\n\nPlease add your Gemini API Key in **Settings → AI & API Settings** to continue.';
  }

  if (keyErrorMsg) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: keyErrorMsg })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  }

  let fullResponse = '';
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (activeProvider === 'openai') {
          const { default: OpenAI } = await import('openai');
          const client = new OpenAI({ apiKey: config.openai_key });
          const apiMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...messages.map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          ];
          const streamResult = await client.chat.completions.create({
            model: 'gpt-4o',
            messages: apiMessages,
            stream: true,
          });
          for await (const chunk of streamResult) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              fullResponse += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
            }
          }
        } else if (activeProvider === 'groq') {
          const { default: OpenAI } = await import('openai');
          const client = new OpenAI({
            apiKey: config.groq_key,
            baseURL: 'https://api.groq.com/openai/v1',
          });
          const apiMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...messages.map((m: { role: string; content: string }) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          ];
          const streamResult = await client.chat.completions.create({
            model: 'llama3-70b-8192',
            messages: apiMessages,
            stream: true,
          });
          for await (const chunk of streamResult) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              fullResponse += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
            }
          }
        } else if (activeProvider === 'gemini') {
          const { GoogleGenerativeAI } = await import('@google/generative-ai');
          const genAI = new GoogleGenerativeAI(config.gemini_key!);
          const modelInst = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
          const fullPrompt = `${systemPrompt}\n\n` + messages.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n');
          const streamResult = await modelInst.generateContentStream(fullPrompt);
          for await (const chunk of streamResult.stream) {
            const text = chunk.text();
            if (text) {
              fullResponse += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
            }
          }
        } else {
          // Claude
          const { default: Anthropic } = await import('@anthropic-ai/sdk');
          const client = new Anthropic({ apiKey: config.anthropic_key! });
          const apiMessages = messages.map((m: { role: string; content: string }) => ({
            role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
            content: m.content,
          }));
          const streamResult = client.messages.stream({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            system: systemPrompt,
            messages: apiMessages,
          });
          for await (const chunk of streamResult) {
            if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
              const text = chunk.delta.text;
              fullResponse += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
            }
          }
        }

        const assistantMsg = { role: 'assistant' as const, content: fullResponse, timestamp: new Date().toISOString() };
        mockDb.createChat({ user_id: userId, resume_id, model: activeProvider, messages: [...messages, assistantMsg] });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (err: any) {
        console.error('[Chat Error]', err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: `\n\n❌ **Error during chat generation:** ${err?.message || err}` })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
