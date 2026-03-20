const DEFAULT_MAX_RETRIES = 4;
const BASE_DELAY_MS = 500;

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = DEFAULT_MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200;

        if (attempt < maxRetries) {
          await sleep(delay);
          continue;
        }
      }

      if (response.status >= 500 && attempt < maxRetries) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200);
      }
    }
  }

  throw lastError ?? new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
