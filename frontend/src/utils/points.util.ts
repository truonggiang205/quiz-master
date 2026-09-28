export interface RebalanceQuestion {
  id: string;
  points?: number;
  isLocked?: boolean;
}

export function rebalance<T extends RebalanceQuestion>(
  questions: T[],
  totalPoints: number
): T[] {
  if (!questions || questions.length === 0) return [];

  let lockedPoints = 0;
  let unlockedCount = 0;

  for (const q of questions) {
    if (q.isLocked) {
      lockedPoints += q.points || 0;
    } else {
      unlockedCount++;
    }
  }

  const remainingPoints = totalPoints - lockedPoints;

  if (remainingPoints < 0) {
    throw new Error('Tổng điểm các câu đã khóa vượt quá tổng điểm bài thi.');
  }

  if (unlockedCount === 0) {
    if (remainingPoints !== 0) {
      throw new Error('Không còn câu hỏi nào để chia điểm, nhưng tổng điểm chưa khớp.');
    }
    return questions.map(q => ({ ...q }));
  }

  const basePoints = Math.floor(remainingPoints / unlockedCount);
  const remainder = remainingPoints % unlockedCount;

  let remainderCount = remainder;

  return questions.map(q => {
    if (q.isLocked) {
      return { ...q };
    }
    const additional = remainderCount > 0 ? 1 : 0;
    if (remainderCount > 0) {
      remainderCount--;
    }
    return {
      ...q,
      points: basePoints + additional
    };
  });
}
