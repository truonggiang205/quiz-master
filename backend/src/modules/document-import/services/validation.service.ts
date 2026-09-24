import { Injectable } from '@nestjs/common';
import { ParsedQuestion } from './question-parser.service.js';

export interface ValidationSummary {
  total: number;
  valid: number;
  warning: number;
  error: number;
}

@Injectable()
export class ValidationService {
  public validate(questions: ParsedQuestion[]): { questions: ParsedQuestion[], summary: ValidationSummary } {
    const summary: ValidationSummary = { total: questions.length, valid: 0, warning: 0, error: 0 };
    
    for (const q of questions) {
      q.warnings = [];
      let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';
      
      if (!q.content || q.content.trim() === '') {
        q.warnings.push('ERROR: Không tìm thấy nội dung câu hỏi.');
        status = 'ERROR';
      }
      
      if (q.options.length === 0) {
        q.warnings.push('ERROR: Không có đáp án nào (A, B, C, D) được tìm thấy.');
        status = 'ERROR';
      } else if (q.options.length < 2) {
        q.warnings.push('WARNING: Số lượng đáp án quá ít (nhỏ hơn 2).');
        if (status !== 'ERROR') status = 'WARNING';
      }
      
      const hasLabels = q.options.map(o => o.label).sort();
      const hasDuplicates = new Set(hasLabels).size !== hasLabels.length;
      if (hasDuplicates) {
         q.warnings.push('WARNING: Có đáp án bị trùng lặp nhãn (ví dụ: hai đáp án A).');
         if (status !== 'ERROR') status = 'WARNING';
      }
      
      if (!q.correctAnswer) {
         q.warnings.push('WARNING: Không tìm thấy đáp án đúng.');
         if (status !== 'ERROR') status = 'WARNING';
      } else {
         const correctOpt = q.options.find(o => o.label === q.correctAnswer);
         if (!correctOpt) {
            q.warnings.push(`ERROR: Đáp án đúng là ${q.correctAnswer} nhưng không tìm thấy option ${q.correctAnswer} trong câu hỏi.`);
            status = 'ERROR';
         } else {
            correctOpt.isCorrect = true; // ensure boolean is set
         }
      }
      
      if (status === 'VALID') summary.valid++;
      if (status === 'WARNING') summary.warning++;
      if (status === 'ERROR') summary.error++;
      
      (q as any).status = status;
    }
    
    return { questions, summary };
  }
}
