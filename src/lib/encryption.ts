import crypto from 'crypto';

// Use a fallback key for encryption if process.env.ENCRYPTION_KEY is not defined.
// Encryption key must be exactly 32 bytes (256 bits).
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest()
  : Buffer.from('bagupadu-default-key-32bytes-long!', 'utf8');

const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift() || '', 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error('[Encryption] Decryption failed:', err);
    return '';
  }
}
