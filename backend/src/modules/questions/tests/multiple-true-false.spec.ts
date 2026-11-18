import { describe, expect, it, vi } from 'vitest';
import { QuestionsService } from '../questions.service.js';

describe('MULTIPLE_TRUE_FALSE question validation', () => {
  const options = [{ id: 'a', text: 'A', isCorrect: true }, { id: 'b', text: 'B', isCorrect: false }];
  const repository: any = { create: vi.fn(value => value), save: vi.fn(async value => value) };
  const service = new QuestionsService(repository, {} as any, {} as any, {} as any, {} as any);

  it('stores true and false statements in the existing options JSON', async () => {
    const result = await service.saveToBank('teacher', { content: 'Question', type: 'MULTIPLE_TRUE_FALSE', score: 1, options });
    expect(result.options).toEqual(options);
  });

  it.each([
    [],
    [options[0]],
    [options[0], { ...options[1], id: 'a' }],
    [options[0], { ...options[1], text: '  ' }],
    [options[0], { ...options[1], isCorrect: null }],
  ])('rejects invalid statements', async invalid => {
    await expect(service.saveToBank('teacher', { content: 'Question', type: 'MULTIPLE_TRUE_FALSE', score: 1, options: invalid as any })).rejects.toThrow();
  });
});
