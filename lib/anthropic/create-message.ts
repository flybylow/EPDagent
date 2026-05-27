import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MAX_RETRIES = 6;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isAnthropicRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number }).status;
  if (status === 429) return true;
  const message = String((err as Error).message ?? "");
  return /rate_limit|429/.test(message);
}

/** Wait long enough for org output-TPM windows (often 8k/min) to reset. */
export function rateLimitRetryDelayMs(err: unknown, attempt: number): number {
  const headers = (err as { headers?: Headers | Record<string, string> }).headers;
  if (headers) {
    const raw =
      headers instanceof Headers
        ? headers.get("retry-after")
        : headers["retry-after"] ?? headers["Retry-After"];
    const seconds = raw ? Number(raw) : NaN;
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds * 1000) + 500;
    }
  }
  // 15s, 30s, 45s, then cap at 65s (one TPM window)
  return Math.min(65_000, 15_000 * (attempt + 1));
}

/**
 * Call Claude with retries on 429 / rate_limit_error (output TPM, etc.).
 */
export async function createMessageWithRetry(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  options: { maxRetries?: number; label?: string } = {}
): Promise<Anthropic.Message> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await client.messages.create(params);
    } catch (err) {
      lastErr = err;
      if (!isAnthropicRateLimitError(err) || attempt >= maxRetries) {
        throw err;
      }
      const waitMs = rateLimitRetryDelayMs(err, attempt);
      const label = options.label ? ` (${options.label})` : "";
      console.warn(
        `[anthropic] rate limited${label}, retry ${attempt + 1}/${maxRetries} in ${Math.round(waitMs / 1000)}s`
      );
      await sleep(waitMs);
    }
  }

  throw lastErr;
}
