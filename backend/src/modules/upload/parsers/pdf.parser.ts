import { createRequire } from 'module';
import type { ParsedLine } from './question.parser.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = createRequire(import.meta.url)('pdf-parse');

export async function parsePdf(buffer: Buffer): Promise<ParsedLine[]> {
  const lines: ParsedLine[] = [];

  const data = await pdfParse(buffer);
  const rawText = data.text;

  // Split by newlines and clean up
  const rawLines = rawText.split('\n');

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Handle tab-separated options on same line
    if (trimmed.includes('\t')) {
      const segments = trimmed.split('\t').map((s: string) => s.trim()).filter(Boolean);
      for (const seg of segments) {
        lines.push({ text: seg, isBold: false, isHighlight: false });
      }
    } else {
      lines.push({ text: trimmed, isBold: false, isHighlight: false });
    }
  }

  return lines;
}
