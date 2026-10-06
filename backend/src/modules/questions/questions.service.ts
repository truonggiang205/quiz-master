import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import crypto from 'crypto';
import { QuestionEntity, QuestionOption, SubmissionEntity } from '../../entities/index.js';
import { EssayRubricEntity } from '../grading/entities/essay-rubric.entity.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { SyncQuestionsDiffDto } from './dto/sync-questions-diff.dto.js';
import { SaveFromExamDto } from './dto/save-from-exam.dto.js';
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

    const pointsChanged = !hasSubmissions && (dto.score !== undefined || dto.points !== undefined);
    const saved = await this.questionRepo.save(question);
    if (pointsChanged) {
      await this.syncQuizStats(question.quizId);
    }

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

  async updateQuestionInQuiz(quizId: string, questionId: string, dto: UpdateQuestionDto) {
    const question = await this.questionRepo.findOneBy({ id: questionId });
    if (!question || question.quizId !== quizId) {
      throw new NotFoundException(`Không tìm thấy câu hỏi ${questionId} trong bài kiểm tra ${quizId}`);
    }
    return this.updateQuestion(questionId, dto);
  }

  async syncQuestionsDiff(quizId: string, dto: SyncQuestionsDiffDto, teacherId?: string) {
    const quiz = await this.quizzesService.getQuizById(quizId, 'TEACHER');
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra để đồng bộ câu hỏi');
    }

    const submissionsCount = await this.submissionRepo.count({ where: { quizId } });
    const hasSubmissions = submissionsCount > 0;

    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    let statsNeedSync = false;
    const essayQuestionsToGrade: QuestionEntity[] = [];

    await this.questionRepo.manager.transaction(async (manager) => {
      const qRepo = manager.getRepository(QuestionEntity);

      // 1. Xóa các câu hỏi bị lược bỏ (chỉ xóa khi chưa có học sinh nộp bài)
      if (dto.deletedIds && dto.deletedIds.length > 0) {
        if (!hasSubmissions) {
          const deleteRes = await qRepo.delete({ id: In(dto.deletedIds), quizId });
          deletedCount = deleteRes.affected || dto.deletedIds.length;
          statsNeedSync = true;
        }
      }

      // 2. Tạo mới các câu hỏi được thêm vào
      if (dto.created && dto.created.length > 0) {
        const existingCount = await qRepo.count({ where: { quizId } });
        const newEntities: QuestionEntity[] = [];

        for (let i = 0; i < dto.created.length; i++) {
          const cDto = dto.created[i];
          const optionsWithIds: QuestionOption[] = (cDto.options || []).map((opt, idx) => ({
            id: opt.id || `opt-${Date.now()}-${i}-${idx}`,
            text: opt.text,
            isCorrect: opt.isCorrect,
          }));

          let finalImageUrl = cDto.imageUrl;
          if (finalImageUrl && finalImageUrl.startsWith('data:image/')) {
            try {
              const folder = await this.getQuestionFolder(quizId);
              const uploadResult = await this.uploadService.uploadBase64(finalImageUrl, folder);
              finalImageUrl = uploadResult.secure_url || uploadResult.url;
            } catch (e) {
              console.error('Lỗi tải ảnh:', e);
            }
          }

          const entity = qRepo.create({
            id: `q-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
            quizId,
            content: cDto.content,
            imageUrl: finalImageUrl,
            type: cDto.type as any,
            options: optionsWithIds,
            essayRubric: cDto.essayRubric || null,
            score: cDto.score ?? 2.0,
            points: cDto.points !== undefined ? cDto.points : 0,
            isLocked: cDto.isLocked ?? false,
            subject: cDto.subject,
            explanation: cDto.explanation || '',
            order: cDto.order || existingCount + i + 1,
            teacherId: teacherId || quiz.teacherId,
          });
          newEntities.push(entity);
        }

        await qRepo.save(newEntities);
        createdCount = newEntities.length;
        statsNeedSync = true;
      }

      // 3. Cập nhật các câu hỏi có thay đổi (chỉ ghi đè trường thay đổi)
      if (dto.updated && dto.updated.length > 0) {
        const updateIds = dto.updated.map((u) => u.id);
        const existingQuestions = await qRepo.find({ where: { id: In(updateIds), quizId } });
        const updateMap = new Map(dto.updated.map((u) => [u.id, u.changes]));

        for (const q of existingQuestions) {
          const changes = updateMap.get(q.id);
          if (!changes) continue;

          if (!hasSubmissions) {
            if (changes.score !== undefined && changes.score !== q.score) {
              q.score = changes.score;
              statsNeedSync = true;
            }
            if (changes.points !== undefined && changes.points !== q.points) {
              q.points = changes.points;
              statsNeedSync = true;
            }
          }

          if (changes.options) {
            q.options = changes.options.map((opt, idx) => ({
              id: opt.id || `opt-${Date.now()}-${idx}`,
              text: opt.text,
              isCorrect: opt.isCorrect,
            }));
          }

          if (changes.content !== undefined) q.content = changes.content;
          if (changes.imageUrl !== undefined) q.imageUrl = changes.imageUrl;
          if (changes.type !== undefined) q.type = changes.type as any;
          if (changes.isLocked !== undefined) q.isLocked = changes.isLocked;
          if (changes.explanation !== undefined) q.explanation = changes.explanation;
          if (changes.order !== undefined) q.order = changes.order;
          if (changes.essayRubric !== undefined) q.essayRubric = changes.essayRubric;

          updatedCount++;
          if (q.type === 'ESSAY' && q.essayRubric) {
            essayQuestionsToGrade.push(q);
          }
        }

        if (existingQuestions.length > 0) {
          await qRepo.save(existingQuestions);
        }
      }
    });

    // 4. Đồng bộ tổng điểm & số câu của quiz duy nhất một lần ở cuối transaction
    if (statsNeedSync) {
      await this.syncQuizStats(quizId);
    }

    // 5. Tự động chấm tự luận nếu bài thi đã có bài nộp
    for (const eq of essayQuestionsToGrade) {
      await this.syncEssayRubricEntity(eq);
      if (hasSubmissions) {
        await this.autoGradeExistingSubmissions(eq);
      }
    }

    return {
      success: true,
      quizId,
      createdCount,
      updatedCount,
      deletedCount,
    };
  }

  async saveToBankFromExam(teacherId: string, dto: SaveFromExamDto) {
    const quiz = await this.quizzesService.getQuizById(dto.examId, 'TEACHER');
    if (!quiz) {
      throw new NotFoundException('Không tìm thấy bài kiểm tra nguồn');
    }
    if (quiz.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không sở hữu bài kiểm tra này');
    }

    const examQuestions = await this.questionRepo.find({
      where: { quizId: dto.examId, id: In(dto.questionIds) },
    });

    if (examQuestions.length === 0) {
      return { savedCount: 0, duplicateCount: 0, totalRequested: dto.questionIds.length };
    }

    const existingBank = await this.questionRepo.find({
      where: { teacherId, isBank: true },
    });

    const getHash = (content: string, type: string) => {
      const normalized = (content || '').trim().toLowerCase().replace(/\s+/g, ' ');
      return crypto.createHash('md5').update(`${normalized}::${type}`).digest('hex');
    };

    const existingHashes = new Set(existingBank.map((q) => getHash(q.content, q.type)));

    let savedCount = 0;
    let duplicateCount = 0;
    const questionsToInsert: QuestionEntity[] = [];

    const now = Date.now();
    for (let i = 0; i < examQuestions.length; i++) {
      const q = examQuestions[i];
      const hash = getHash(q.content, q.type);

      if (existingHashes.has(hash)) {
        duplicateCount++;
        continue;
      }

      existingHashes.add(hash);
      savedCount++;

      const cloned = this.questionRepo.create({
        id: `q-bank-${now}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        teacherId,
        isBank: true,
        quizId: undefined,
        content: q.content,
        imageUrl: q.imageUrl,
        type: q.type,
        options: JSON.parse(JSON.stringify(q.options || [])),
        essayRubric: q.essayRubric ? JSON.parse(JSON.stringify(q.essayRubric)) : null,
        score: q.score,
        points: q.points,
        explanation: q.explanation || '',
        order: 0,
        subject: dto.subject || quiz.subject || 'Chưa phân loại',
      });
      questionsToInsert.push(cloned);
    }

    if (questionsToInsert.length > 0) {
      await this.questionRepo.manager.transaction(async (manager) => {
        await manager.getRepository(QuestionEntity).save(questionsToInsert);
      });
    }

    return {
      savedCount,
      duplicateCount,
      totalRequested: dto.questionIds.length,
    };
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
