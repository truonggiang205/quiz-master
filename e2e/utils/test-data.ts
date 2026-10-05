export function uniqueString(prefix = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}@test.com`;
}

export function generateQuizData(custom: Partial<any> = {}) {
  const timestamp = Date.now();
  return {
    title: custom.title || `Bài thi Kiểm thử E2E - ${timestamp}`,
    subject: custom.subject || 'Toán Học',
    durationMinutes: custom.durationMinutes ?? 15,
    mode: custom.mode || 'QUIZ',
    status: custom.status || 'DRAFT',
    totalAttempts: 1,
    shuffleQuestions: false,
    shuffleAnswers: false,
    showScoreImmediately: true,
    showCorrectAnswers: true,
    showExplanation: true,
    ...custom,
  };
}

export function generateClassroomData(custom: Partial<any> = {}) {
  const timestamp = Date.now();
  return {
    name: custom.name || `Lớp học E2E - ${timestamp}`,
    subject: custom.subject || 'Vật Lý',
    description: custom.description || 'Lớp học phục vụ kiểm thử tự động',
    isPrivate: false,
    ...custom,
  };
}
