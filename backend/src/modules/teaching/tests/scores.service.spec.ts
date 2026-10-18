import { describe, it, expect } from 'vitest';
import { ScoresService } from '../services/scores.service.js';
import { BadRequestException } from '@nestjs/common';

describe('ScoresService - Validation & Matrix calculations', () => {
  const service = new ScoresService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  it('TC-TCH-SCORE-UNIT-001: Validate khoảng điểm hợp lệ: 0 <= score <= maxScore', () => {
    // Valid: 8 / 10
    expect(() => (service as any).validateScoreRange(8, 10)).not.toThrow();

    // Valid: 0 / 10
    expect(() => (service as any).validateScoreRange(0, 10)).not.toThrow();

    // Valid: 10 / 10
    expect(() => (service as any).validateScoreRange(10, 10)).not.toThrow();

    // Invalid: score < 0
    expect(() => (service as any).validateScoreRange(-1, 10)).toThrow(BadRequestException);

    // Invalid: maxScore <= 0
    expect(() => (service as any).validateScoreRange(5, 0)).toThrow(BadRequestException);

    // Invalid: score > maxScore (12 / 10)
    expect(() => (service as any).validateScoreRange(12, 10)).toThrow(BadRequestException);
  });
});
