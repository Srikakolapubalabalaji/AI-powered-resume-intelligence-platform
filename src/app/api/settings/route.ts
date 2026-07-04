import { NextRequest, NextResponse } from 'next/server';
import { mockDb } from '@/lib/mock-db';
import { encrypt } from '@/lib/encryption';

const SECRET_FIELDS = ['anthropic_key', 'openai_key', 'groq_key', 'gemini_key', 'apify_key'] as const;
const MASK = '••••••••••••••••';

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-001';
    const user = mockDb.getUser(userId);
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    // Mask secret keys so they are never exposed to the frontend
    const safeUser = { ...user } as Record<string, any>;
    SECRET_FIELDS.forEach(field => {
      safeUser[`${field}_configured`] = !!user[field];
      if (user[field]) {
        safeUser[field] = MASK;
      } else {
        safeUser[field] = '';
      }
    });

    return NextResponse.json({ success: true, data: safeUser });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id') || 'demo-001';
    const user = mockDb.getUser(userId);
    if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

    const updates = await req.json() as Record<string, any>;

    // Securely encrypt any incoming key changes, or keep existing ones if they are masked
    SECRET_FIELDS.forEach(field => {
      if (updates[field] !== undefined) {
        const val = updates[field];
        if (val === MASK) {
          // Unchanged, discard update to keep existing stored value
          delete updates[field];
        } else if (val && val.trim() !== '') {
          // Encrypt and store new key value
          updates[field] = encrypt(val.trim());
        } else {
          // Explicitly clear key
          updates[field] = '';
        }
      }
    });

    const updated = mockDb.upsertUser({ id: userId, ...updates });

    // Mask updated response
    const safeUpdated = { ...updated } as Record<string, any>;
    SECRET_FIELDS.forEach(field => {
      safeUpdated[`${field}_configured`] = !!updated[field];
      if (updated[field]) {
        safeUpdated[field] = MASK;
      } else {
        safeUpdated[field] = '';
      }
    });

    return NextResponse.json({ success: true, data: safeUpdated });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
