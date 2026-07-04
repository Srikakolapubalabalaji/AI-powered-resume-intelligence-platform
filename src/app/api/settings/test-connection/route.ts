import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { decrypt } from '@/lib/encryption';

const MASK = '••••••••••••••••';

export async function POST(req: NextRequest) {
  try {
    const { provider, key } = await req.json();
    const userId = req.headers.get('x-user-id') || 'demo-001';

    if (!key || key.trim() === '') {
      return NextResponse.json({ success: false, error: 'API key/token cannot be empty' });
    }

    let testKey = key;
    if (key === MASK) {
      const user = mockDb.getUser(userId) as Record<string, any>;
      // Look up key field on User object
      const keyField = `${provider}_key`;
      const stored = user ? user[keyField] : null;
      if (stored) {
        testKey = decrypt(stored);
      } else {
        return NextResponse.json({ success: false, error: 'No saved key found to test.' });
      }
    }

    if (testKey.includes('placeholder') || testKey.includes('your-key-here') || testKey.includes('sk-your-')) {
      return NextResponse.json({ success: false, error: 'Invalid key: please enter a real API key' });
    }

    if (provider === 'anthropic') {
      try {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: testKey });
        await client.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Ping' }],
        });
        return NextResponse.json({ success: true, message: 'Anthropic Claude API connection tested successfully!' });
      } catch (err: any) {
        console.error('[Settings Test] Anthropic error:', err);
        return NextResponse.json({ success: false, error: err?.message || 'Failed to authenticate with Anthropic.' });
      }
    }

    if (provider === 'openai') {
      try {
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({ apiKey: testKey });
        await client.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Ping' }],
        });
        return NextResponse.json({ success: true, message: 'OpenAI API connection tested successfully!' });
      } catch (err: any) {
        console.error('[Settings Test] OpenAI error:', err);
        return NextResponse.json({ success: false, error: err?.message || 'Failed to authenticate with OpenAI.' });
      }
    }

    if (provider === 'groq') {
      try {
        const { default: OpenAI } = await import('openai');
        const client = new OpenAI({
          apiKey: testKey,
          baseURL: 'https://api.groq.com/openai/v1',
        });
        await client.chat.completions.create({
          model: 'llama3-70b-8192',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Ping' }],
        });
        return NextResponse.json({ success: true, message: 'Groq API connection tested successfully!' });
      } catch (err: any) {
        console.error('[Settings Test] Groq error:', err);
        return NextResponse.json({ success: false, error: err?.message || 'Failed to authenticate with Groq.' });
      }
    }

    if (provider === 'gemini') {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(testKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        await model.generateContent('Ping');
        return NextResponse.json({ success: true, message: 'Gemini API connection tested successfully!' });
      } catch (err: any) {
        console.error('[Settings Test] Gemini error:', err);
        return NextResponse.json({ success: false, error: err?.message || 'Failed to authenticate with Gemini.' });
      }
    }

    if (provider === 'apify') {
      try {
        const apifyRes = await fetch('https://api.apify.com/v2/users/me', {
          headers: { Authorization: `Bearer ${testKey}` },
        });
        if (!apifyRes.ok) {
          const json = await apifyRes.json().catch(() => ({}));
          return NextResponse.json({ success: false, error: json?.error?.message || 'Apify token rejected.' });
        }
        return NextResponse.json({ success: true, message: 'Apify API connection tested successfully!' });
      } catch (err: any) {
        console.error('[Settings Test] Apify error:', err);
        return NextResponse.json({ success: false, error: err?.message || 'Network error connecting to Apify.' });
      }
    }

    return NextResponse.json({ success: false, error: 'Unknown provider' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Connection test failed' }, { status: 500 });
  }
}
