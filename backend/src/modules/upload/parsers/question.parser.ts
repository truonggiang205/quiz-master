export interface ParsedLine {
  text: string;
  isBold: boolean;
  isHighlight: boolean;
}

export interface ParsedOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface ParsedQuestion {
  id: string;
  questionNumber: number;
  content: string;
  options: ParsedOption[];
  correctAnswer: string | null;
  warnings: string[];
}

// Regex patterns
const QUESTION_REGEX = /^(Câu\s*hỏi\s*(\d+)|Câu\s*(\d+)|Question\s*(\d+)|\b(\d+)\s*[.:\-\)])\s*(.*)/i;
const OPTION_REGEX = /^([A-F])\s*[.:\-\)]\s*(.*)/i;
const ANSWER_REGEX = /^(đáp\s*án|đáp\s*án\s*đúng|answer|correct\s*answer)\s*[:\-]?\s*([A-F])\s*$/i;
const ANSWER_KEY_REGEX = /^(Câu\s*\d+|\d+)\s*[:\-]\s*([A-F])\s*$/i;
const SPLIT_OPTIONS_REGEX = /\s+([A-F]\s*[.:\-\)])\s+/i;

function preprocessLines(inputLines: ParsedLine[]): ParsedLine[] {
  const newLines: ParsedLine[] = [];

  for (const line of inputLines) {
    const text = (line.text || '').trim();
    if (!text) continue;

    const parts = text.split(SPLIT_OPTIONS_REGEX);
    if (parts.length === 1) {
      newLines.push(line);
    } else {
      const firstPart = parts[0].trim();
      if (firstPart) {
        newLines.push({ ...line, text: firstPart });
      }

      for (let i = 1; i < parts.length; i += 2) {
        const optLabel = parts[i].trim();
        const optText = i + 1 < parts.length ? parts[i + 1].trim() : '';
        newLines.push({ ...line, text: `${optLabel} ${optText}` });
      }
    }
  }

  return newLines;
}

export function parseQuestions(lines: ParsedLine[]): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  let currentQuestion: ParsedQuestion | null = null;
  let currentOption: ParsedOption | null = null;

  function flush() {
    if (!currentQuestion) return;

    const opts = currentQuestion.options;
    const correctOpts = opts.filter(o => o.isCorrect);
    if (correctOpts.length > 0 && correctOpts.length === opts.length) {
      // All marked correct — pick only first
      for (const opt of opts) opt.isCorrect = false;
      correctOpts[0].isCorrect = true;
      currentQuestion.correctAnswer = correctOpts[0].label;
    } else if (correctOpts.length === 1 && !currentQuestion.correctAnswer) {
      currentQuestion.correctAnswer = correctOpts[0].label;
    }

    questions.push(currentQuestion);
    currentQuestion = null;
    currentOption = null;
  }

  const processedLines = preprocessLines(lines);

  for (const line of processedLines) {
    const text = (line.text || '').trim();
    if (!text) continue;

    // Check answer key pattern (e.g. "1: A" or "Câu 1: B")
    const ansKeyMatch = ANSWER_KEY_REGEX.exec(text);
    if (ansKeyMatch) {
      const qNumStr = ansKeyMatch[1].replace(/\D/g, '');
      const ans = ansKeyMatch[2].toUpperCase();
      const qNum = parseInt(qNumStr, 10);

      const targetQ =
        questions.find(q => q.questionNumber === qNum) ||
        (currentQuestion?.questionNumber === qNum ? currentQuestion : null);

      if (targetQ) {
        targetQ.correctAnswer = ans;
      }
      continue;
    }

    // Check inline answer (e.g. "Đáp án: A")
    const ansMatch = ANSWER_REGEX.exec(text);
    if (ansMatch && currentQuestion) {
      currentQuestion.correctAnswer = ansMatch[2].toUpperCase();
      currentOption = null;
      continue;
    }

    // Check question start
    const qMatch = QUESTION_REGEX.exec(text);
    if (qMatch) {
      const numStr = qMatch[2] || qMatch[3] || qMatch[4] || qMatch[5] || '0';
      const num = parseInt(numStr, 10);
      let remainingText = qMatch[6] || '';
      remainingText = remainingText.replace(/^[.:\-]\s*/, '').trim();

      flush();
      currentQuestion = {
        id: `q-tmp-${Date.now()}-${questions.length}`,
        questionNumber: num,
        content: remainingText,
        options: [],
        correctAnswer: null,
        warnings: [],
      };
      currentOption = null;
      continue;
    }

    if (!currentQuestion) continue;

    // Check option start (A. B. C. D.)
    const optMatch = OPTION_REGEX.exec(text);
    if (optMatch) {
      const label = optMatch[1].toUpperCase();
      const optText = (optMatch[2] || '').trim();
      const isCorrect = !!(line.isHighlight || line.isBold);

      currentOption = { label, text: optText, isCorrect };
      currentQuestion.options.push(currentOption);

      if (isCorrect && !currentQuestion.correctAnswer) {
        currentQuestion.correctAnswer = label;
      }
      continue;
    }

    // Continuation line
    if (currentOption) {
      currentOption.text += ' ' + text;
    } else {
      if (currentQuestion.content) {
        currentQuestion.content += '\n' + text;
      } else {
        currentQuestion.content = text;
      }
    }
  }

  flush();
  return questions;
}
