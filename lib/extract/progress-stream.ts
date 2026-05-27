import { runFullExtractForStem, type FullExtractResult } from "./full-extract";
import { logExtractProgress, type ExtractProgressEvent } from "./progress";

function encodeEvent(event: ExtractProgressEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

/** NDJSON stream of {@link ExtractProgressEvent} for live extract UI. */
export function createFullExtractProgressStream(
  stem: string,
  options: {
    force?: boolean;
    pendingOnly?: boolean;
    exportTables?: boolean;
    maxSteps?: number;
  } = {}
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const emit = (event: ExtractProgressEvent) => {
        logExtractProgress(event);
        controller.enqueue(encodeEvent(event));
      };

      try {
        const result = await runFullExtractForStem(stem, {
          force: options.force,
          pendingOnly: options.pendingOnly,
          exportTables: options.exportTables,
          maxSteps: options.maxSteps,
          onProgress: emit,
        });
        emit({ type: "complete", result });
        controller.close();
      } catch (err) {
        emit({ type: "error", message: (err as Error).message });
        controller.close();
      }
    },
  });
}

export type { FullExtractResult };
