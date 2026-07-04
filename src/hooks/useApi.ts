// ============================================================
//  useApi — a typed fetch hook that attaches user auth headers
// ============================================================
'use client';
import { useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';

export function useApi() {
  const { user } = useAuth();

  const call = useCallback(async <T = unknown>(
    url: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; success: boolean }> => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user?.id || 'demo-001',
        ...(options.headers as Record<string, string> || {}),
      },
    });
    const json = await res.json();
    return json;
  }, [user?.id]);

  const get = useCallback(<T = unknown>(url: string) => call<T>(url), [call]);

  const post = useCallback(<T = unknown>(url: string, body: unknown) =>
    call<T>(url, { method: 'POST', body: JSON.stringify(body) }), [call]);

  const patch = useCallback(<T = unknown>(url: string, body: unknown) =>
    call<T>(url, { method: 'PATCH', body: JSON.stringify(body) }), [call]);

  const del = useCallback(<T = unknown>(url: string, body?: unknown) =>
    call<T>(url, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }), [call]);

  const userId = user?.id || 'demo-001';

  // Streaming chat helper
  const streamChat = useCallback(async (
    messages: { role: string; content: string }[],
    model: string,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    options?: { resume_id?: string; chat_id?: string }
  ) => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ messages, model, ...options }),
    });

    if (!res.body) throw new Error('No streaming body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      const lines = text.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        try {
          const json = JSON.parse(line.slice(6));
          if (json.chunk) onChunk(json.chunk);
          if (json.done) onDone();
        } catch {}
      }
    }
  }, [userId]);

  return { get, post, patch, del, streamChat, userId };
}
