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
  status?: 'VALID' | 'WARNING' | 'ERROR';
}
