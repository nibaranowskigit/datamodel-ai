import { Resend } from 'resend';

let cached: Resend | null = null;

/**
 * Lazy Resend client so importing notification code does not require
 * RESEND_API_KEY at module load (e.g. `next build` / route collection).
 */
export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY is not set');
  }
  cached ??= new Resend(key);
  return cached;
}
