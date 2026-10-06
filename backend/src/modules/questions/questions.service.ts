import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { QuestionEntity, QuestionOption, SubmissionEntity } from '../../entities/index.js';
import { EssayRubricEntity } from '../grading/entities/essay-rubric.entity.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { UploadService } from '../upload/upload.service.js';
import { QuizzesService } from '../quizzes/quizzes.service.js';
import { gradeWithRubric } from '../grading/rubric/rubric-grader.js';
import { DEFAULT_GRADING_CONFIG } from '../grading/grading.config.js';
import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepo: Repository<QuestionEntity>,
    @InjectRepository(SubmissionEntity)
    private readonly submissionRepo: Repository<SubmissionEntity>,
    @InjectRepository(EssayRubricEntity)
    private readonly rubricRepo: Repository<EssayRubricEntity>,
    private readonly quizzesService: QuizzesService,
    private readonly uploadService: UploadService,
  ) { }

  private async getQuestionFolder(quizId: string): Promise<string> {
    if (!quizId) return 'quiz-master/ngân hàng câu hỏi/đề bài';
    const quiz = await this.quizzesService.getQuizById(quizId, 'TEACHER');
    if (!quiz) return 'quiz-master/ngân hàng câu hỏi/đề bài';
    
    const rootDir = quiz.mode === 'PRACTICE' ? 'ôn tập' : 'bài thi';
    const subjectDir = (quiz.subject || 'khác').trim().toLowerCase();
    const titleDir = quiz.title.trim();
    return `quiz-master/${rootDir}/${subjectDir}/${titleDir}/đề bài`;
  }

  async getQuestionsByQuizId(quizId: string, userRole?: string, isExamMode?: boolean) {
    const questions = await this.questionRepo.find({
      where: { quizId },
      order: { order: 'ASC' },
    });

    // ALWAYS mask answers and explanation for students
    const isTeacher = userRole?.toUpperCase() === 'TEACHER';
    if (!isTeacher) {
      return questions.map((q) => ({
        id: q.id,
        quizId: q.quizId,
        content: q.content,
        imageUrl: q.imageUrl,
        type: q.type,
        score: q.score,
        points: q.points,
        order: q.order,
        options: (q.options || []).map((opt) => ({
          id: opt.id,
          text: opt.text,
        })),
      }));
    }

    return questions;
  }

  async getQuestionBank(teacherId: string) {
    return this.questionRepo.find({
      where: { teacherId, isBank: true },
      order: { createdAt: 'DESC' },
    });
  }

  async saveToBank(teacherId: string, dto: CreateQuestionDto) {
    const optionsWithIds: QuestionOption[] = (dto.options || []).map((opt, idx) => ({
      id: opt.id || `opt-${Date.now()}-${idx}`,
      text: opt.text,
      isCorrect: opt.isCorrect,
    }));

    let finalImageUrl = dto.imageUrl;
    if (finalImageUrl && finalImageUrl.startsWith('data:image/')) {
      try {
        const uploadResult = await this.uploadService.uploadBase64(finalImageUrl, 'quiz-master/ngân hàng câu hỏi/đề bài');
        finalImageUrl = uploadResult.secure_url || uploadResult.url;
      } catch (e) {
        console.error('Lỗi tải ảnh:', e);
      }
    }

    const newQuestion = this.questionRepo.create({
      id: `q-bank-${Date.now()}`,
      teacherId,
      isBank: true,
      content: dto.content,
      imageUrl: finalImageUrl,
      type: dto.type as any,
      options: optionsWithIds,
      essayRubric: dto.essayRubric || null,
      score: dto.score ?? 2.0,
      points: dto.points !== undefined ? dto.points : 0,
      explanation: dto.explanation || '',
      order: 0, // order doesn't matter much in bank
      subject: dto.subject || 'Chưa phân loại',
    });

    return this.questionRepo.save(newQuestion);
  }

  async importFromBank(quizId: string, questionIds: string[]) {
    if (!questionIds.length) return [];

    const existingCount = await this.questionRepo.count({ where: { quizId } });

    // Fetch bank questions
    const bankQuestions = await this.questionRepo.findBy({ id: In(questionIds) });

    // Clone them
    const newQuestions = bankQuestions.map((bankQ: QuestionEntity, idx: number) => {
      return this.questionRepo.create({
        id: `q-${Date.now()}-${idx}`,
        quizId,
        content: bankQ.content,
        imageUrl: bankQ.imageUrl,
        type: bankQ.type,
        options: bankQ.options.map((opt: any) => ({ ...opt, id: `opt-${Date.now()}-${idx}-${Math.random().toString(36).substring(7)}` })),
        essayRubric: bankQ.essayRubric || null,
        score: bankQ.score,
        points: bankQ.points || 0,
        isLocked: bankQ.isLocked || false,
        subject: bankQ.subject,
        explanation: bankQ.explanation,
        order: existingCount + idx + 1,
      });
    });

    const saved = await this.questionRepo.save(newQuestions);
    await this.syncQuizStats(quizId);
    return saved;
  }

  async createQuestion(quizId: string, dto: CreateQuestionDto, teacherId?: string) {
    const optionsWithIds: QuestionOption[] = (dto.options || []).map((opt, idx) => ({
      id: opt.id || `opt-${Date.now()}-${idx}`,
      text: opt.text,
      isCorrect: opt.isCorrect,
    }));

    const existingCount = await this.questionRepo.count({ where: { quizId } });

    let finalImageUrl = dto.imageUrl;
    if (finalImageUrl && finalImageUrl.startsWith('data:image/')) {
      try {
        const folder = await this.getQuestionFolder(quizId);
        const uploadResult = await this.uploadService.uploadBase64(finalImageUrl, folder);
        finalImageUrl = uploadResult.secure_url || uploadResult.url;
      } catch (e) {
        console.error('Lỗi tải ảnh:', e);
      }
    }

    const newQuestion = this.questionRepo.create({
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      quizId,
      content: dto.content,
      imageUrl: finalImageUrl,
      type: dto.type as any,
      options: optionsWithIds,
      essayRubric: dto.essayRubric || null,
      score: dto.score ?? 2.0,
      points: dto.points !== undefined ? dto.points : 0,
      isLocked: dto.isLocked ?? false,
      subject: dto.subject,
      explanation: dto.explanation || '',
      order: dto.order || existingCount + 1,
      teacherId,
    });

    const saved = await this.questionRepo.save(newQuestion);
    await this.syncQuizStats(quizId);
    return saved;
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    const question = await this.questionRepo.findOneBy({ id });
    if (!question) {
      throw new NotFoundException('Không tìm thấy câu hỏi để cập nhật');
    }

    const submissionsCount = await this.submissionRepo.count({ where: { quizId: question.quizId } });
    const hasSubmissions = submissionsCount > 0;

    // Nếu bài thi đã có học sinh làm bài: giữ nguyên điểm của câu hỏi (score và points),
    // không ném lỗi BadRequestException để giáo viên vẫn có thể cập nhật nội dung,
    // lời giải, và đặc biệt là cấu hình đáp án tự luận (essayRubric) để tự động chấm điểm!
    if (!hasSubmissions) {
      if (dto.score !== undefined) question.score = dto.score;
      if (dto.points !== undefined) question.points = dto.points;
    }

    if (dto.options) {
      question.options = dto.options.map((opt, idx) => ({
        id: opt.id || `opt-${Date.now()}-${idx}`,
        text: opt.text,
        isCorrect: opt.isCorrect,
      }));
    }

    let finalImageUrl = dto.imageUrl !== undefined ? dto.imageUrl : question.imageUrl;
    if (finalImageUrl && finalImageUrl.startsWith('data:image/')) {
      try {
        const folder = await this.getQuestionFolder(question.quizId);
        const uploadResult = await this.uploadService.uploadBase64(finalImageUrl, folder);
        finalImageUrl = uploadResult.secure_url || uploadResult.url;
      } catch (e) {
        console.error('Lỗi tải ảnh:', e);
      }
    }

    if (dto.content !== undefined) question.content = dto.content;
    if (dto.imageUrl !== undefined) question.imageUrl = finalImageUrl;
    if (dto.type !== undefined) question.type = dto.type as any;
    if (dto.isLocked !== undefined) question.isLocked = dto.isLocked;
    if (dto.explanation !== undefined) question.explanation = dto.explanation;
    if (dto.order !== undefined) question.order = dto.order;
    if (dto.essayRubric !== undefined) question.essayRubric = dto.essayRubric;

    const saved = await this.questionRepo.save(question);
    await this.syncQuizStats(question.quizId);

    // Khi giáo viên điền/cập nhật đáp án tự luận:
    // 1. Đồng bộ sang EssayRubricEntity
    // 2. Tự động chấm điểm (auto-grade) cho các bài thi học sinh đã nộp trước đó!
    if (saved.type === 'ESSAY' && saved.essayRubric) {
      await this.syncEssayRubricEntity(saved);
      if (hasSubmissions) {
        await this.autoGradeExistingSubmissions(saved);
      }
    }

    return saved;
  }

  async bulkUpdateQuestions(quizId: string, updates: { id: string; points?: number; isLocked?: boolean }[]) {
    // Check if the quiz exists
    const quiz = await this.quizzesService.getQuizById(quizId, 'TEACHER');
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra');
    }

    const submissionsCount = await this.submissionRepo.count({ where: { quizId } });
    const hasSubmissions = submissionsCount > 0;

    const questions = await this.questionRepo.find({ where: { quizId } });
    const questionMap = new Map(questions.map(q => [q.id, q]));

    const toSave: QuestionEntity[] = [];

    for (const update of updates) {
      const q = questionMap.get(update.id);
      if (q) {
        // Chỉ cho phép sửa điểm khi chưa có học sinh nộp bài
        if (!hasSubmissions && update.points !== undefined) {
          q.points = update.points;
        } else if (hasSubmissions && update.points !== undefined && update.points !== q.points) {
          throw new BadRequestException('Không thể sửa điểm trực tiếp vì bài thi đã có học sinh làm bài. Vui lòng tạo phiên bản mới.');
        }
        if (update.isLocked !== undefined) q.isLocked = update.isLocked;
        toSave.push(q);
      }
    }

    const saved = await this.questionRepo.save(toSave);
    await this.syncQuizStats(quizId);
    return saved;
  }

  async deleteQuestion(id: string) {
    const question = await this.questionRepo.findOneBy({ id });
    if (!question) {
      throw new NotFoundException('Không tìm thấy câu hỏi để xóa');
    }

    if (question.quizId) {
      const submissionsCount = await this.submissionRepo.count({ where: { quizId: question.quizId } });
      if (submissionsCount > 0) {
        throw new BadRequestException('Không thể xóa câu hỏi vì bài thi đã có học sinh làm bài.');
      }
    }

    if (question.imageUrl) {
      await this.uploadService.deleteFileByUrl(question.imageUrl);
    }

    const quizId = question.quizId;
    await this.questionRepo.delete({ id });
    if (quizId) {
      await this.syncQuizStats(quizId);
    }
    return { id, deleted: true };
  }

  private async syncEssayRubricEntity(question: QuestionEntity) {
    if (!this.rubricRepo || !question.essayRubric) return;
    try {
      const existing = await this.rubricRepo.findOneBy({ questionId: question.id });
      const entity = existing ?? this.rubricRepo.create({ id: `rubric-${Date.now()}` });
      entity.questionId = question.id;
      entity.acceptedAnswers = question.essayRubric.acceptedAnswers || null;
      entity.criteria = question.essayRubric.criteria || [];
      entity.totalScore = question.essayRubric.totalScore || Number(question.points) || 100;
      await this.rubricRepo.save(entity);
    } catch (e) {
      console.warn('Lỗi khi đồng bộ EssayRubricEntity:', e);
    }
  }

  /**
   * Tự động chấm bài làm tự luận cho tất cả học sinh đã nộp trước đó khi giáo viên cập nhật đáp án / rubric
   */
  async autoGradeExistingSubmissions(question: QuestionEntity): Promise<number> {
    if (!question.quizId || question.type !== 'ESSAY') return 0;

    const rubric = question.essayRubric;
    const acceptedAnswers: string[] = [];
    if (Array.isArray(rubric?.acceptedAnswers)) {
      acceptedAnswers.push(
        ...rubric.acceptedAnswers
          .filter((a: any) => typeof a === 'string' && a.trim().length > 0)
          .map((a: string) => a.trim()),
      );
    }

    if (Array.isArray(question.options)) {
      const correctOpts = question.options.filter((o) => o.isCorrect && o.text?.trim().length > 0);
      for (const opt of correctOpts) {
        const trimmed = opt.text.trim();
        if (!acceptedAnswers.includes(trimmed)) {
          acceptedAnswers.push(trimmed);
        }
      }
    }

    const criteria = Array.isArray(rubric?.criteria)
      ? rubric.criteria.filter((c: any) => Array.isArray(c.keywords) && c.keywords.length > 0)
      : [];

    const hasTeacherAnswer = acceptedAnswers.length > 0 || criteria.length > 0;
    if (!hasTeacherAnswer) return 0;

    const submissions = await this.submissionRepo.find({ where: { quizId: question.quizId } });
    if (!submissions.length) return 0;

    const questionPoints = Number(question.points) || (Number(question.score) ? Math.round(Number(question.score) * 100) : 100);

    let gradedCount = 0;

    for (const sub of submissions) {
      if (!Array.isArray(sub.answers)) continue;

      let subUpdated = false;
      for (const ans of sub.answers) {
        if (ans.questionId === question.id) {
          // Chỉ tự động chấm nếu giáo viên chưa chấm thủ công cho câu này
          if (!ans.isManuallyGraded) {
            const studentText = (ans.essayText || '').trim();
            if (!studentText) {
              ans.scoreAwarded = 0;
              ans.isCorrect = false;
              subUpdated = true;
            } else {
              const gradeResult = gradeWithRubric(
                {
                  questionId: question.id,
                  submissionId: sub.id,
                  studentAnswer: studentText,
                  rubric: {
                    questionId: question.id,
                    acceptedAnswers,
                    criteria,
                    totalScore: questionPoints,
                  },
                },
                DEFAULT_GRADING_CONFIG,
              );

              const scoreAwarded = Math.min(questionPoints, Math.max(0, Math.round(gradeResult.score)));
              ans.scoreAwarded = scoreAwarded;
              ans.isCorrect = scoreAwarded > 0;
              subUpdated = true;
            }
          }
        }
      }

      if (subUpdated) {
        let totalRawScore = 0;
        for (const a of sub.answers) {
          totalRawScore += Number(a.scoreAwarded) || 0;
        }
        sub.correctCount = sub.answers.filter((a) => a.isCorrect === true).length;
        sub.wrongCount = sub.answers.filter((a) => a.isCorrect === false).length;
        sub.score = totalRawScore;
        const maxScore = sub.maxScore || 1000;
        sub.percentage = maxScore > 0 ? Number(((totalRawScore / maxScore) * 100).toFixed(1)) : 0;
        await this.submissionRepo.save(sub);
        gradedCount++;
      }
    }

    return gradedCount;
  }

  async parseDocxQuestions(fileBuffer: Buffer) {
    if (!fileBuffer) {
      throw new BadRequestException('File không hợp lệ hoặc rỗng');
    }

    try {
      const result = await mammoth.convertToHtml({ buffer: fileBuffer });
      const html = result.value;
      const $ = cheerio.load(html);

      const questions: any[] = [];
      let currentQuestion: any = null;

      $('p').each((_, el) => {
        const text = $(el).text().trim();

        if (!text) return;

        // Bắt đầu bằng Câu 1:, 1., Bài 1:
        const isQuestionMatch = text.match(/^(Câu\s*\d+|Bài\s*\d+|\d+)\s*[:\.]\s*(.*)/i);
        
        if (isQuestionMatch) {
          if (currentQuestion) {
            questions.push(currentQuestion);
          }
          
          currentQuestion = {
            id: `q-docx-${Date.now()}-${questions.length}`,
            content: isQuestionMatch[2].trim() || text,
            type: 'SINGLE_CHOICE',
            score: 2,
            explanation: '',
            options: [],
          };
        } else if (currentQuestion) {
          // Bắt đầu bằng A., B., C., D. hoặc A), B), C), D)
          const isOptionMatch = text.match(/^([A-Z])\s*[\.\)]\s*(.*)/i);
          
          if (isOptionMatch) {
            // Kiểm tra thẻ <strong> hoặc <b>
            const hasStrong = $(el).find('strong').length > 0 || $(el).find('b').length > 0;
            
            currentQuestion.options.push({
              id: `opt-docx-${Date.now()}-${currentQuestion.options.length}`,
              text: isOptionMatch[2].trim() || text,
              isCorrect: hasStrong,
            });
          } else if (currentQuestion.options.length === 0) {
            // Nội dung phụ của câu hỏi
            currentQuestion.content += '\n' + text;
          }
        }
      });

      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      // Xử lý type MULTIPLE_CHOICE nếu có nhiều đáp án đúng
      questions.forEach((q) => {
        const correctCount = q.options.filter((opt: any) => opt.isCorrect).length;
        if (correctCount > 1) {
          q.type = 'MULTIPLE_CHOICE';
        } else if (correctCount === 0 && q.options.length > 0) {
          // Mặc định chọn A nếu không có đáp án in đậm
          q.options[0].isCorrect = true;
        }
      });

      return questions;
    } catch (error) {
      throw new BadRequestException('Lỗi phân tích file DOCX. Vui lòng đảm bảo file đúng định dạng.');
    }
  }

  private async syncQuizStats(quizId: string) {
    if (!quizId) return;
    const quizQuestions = (await this.questionRepo.find({ where: { quizId } })) || [];
    const count = quizQuestions.length;
    const totalScore = quizQuestions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
    // Actually, we are asked to sync total score... let's just use the existing quizzesService.updateQuestionStats and maybe update points
    await this.quizzesService.updateQuestionStats(quizId, count, totalScore);
  }
}
