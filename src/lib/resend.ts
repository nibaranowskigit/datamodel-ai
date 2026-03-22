import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('[resend] RESEND_API_KEY not set — email sending will fail');
}

export const resend = new Resend(process.env.RESEND_API_KEY ?? '');
