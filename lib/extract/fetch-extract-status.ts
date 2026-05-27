export interface ExtractStatusResponse {
  stem: string;
  pendingCount: number;
  upToDate: boolean;
  totalSteps: number;
  pendingStepLabels: string[];
}

export async function fetchExtractStatus(stem: string): Promise<ExtractStatusResponse> {
  const res = await fetch(`/api/extract/${encodeURIComponent(stem)}`, {
    method: "GET",
    cache: "no-store",
  });
  const data = (await res.json()) as ExtractStatusResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Extract status failed (${res.status})`);
  }
  return data;
}
