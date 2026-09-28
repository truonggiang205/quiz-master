import mammoth from 'mammoth';
import type { ParsedLine } from './question.parser.js';

export async function parseDocx(buffer: Buffer): Promise<ParsedLine[]> {
  const lines: ParsedLine[] = [];

  // Extract raw text with style info using mammoth messages
  // We use the raw HTML output to detect bold/highlight, then strip tags
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  // Parse the HTML line-by-line to extract text + bold/highlight metadata
  // Split by block-level tags to simulate "paragraphs"
  const blockRegex = /<(p|li|td|th)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    const innerHtml = match[2];
    if (!innerHtml.trim()) continue;

    // Check for bold: <strong> tags
    const hasBold = /<strong>/i.test(innerHtml);

    // Check for highlight: mammoth renders highlight as <mark> or inline style
    const hasHighlight = /<mark>/i.test(innerHtml);

    // Strip all HTML tags to get plain text
    const rawText = innerHtml
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#\d+;/g, '')
      .trim();

    if (!rawText) continue;

    // Split on tab characters (some docx layout options in a row)
    if (rawText.includes('\t')) {
      const segments = rawText.split('\t').map(s => s.trim()).filter(Boolean);
      for (const seg of segments) {
        lines.push({ text: seg, isBold: hasBold, isHighlight: hasHighlight });
      }
    } else {
      lines.push({ text: rawText, isBold: hasBold, isHighlight: hasHighlight });
    }
  }

  // Fallback: if no blocks found, extract plain text
  if (lines.length === 0) {
    const plainResult = await mammoth.extractRawText({ buffer });
    const textLines = plainResult.value.split('\n');
    for (const line of textLines) {
      const trimmed = line.trim();
      if (trimmed) {
        lines.push({ text: trimmed, isBold: false, isHighlight: false });
      }
    }
  }

  return lines;
}
