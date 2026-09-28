import { rebalance } from './points.util.js';

describe('points.util - rebalance', () => {
  it('should balance points evenly when no questions are locked', () => {
    const questions = [
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ];
    const result = rebalance(questions, 1000);
    expect(result).toEqual([
      { id: '1', points: 334 },
      { id: '2', points: 333 },
      { id: '3', points: 333 },
    ]);
  });

  it('should ignore locked questions and balance the rest', () => {
    const questions = [
      { id: '1', points: 500, isLocked: true },
      { id: '2' },
      { id: '3' },
    ];
    const result = rebalance(questions, 1000);
    expect(result).toEqual([
      { id: '1', points: 500, isLocked: true },
      { id: '2', points: 250 },
      { id: '3', points: 250 },
    ]);
  });

  it('should throw error if locked points exceed total points', () => {
    const questions = [
      { id: '1', points: 600, isLocked: true },
      { id: '2', points: 500, isLocked: true },
      { id: '3' },
    ];
    expect(() => rebalance(questions, 1000)).toThrowError('Tổng điểm các câu đã khóa vượt quá tổng điểm bài thi.');
  });

  it('should return as is if all questions are locked and points match', () => {
    const questions = [
      { id: '1', points: 500, isLocked: true },
      { id: '2', points: 500, isLocked: true },
    ];
    const result = rebalance(questions, 1000);
    expect(result).toEqual(questions);
  });

  it('should throw error if all questions are locked but points do not match', () => {
    const questions = [
      { id: '1', points: 400, isLocked: true },
      { id: '2', points: 500, isLocked: true },
    ];
    expect(() => rebalance(questions, 1000)).toThrowError('Không còn câu hỏi nào để chia điểm, nhưng tổng điểm chưa khớp.');
  });

  it('should handle zero questions', () => {
    const result = rebalance([], 1000);
    expect(result).toEqual([]);
  });
});
