import { Injectable } from '@nestjs/common';
import { MOCK_QUIZZES, MockQuiz, QuizStatus } from '../../../mocks/quizzes.mock.js';
import { CreateQuizDto } from '../dto/create-quiz.dto.js';
import { UpdateQuizDto } from '../dto/update-quiz.dto.js';

export interface IQuizzesRepository {
  findAll(): Promise<MockQuiz[]>;
  findById(id: string): Promise<MockQuiz | null>;
  findByTeacherId(teacherId: string): Promise<MockQuiz[]>;
  findPublished(): Promise<MockQuiz[]>;
  create(quiz: CreateQuizDto, teacher: { id: string; name: string }): Promise<MockQuiz>;
  update(id: string, quiz: UpdateQuizDto): Promise<MockQuiz | null>;
  delete(id: string): Promise<boolean>;
  updateStatus(id: string, status: QuizStatus): Promise<MockQuiz | null>;
  updateQuestionStats(id: string, count: number, totalScore: number): Promise<void>;
}

@Injectable()
export class InMemoryQuizzesRepository implements IQuizzesRepository {
  private quizzes: MockQuiz[] = [...MOCK_QUIZZES];

  async findAll(): Promise<MockQuiz[]> {
    return [...this.quizzes];
  }

  async findById(id: string): Promise<MockQuiz | null> {
    const quiz = this.quizzes.find((q) => q.id === id);
    return quiz ? { ...quiz } : null;
  }

  async findByTeacherId(teacherId: string): Promise<MockQuiz[]> {
    return this.quizzes.filter((q) => q.teacherId === teacherId);
  }

  async findPublished(): Promise<MockQuiz[]> {
    return this.quizzes.filter((q) => q.status === 'PUBLISHED');
  }

  async create(dto: CreateQuizDto, teacher: { id: string; name: string }): Promise<MockQuiz> {
    const now = new Date().toISOString();
    const newQuiz: MockQuiz = {
      id: `quiz-${Date.now()}`,
      title: dto.title,
      description: dto.description || '',
      subject: dto.subject,
      durationMinutes: dto.durationMinutes,
      status: 'DRAFT',
      startTime: dto.startTime || now,
      endTime: dto.endTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      totalAttempts: dto.totalAttempts || 1,
      shuffleQuestions: dto.shuffleQuestions ?? true,
      shuffleAnswers: dto.shuffleAnswers ?? true,
      showScoreImmediately: dto.showScoreImmediately ?? true,
      showCorrectAnswers: dto.showCorrectAnswers ?? true,
      showExplanation: dto.showExplanation ?? true,
      answerReleaseAt: dto.answerReleaseAt || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      teacherId: teacher.id,
      teacherName: teacher.name,
      questionCount: 0,
      totalScore: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.quizzes.unshift(newQuiz);
    return newQuiz;
  }

  async update(id: string, dto: UpdateQuizDto): Promise<MockQuiz | null> {
    const index = this.quizzes.findIndex((q) => q.id === id);
    if (index === -1) return null;

    const updated: MockQuiz = {
      ...this.quizzes[index],
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    this.quizzes[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const initialLen = this.quizzes.length;
    this.quizzes = this.quizzes.filter((q) => q.id !== id);
    return this.quizzes.length < initialLen;
  }

  async updateStatus(id: string, status: QuizStatus): Promise<MockQuiz | null> {
    const quiz = this.quizzes.find((q) => q.id === id);
    if (!quiz) return null;
    quiz.status = status;
    quiz.updatedAt = new Date().toISOString();
    return { ...quiz };
  }

  async updateQuestionStats(id: string, count: number, totalScore: number): Promise<void> {
    const quiz = this.quizzes.find((q) => q.id === id);
    if (quiz) {
      quiz.questionCount = count;
      quiz.totalScore = totalScore;
      quiz.updatedAt = new Date().toISOString();
    }
  }
}
