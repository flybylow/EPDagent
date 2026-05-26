export interface FilenameParseResult {
  pdf_filename: string;
  pdf_stem: string;
  epd_number: string | null;
  language: string | null;
  pattern: string | null;
}

const PATTERNS: Array<{
  name: string;
  regex: RegExp;
  parse: (match: RegExpMatchArray, filename: string, stem: string) => FilenameParseResult;
}> = [
  {
    name: "B-EPD",
    regex: /^B-EPD\s+([\d-]+)-([A-Z]{2})\b/i,
    parse: (m, filename, stem) => ({
      pdf_filename: filename,
      pdf_stem: stem,
      epd_number: m[1]!,
      language: m[2]!.toUpperCase(),
      pattern: "B-EPD",
    }),
  },
  {
    name: "B-EPD_",
    regex: /^B-EPD_([\d.]+-[\d.]+)\s+.+-([A-Z]{2})\s/i,
    parse: (m, filename, stem) => ({
      pdf_filename: filename,
      pdf_stem: stem,
      epd_number: m[1]!,
      language: m[2]!.toUpperCase(),
      pattern: "B-EPD_",
    }),
  },
  {
    name: "S-P",
    regex: /^EPD-S-P-(\d+)-([A-Z]{2})$/i,
    parse: (m, filename, stem) => ({
      pdf_filename: filename,
      pdf_stem: stem,
      epd_number: `S-P-${m[1]}`,
      language: m[2]!.toUpperCase(),
      pattern: "S-P",
    }),
  },
  {
    name: "BBD",
    regex: /^EPD-BBD-(\d{8})-([A-Z0-9]+)-([A-Z]{2})$/i,
    parse: (m, filename, stem) => ({
      pdf_filename: filename,
      pdf_stem: stem,
      epd_number: `EPD-BBD-${m[1]}-${m[2]}`,
      language: m[3]!.toUpperCase(),
      pattern: "BBD",
    }),
  },
];

export function parseFilename(filename: string): FilenameParseResult {
  const stem = filename.replace(/\.pdf$/i, "");
  for (const { name, regex, parse } of PATTERNS) {
    const match = stem.match(regex);
    if (match) {
      return parse(match, filename, stem);
    }
  }
  const langMatch = stem.match(/-([A-Z]{2})$/i);
  return {
    pdf_filename: filename,
    pdf_stem: stem,
    epd_number: null,
    language: langMatch ? langMatch[1]!.toUpperCase() : null,
    pattern: "unknown",
  };
}
