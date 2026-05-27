/** Strip URL/hash garbage sometimes pasted onto a stem. */
export function normalizeEpdStem(raw: string): string {
  let stem = decodeURIComponent(raw).trim();
  const junk = stem.match(/^(.+?)(?:\+\+|#).*/);
  if (junk?.[1]) stem = junk[1].trim();
  return stem.normalize("NFC");
}
