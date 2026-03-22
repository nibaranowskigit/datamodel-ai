import crypto from 'crypto';

export function generateApiKey(): {
  fullKey: string;
  prefix: string;
  hash: string;
} {
  const raw = crypto.randomBytes(32).toString('base64url');
  const fullKey = `dm_live_${raw}`;

  // First 4 chars of the random body shown in UI — enough to identify visually
  const prefix = `dm_live_${raw.slice(0, 4)}…`;

  const hash = crypto
    .createHash('sha256')
    .update(fullKey)
    .digest('hex');

  return { fullKey, prefix, hash };
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
