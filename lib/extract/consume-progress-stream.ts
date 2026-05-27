import type { FullExtractResult } from "./full-extract";
import type { ExtractProgressEvent } from "./progress";

export async function consumeExtractProgressStream(
  response: Response,
  onEvent: (event: ExtractProgressEvent) => void
): Promise<{
  result: FullExtractResult | null;
  error: string | null;
  httpStatus: number;
  /** Stream closed before a {@link ExtractProgressEvent} complete event (e.g. server timeout). */
  incomplete: boolean;
}> {
  if (!response.body) {
    return {
      result: null,
      error: "No response body",
      httpStatus: response.status,
      incomplete: true,
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: FullExtractResult | null = null;
  let streamError: string | null = null;
  let sawComplete = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let event: ExtractProgressEvent;
      try {
        event = JSON.parse(trimmed) as ExtractProgressEvent;
      } catch {
        continue;
      }
      onEvent(event);
      if (event.type === "complete") {
        sawComplete = true;
        result = event.result as FullExtractResult;
      }
      if (event.type === "error") {
        streamError = event.message;
      }
    }
  }

  const tail = buffer.trim();
  if (tail) {
    try {
      const event = JSON.parse(tail) as ExtractProgressEvent;
      onEvent(event);
      if (event.type === "complete") {
        sawComplete = true;
        result = event.result as FullExtractResult;
      }
      if (event.type === "error") streamError = event.message;
    } catch {
      // ignore partial tail
    }
  }

  const incomplete = !sawComplete && !streamError;
  return {
    result,
    error: streamError,
    httpStatus: response.status,
    incomplete,
  };
}
