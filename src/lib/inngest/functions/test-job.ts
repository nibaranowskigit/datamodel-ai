import { inngest } from '../client';
export const testJob = inngest.createFunction(
  { id: 'test-job', triggers: [{ event: 'test/run' }] },
  async ({ event, step }) => {
    await step.run('log-event', async () => {
      console.log('Inngest working. Event:', event.data);
      return { ok: true };
    });
  }
);

