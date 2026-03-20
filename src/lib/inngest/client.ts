import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'datamodel-ai',
  isDev: process.env.NODE_ENV !== 'production',
});

