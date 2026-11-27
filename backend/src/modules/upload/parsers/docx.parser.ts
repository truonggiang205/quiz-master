import mammoth from 'mammoth';
import { load } from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { ParsedLine } from './question.parser.js';

interface StyledCharacter {
  character: string;
  isBold: boolean;
  isHighlight: boolean;
}

const OPTION_MARKER = /(^|\s)([A-F])\s*[.:\-)]/gi;
const OPTION_PREFIX = /^\s*[A-F]\s*[.:\-)]\s*/i;

function isBoldElement(tagName: string, style: string): boolean {
  return tagName === 'strong' || tagName === 'b' || /font-weight\s*:\s*(bold|[6-9]00)/i.test(style);
}

function isHighlightedElement(tagName: string, style: string): boolean {
  return tagName === 'mark' || /(?:background|highlight)(?:-color)?\s*:\s*(?!transparent)[^;]+/i.test(style);
}

function appendText(
  characters: StyledCharacter[],
  value: string,
  isBold: boolean,
  isHighlight: boolean,
) {
  for (const character of value) {
    characters.push({ character, isBold, isHighlight });
  }
}

function collectStyledCharacters(
  node: AnyNode,
  characters: StyledCharacter[],
  inheritedBold = false,
  inheritedHighlight = false,
) {
  if (node.type === 'text') {
    appendText(characters, node.data || '', inheritedBold, inheritedHighlight);
    return;
  }

  if (node.type !== 'tag') return;

  const tagName = node.name.toLowerCase();
  if (tagName === 'br') {
    appendText(characters, '\n', inheritedBold, inheritedHighlight);
    return;
  }

  const style = node.attribs?.style || '';
  const isBold = inheritedBold || isBoldElement(tagName, style);
  const isHighlight = inheritedHighlight || isHighlightedElement(tagName, style);

  for (const child of node.children || []) {
    collectStyledCharacters(child, characters, isBold, isHighlight);
  }
}

function pushLine(lines: ParsedLine[], characters: StyledCharacter[]) {
  const rawText = characters.map(({ character }) => character).join('');
  const text = rawText.replace(/\s+/g, ' ').trim();
  if (!text) return;

  // In many Word templates the A./B./C./D. labels are bold for readability.
  // That formatting is not an answer key. For an option, only consider
  // formatting applied to its content (not its label) when inferring the key.
  const optionPrefix = OPTION_PREFIX.exec(rawText);
  const formattedCharacters = optionPrefix
    ? characters.slice(optionPrefix[0].length)
    : characters;

  lines.push({
    text,
    // Ignore whitespace formatting so a bold separator cannot mark an answer.
    isBold: formattedCharacters.some(({ character, isBold }) => isBold && !/\s/.test(character)),
    isHighlight: formattedCharacters.some(
      ({ character, isHighlight }) => isHighlight && !/\s/.test(character),
    ),
  });
}

function splitLogicalLines(lines: ParsedLine[], characters: StyledCharacter[]) {
  const plainText = characters.map(({ character }) => character).join('');
  const optionStarts: number[] = [];
  let match: RegExpExecArray | null;
  OPTION_MARKER.lastIndex = 0;

  while ((match = OPTION_MARKER.exec(plainText)) !== null) {
    // Group 1 is either the start of the line or the whitespace before A./B./…
    optionStarts.push(match.index + match[1].length);
  }

  if (optionStarts.length === 0) {
    pushLine(lines, characters);
    return;
  }

  let start = 0;
  for (const optionStart of optionStarts) {
    if (optionStart > start) pushLine(lines, characters.slice(start, optionStart));
    start = optionStart;
  }
  pushLine(lines, characters.slice(start));
}

/**
 * Converts Mammoth's HTML into parser lines while retaining run-level formatting.
 * Exported for parser tests; production code should use parseDocx().
 */
export function parseDocxHtml(html: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  const $ = load(html);

  // Mammoth puts table cells' text inside paragraphs. Processing both the
  // cell and its descendant paragraph duplicates every value; processing the
  // table paragraphs also makes answer grids look like A/B/C/D choices.
  // The document importer currently imports ordinary A–F multiple-choice
  // blocks, so leave tables out rather than create incorrect questions.
  $('p, li').each((_, element) => {
    if ($(element).parents('table').length > 0) return;
    const characters: StyledCharacter[] = [];
    for (const child of $(element).contents().toArray()) {
      collectStyledCharacters(child, characters);
    }

    // Word may use a manual line break rather than a new paragraph.
    // Split these first, then split a row of A./B./C./D. options.
    let paragraphStart = 0;
    for (let index = 0; index <= characters.length; index += 1) {
      if (index === characters.length || characters[index].character === '\n') {
        splitLogicalLines(lines, characters.slice(paragraphStart, index));
        paragraphStart = index + 1;
      }
    }
  });

  return lines;
}

export async function parseDocx(buffer: Buffer): Promise<ParsedLine[]> {
  const result = await mammoth.convertToHtml({ buffer });
  const lines = parseDocxHtml(result.value);

  // Fallback: retain support for unusual DOCX files Mammoth cannot map to blocks.
  if (lines.length === 0) {
    const plainResult = await mammoth.extractRawText({ buffer });
    for (const text of plainResult.value.split('\n')) {
      const trimmed = text.trim();
      if (trimmed) lines.push({ text: trimmed, isBold: false, isHighlight: false });
    }
  }

  return lines;
}
