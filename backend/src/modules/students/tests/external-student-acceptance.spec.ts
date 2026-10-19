import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudentsService } from '../students.service.js';
import { ScheduleService } from '../../teaching/services/schedule.service.js';
import { TuitionService } from '../../teaching/services/tuition.service.js';
import { LearningLogsService } from '../../teaching/services/learning-logs.service.js';
import { ScoresService } from '../../teaching/services/scores.service.js';
import { ClassroomsService } from '../../classrooms/classrooms.service.js';

describe('External Student Acceptance & Integration Audit Suite (EXT-ACCEPT-01 -> EXT-ACCEPT-15)', () => {
  let studentStore: any[] = [];
  let userStore: any[] = [];
  let lessonStore: any[] = [];
  let participantStore: any[] = [];
  let tuitionStore: any[] = [];
  let adjustmentStore: any[] = [];
  let paymentStore: any[] = [];
  let logStore: any[] = [];
  let scoreStore: any[] = [];
  let classStore: any[] = [];

  let fakeTeacherStudentRepo: any;
  let fakeUserRepo: any;
  let fakeClassRepo: any;
  let fakeLessonRepo: any;
  let fakeParticipantRepo: any;
  let fakeTuitionRepo: any;
  let fakeAdjustmentRepo: any;
  let fakePaymentRepo: any;
  let fakeLogRepo: any;
  let fakeScoreRepo: any;
  let fakeDataSource: any;

  let studentsService: StudentsService;
  let scheduleService: ScheduleService;
  let tuitionService: TuitionService;
  let learningLogsService: LearningLogsService;
  let scoresService: ScoresService;
  let classroomsService: ClassroomsService;

  beforeEach(() => {
    // 2 Teachers, 2 Student Accounts, 1 Admin
    userStore = [
      { id: 'teacher-a', name: 'Giáo viên A (Thầy Long)', email: 'long@quizmaster.edu', role: 'TEACHER', isActive: true },
      { id: 'teacher-b', name: 'Giáo viên B (Cô Hoa)', email: 'hoa@quizmaster.edu', role: 'TEACHER', isActive: true },
      { id: 'student-account-a', name: 'Học sinh User A', email: 'student_a@quiz.vn', role: 'STUDENT', isActive: true },
      { id: 'student-account-b', name: 'Học sinh User B', email: 'student_b@quiz.vn', role: 'STUDENT', isActive: true },
      { id: 'admin-user', name: 'Hệ thống Quản trị', email: 'admin@quiz.vn', role: 'ADMIN', isActive: true },
      { id: 'teacher-account-c', name: 'Thầy Cường', email: 'cuong@quiz.vn', role: 'TEACHER', isActive: true },
    ];

    studentStore = [];
    lessonStore = [];
    participantStore = [];
    tuitionStore = [];
    adjustmentStore = [];
    paymentStore = [];
    logStore = [];
    scoreStore = [];
    classStore = [
      {
        id: 'class-teacher-a',
        name: 'Lớp Toán 11A',
        teacherId: 'teacher-a',
        students: [{ id: 'student-account-a', email: 'student_a@quiz.vn' }],
      },
    ];

    fakeTeacherStudentRepo = {
      create: (dto: any) => ({
        id: dto.id || `ts-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        status: 'ACTIVE',
        ...dto,
      }),
      save: async (entity: any) => {
        const idx = studentStore.findIndex((s) => s.id === entity.id);
        if (idx >= 0) {
          studentStore[idx] = { ...studentStore[idx], ...entity };
          return studentStore[idx];
        }
        studentStore.push({ ...entity });
        return entity;
      },
      find: async (opts?: any) => {
        let results = [...studentStore];
        if (opts?.where) {
          if (Array.isArray(opts.where)) {
            return studentStore.filter((s: any) => {
              return opts.where.some((w: any) => {
                if (w.id && s.id !== w.id) return false;
                if (w.teacherId && s.teacherId !== w.teacherId) return false;
                if (w.studentAccountId && s.studentAccountId !== w.studentAccountId) return false;
                return true;
              });
            });
          }
          if (opts.where.teacherId) results = results.filter((s) => s.teacherId === opts.where.teacherId);
          if (opts.where.studentAccountId) results = results.filter((s) => s.studentAccountId === opts.where.studentAccountId);
        }
        return results;
      },
      findOne: async (opts?: any) => {
        if (Array.isArray(opts?.where)) {
          for (const w of opts.where) {
            const found = studentStore.find((s: any) => {
              if (w.id && s.id !== w.id) return false;
              if (w.teacherId && s.teacherId !== w.teacherId) return false;
              if (w.studentAccountId && s.studentAccountId !== w.studentAccountId) return false;
              return true;
            });
            if (found) return found;
          }
          return null;
        }
        const list = await fakeTeacherStudentRepo.find(opts);
        if (opts?.where?.id) {
          return list.find((s: any) => s.id === opts.where.id) || null;
        }
        return list[0] || null;
      },
      remove: async (entity: any) => {
        const idx = studentStore.findIndex((s) => s.id === entity.id);
        if (idx >= 0) studentStore.splice(idx, 1);
        return entity;
      },
      count: async (opts?: any) => (await fakeTeacherStudentRepo.find(opts)).length,
    };

    fakeUserRepo = {
      find: async () => [...userStore],
      findOne: async (opts?: any) => {
        if (Array.isArray(opts?.where)) {
          for (const w of opts.where) {
            if (w.email) {
              const f = userStore.find((u) => u.email === w.email);
              if (f) return f;
            }
            if (w.id) {
              const f = userStore.find((u) => u.id === w.id);
              if (f) return f;
            }
          }
          return null;
        }
        if (opts?.where?.id) return userStore.find((u) => u.id === opts.where.id) || null;
        if (opts?.where?.email) return userStore.find((u) => u.email === opts.where.email) || null;
        return userStore[0] || null;
      },
      findOneBy: async (where: any) => {
        if (where.id) return userStore.find((u) => u.id === where.id) || null;
        if (where.email) return userStore.find((u) => u.email === where.email) || null;
        return null;
      },
      create: (dto: any) => ({ ...dto }),
      save: async (entity: any) => {
        const idx = userStore.findIndex((u) => u.id === entity.id);
        if (idx >= 0) userStore[idx] = { ...userStore[idx], ...entity };
        else userStore.push(entity);
        return entity;
      },
    };

    fakeClassRepo = {
      find: async (opts?: any) => {
        if (opts?.where?.teacherId) return classStore.filter((c) => c.teacherId === opts.where.teacherId);
        return [...classStore];
      },
      findOne: async (opts?: any) => {
        if (opts?.where?.id) return classStore.find((c) => c.id === opts.where.id) || null;
        return null;
      },
      create: (dto: any) => ({ ...dto }),
      save: async (entity: any) => {
        const idx = classStore.findIndex((c) => c.id === entity.id);
        if (idx >= 0) classStore[idx] = entity;
        else classStore.push(entity);
        return entity;
      },
    };

    fakeLessonRepo = {
      find: async (opts?: any) => {
        let res = [...lessonStore];
        if (opts?.where?.teacherId) res = res.filter((l) => l.teacherId === opts.where.teacherId);
        return res;
      },
      findOne: async (opts?: any) => {
        if (opts?.where?.id) {
          const found = lessonStore.find((l) => l.id === opts.where.id);
          if (found) {
            return {
              ...found,
              participants: participantStore.filter((p) => p.lessonId === found.id),
            };
          }
          return null;
        }
        return lessonStore[0] || null;
      },
      create: (dto: any) => ({ id: `lesson-${Date.now()}`, ...dto }),
      save: async (entity: any) => {
        const idx = lessonStore.findIndex((l) => l.id === entity.id);
        if (idx >= 0) lessonStore[idx] = entity;
        else lessonStore.push(entity);
        return entity;
      },
      count: async () => lessonStore.length,
    };

    fakeParticipantRepo = {
      find: async (opts?: any) => {
        let res = [...participantStore];
        if (opts?.where?.studentId) {
          const sId = opts.where.studentId;
          if (sId && typeof sId === 'object' && ('_value' in sId || 'value' in sId || sId._type === 'in')) {
            const arr = sId._value || sId.value || [];
            res = res.filter((p) => arr.includes(p.studentId));
          } else {
            res = res.filter((p) => p.studentId === sId);
          }
        }
        if (opts?.where?.lessonId) {
          const lId = opts.where.lessonId;
          if (lId && typeof lId === 'object' && ('_value' in lId || 'value' in lId || lId._type === 'in')) {
            const arr = lId._value || lId.value || [];
            res = res.filter((p) => arr.includes(p.lessonId));
          } else {
            res = res.filter((p) => p.lessonId === lId);
          }
        }
        return res;
      },
      findOne: async (opts?: any) => {
        if (opts?.where?.id) return participantStore.find((p) => p.id === opts.where.id) || null;
        return participantStore[0] || null;
      },
      create: (dto: any) => ({ id: `part-${Date.now()}`, ...dto }),
      save: async (entity: any) => {
        const idx = participantStore.findIndex((p) => p.id === entity.id);
        if (idx >= 0) participantStore[idx] = entity;
        else participantStore.push(entity);
        return entity;
      },
      count: async (opts?: any) => (await fakeParticipantRepo.find(opts)).length,
    };

    const matchIn = (fieldVal: any, filterVal: any) => {
      if (filterVal === undefined) return true;
      if (filterVal && typeof filterVal === 'object' && ('_value' in filterVal || 'value' in filterVal || filterVal._type === 'in')) {
        const arr = filterVal._value || filterVal.value || [];
        return arr.includes(fieldVal);
      }
      return fieldVal === filterVal;
    };

    fakeTuitionRepo = {
      find: async (opts?: any) => {
        let res = [...tuitionStore];
        if (opts?.where?.teacherId) res = res.filter((t) => t.teacherId === opts.where.teacherId);
        if (opts?.where?.studentId) res = res.filter((t) => matchIn(t.studentId, opts.where.studentId));
        return res;
      },
      findOne: async (opts?: any) => {
        if (opts?.where?.id) return tuitionStore.find((t) => t.id === opts.where.id) || null;
        if (opts?.where?.studentId) return tuitionStore.find((t) => matchIn(t.studentId, opts.where.studentId)) || null;
        return tuitionStore[0] || null;
      },
      create: (dto: any) => ({ id: `tuition-${Date.now()}`, ...dto }),
      save: async (entity: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === entity.id);
        if (idx >= 0) tuitionStore[idx] = entity;
        else tuitionStore.push(entity);
        return entity;
      },
      count: async (opts?: any) => (await fakeTuitionRepo.find(opts)).length,
    };

    fakeAdjustmentRepo = {
      find: async (opts?: any) => {
        if (opts?.where?.tuitionItemId) {
          return adjustmentStore.filter((a) => a.tuitionItemId === opts.where.tuitionItemId);
        }
        return [...adjustmentStore];
      },
      create: (dto: any) => ({ id: `adj-${Date.now()}`, ...dto }),
      save: async (entity: any) => {
        adjustmentStore.push(entity);
        return entity;
      },
      count: async (opts?: any) => (await fakeAdjustmentRepo.find(opts)).length,
    };

    fakePaymentRepo = {
      find: async (opts?: any) => {
        let res = [...paymentStore];
        if (opts?.where?.teacherId) res = res.filter((p) => p.teacherId === opts.where.teacherId);
        if (opts?.where?.studentId) res = res.filter((p) => matchIn(p.studentId, opts.where.studentId));
        if (opts?.where?.tuitionItemId) res = res.filter((p) => p.tuitionItemId === opts.where.tuitionItemId);
        return res;
      },
      create: (dto: any) => ({ id: `pay-${Date.now()}`, ...dto }),
      save: async (entity: any) => {
        paymentStore.push(entity);
        return entity;
      },
      count: async (opts?: any) => (await fakePaymentRepo.find(opts)).length,
    };

    fakeLogRepo = {
      find: async (opts?: any) => {
        let res = [...logStore];
        if (opts?.where?.teacherId) res = res.filter((l) => l.teacherId === opts.where.teacherId);
        if (opts?.where?.studentId) res = res.filter((l) => matchIn(l.studentId, opts.where.studentId));
        return res;
      },
      findOne: async (opts?: any) => {
        if (opts?.where?.id) return logStore.find((l) => l.id === opts.where.id) || null;
        return logStore[0] || null;
      },
      create: (dto: any) => ({ id: `log-${Date.now()}`, ...dto }),
      save: async (entity: any) => {
        const idx = logStore.findIndex((l) => l.id === entity.id);
        if (idx >= 0) logStore[idx] = entity;
        else logStore.push(entity);
        return entity;
      },
      count: async (opts?: any) => (await fakeLogRepo.find(opts)).length,
    };

    fakeScoreRepo = {
      find: async (opts?: any) => {
        let res = [...scoreStore];
        if (opts?.where?.teacherId) res = res.filter((s) => s.teacherId === opts.where.teacherId);
        if (opts?.where?.studentId) res = res.filter((s) => matchIn(s.studentId, opts.where.studentId));
        return res;
      },
      findOne: async (opts?: any) => {
        if (opts?.where?.id) return scoreStore.find((s) => s.id === opts.where.id) || null;
        return scoreStore[0] || null;
      },
      create: (dto: any) => ({ id: `score-${Date.now()}`, ...dto }),
      save: async (entity: any) => {
        const idx = scoreStore.findIndex((s) => s.id === entity.id);
        if (idx >= 0) scoreStore[idx] = entity;
        else scoreStore.push(entity);
        return entity;
      },
      count: async (opts?: any) => (await fakeScoreRepo.find(opts)).length,
    };

    fakeDataSource = {
      transaction: async (cb: any) => {
        const manager = {
          findOne: async (entityClass: any, opts: any) => {
            if (opts?.where?.id) {
              const t = tuitionStore.find((t) => t.id === opts.where.id);
              if (t) return t;
              const l = lessonStore.find((l) => l.id === opts.where.id);
              if (l) return l;
            }
            return null;
          },
          create: (entityClass: any, dto: any) => ({ ...dto }),
          save: async (entityClass: any, data?: any) => {
            const target = data !== undefined ? data : entityClass;
            if (Array.isArray(target)) {
              for (const item of target) {
                if (item.lessonId) participantStore.push(item);
              }
              return target;
            }
            if (target.paymentDate) {
              paymentStore.push(target);
            } else if (target.month) {
              const idx = tuitionStore.findIndex((t) => t.id === target.id);
              if (idx >= 0) tuitionStore[idx] = target;
              else tuitionStore.push(target);
            } else if (target.startTime && target.endTime) {
              lessonStore.push(target);
            } else if (target.lessonId) {
              participantStore.push(target);
            }
            return target;
          },
          getRepository: (entityClass: any) => {
            if (entityClass?.name?.includes('Adjustment') || entityClass?.toString().includes('Adjustment')) {
              return fakeAdjustmentRepo;
            }
            if (entityClass?.name?.includes('Payment') || entityClass?.toString().includes('Payment')) {
              return fakePaymentRepo;
            }
            return fakeTuitionRepo;
          },
        };
        return await cb(manager);
      },
    };

    studentsService = new StudentsService(
      fakeTeacherStudentRepo,
      fakeUserRepo,
      fakeClassRepo,
      fakeLessonRepo,
      fakeParticipantRepo,
      fakeLogRepo,
      fakeScoreRepo,
      fakeTuitionRepo,
      fakePaymentRepo,
      { sendMail: async () => true } as any,
      { sendNotification: async () => true } as any,
    );

    scheduleService = new ScheduleService(
      fakeLessonRepo,
      fakeParticipantRepo,
      fakeClassRepo,
      fakeUserRepo,
      fakeTuitionRepo,
      { syncTuitionData: async () => {} } as any,
      fakeDataSource,
      fakeTeacherStudentRepo,
    );

    tuitionService = new TuitionService(
      fakeTuitionRepo,
      fakeAdjustmentRepo,
      fakePaymentRepo,
      fakeLessonRepo,
      fakeParticipantRepo,
      fakeClassRepo,
      fakeUserRepo,
      fakeDataSource,
      fakeTeacherStudentRepo,
    );

    learningLogsService = new LearningLogsService(
      fakeLogRepo,
      fakeLessonRepo,
      fakeClassRepo,
      fakeUserRepo,
      fakeTeacherStudentRepo,
    );

    scoresService = new ScoresService(
      fakeScoreRepo,
      fakeClassRepo,
      fakeUserRepo,
      fakeLessonRepo,
      fakeTeacherStudentRepo,
    );

    classroomsService = new ClassroomsService(
      fakeClassRepo,
      fakeUserRepo,
      {} as any,
      {} as any,
      fakeTeacherStudentRepo,
    );
  });

  // EXT-ACCEPT-01: Create External Student
  it('EXT-ACCEPT-01: Teacher A tạo External Student A thành công, không tạo UserEntity, không cần password', async () => {
    const userCountBefore = userStore.length;

    const studentA = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Ngoài Hệ Thống A',
      phone: '0911222333',
      parentName: 'Phụ huynh A',
      parentPhone: '0988777666',
      dob: '2010-01-01',
      gender: 'MALE',
      school: 'THCS Lê Lợi',
      note: 'Học sinh học kèm môn Toán lớp 9',
    });

    expect(studentA).toBeDefined();
    expect(studentA.fullName).toBe('Học Sinh Ngoài Hệ Thống A');
    expect(studentA.studentAccountId).toBeNull();
    expect(studentA.isExternal).toBe(true);
    expect(studentA.status).toBe('ACTIVE');

    // Database check: Không tạo user mới
    expect(userStore.length).toBe(userCountBefore);
  });

  // EXT-ACCEPT-02: List External Student
  it('EXT-ACCEPT-02: Danh sách học sinh của Teacher A hiển thị rõ nhãn isExternal, không crash khi email/avatar null', async () => {
    // External student with null email & avatar
    await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Không Có Email',
    });

    // Linked student with account
    await fakeTeacherStudentRepo.save({
      id: 'ts-linked-1',
      teacherId: 'teacher-a',
      fullName: 'Học Sinh Đã Có Tài Khoản',
      studentAccountId: 'student-account-a',
      status: 'ACTIVE',
    });

    const list = await studentsService.getTeacherStudents('teacher-a');
    expect(list.length).toBe(2);

    const ext = list.find((s) => s.fullName === 'Học Sinh Không Có Email');
    expect(ext).toBeDefined();
    expect(ext?.isExternal).toBe(true);
    expect(ext?.email).toBeNull();
    expect(ext?.avatar).toBeNull();

    const linked = list.find((s) => s.fullName === 'Học Sinh Đã Có Tài Khoản');
    expect(linked).toBeDefined();
    expect(linked?.isExternal).toBe(false);
    expect(linked?.studentAccountId).toBe('student-account-a');
  });

  // EXT-ACCEPT-03: Student Detail
  it('EXT-ACCEPT-03: Chi tiết học sinh tổng hợp đầy đủ thông tin, KPI và các khối lịch sử mà không bị crash', async () => {
    const ext = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Test Detail',
      phone: '0944555666',
    });

    const detail = (await studentsService.getStudentDetail('teacher-a', ext.id)) as any;

    expect(detail).toBeDefined();
    expect(detail.student.id).toBe(ext.id);
    expect(detail.student.fullName).toBe('Học Sinh Test Detail');

    // Stats / Summary checks
    const summary = detail.summary || detail.stats;
    expect(summary).toBeDefined();
    expect(summary.totalLessons).toBe(0);
    expect(summary.attendedLessons).toBe(0);
    expect(summary.totalTuition).toBe(0);

    // Arrays checks
    const schedules = detail.schedules || detail.lessons;
    expect(Array.isArray(schedules)).toBe(true);
    expect(Array.isArray(detail.learningLogs)).toBe(true);
    expect(Array.isArray(detail.scores)).toBe(true);
    const tuitions = detail.tuitions || detail.tuition;
    expect(Array.isArray(tuitions)).toBe(true);
    expect(Array.isArray(detail.payments)).toBe(true);
  });

  // EXT-ACCEPT-04: Create Schedule
  it('EXT-ACCEPT-04: Teacher A tạo buổi học cho External Student A mà không yêu cầu tài khoản User', async () => {
    const ext = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Lên Lịch',
    });

    const created = (await scheduleService.createLesson('teacher-a', {
      classId: `private-${ext.id}`,
      date: '2026-10-30',
      startTime: '18:00',
      endTime: '19:30',
      title: 'Kèm Toán 1-1 Buổi 1',
      feePerLesson: 200000,
      studentIds: [ext.id],
    })) as any;

    const lesson = Array.isArray(created) ? created[0] : created;
    expect(lesson).toBeDefined();
    expect(lesson.teacherId).toBe('teacher-a');
    expect(participantStore.some((p) => p.studentId === ext.id)).toBe(true);
  });

  // EXT-ACCEPT-05: Attendance
  it('EXT-ACCEPT-05: Ghi nhận điểm danh cho External Student (ATTENDED, ABSENT, EXCUSED)', async () => {
    const ext = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Điểm Danh',
    });

    const created = (await scheduleService.createLesson('teacher-a', {
      classId: `private-${ext.id}`,
      date: '2026-10-31',
      startTime: '10:00',
      endTime: '11:30',
      title: 'Buổi học kiểm tra điểm danh',
      studentIds: [ext.id],
    })) as any;
    const lesson = Array.isArray(created) ? created[0] : created;

    // Test ATTENDED
    await scheduleService.updateLesson('teacher-a', lesson.id, {
      participants: [{ studentId: ext.id, attendanceStatus: 'ATTENDED' }],
    });
    let part = participantStore.find((p) => p.lessonId === lesson.id && p.studentId === ext.id);
    expect(part?.attendanceStatus).toBe('ATTENDED');

    // Test ABSENT
    await scheduleService.updateLesson('teacher-a', lesson.id, {
      participants: [{ studentId: ext.id, attendanceStatus: 'ABSENT' }],
    });
    part = participantStore.find((p) => p.lessonId === lesson.id && p.studentId === ext.id);
    expect(part?.attendanceStatus).toBe('ABSENT');

    // Test EXCUSED
    await scheduleService.updateLesson('teacher-a', lesson.id, {
      participants: [{ studentId: ext.id, attendanceStatus: 'EXCUSED' }],
    });
    part = participantStore.find((p) => p.lessonId === lesson.id && p.studentId === ext.id);
    expect(part?.attendanceStatus).toBe('EXCUSED');
  });

  // EXT-ACCEPT-06: Learning Log
  it('EXT-ACCEPT-06: Teacher A tạo nhật ký học tập cho External Student A thành công', async () => {
    const ext = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Nhật Ký A',
    });

    lessonStore.push({
      id: 'lesson-log-acc-1',
      teacherId: 'teacher-a',
      classId: `private-${ext.id}`,
      date: '2026-11-01',
    });

    const log = await learningLogsService.createOrUpdateLog('teacher-a', {
      lessonId: 'lesson-log-acc-1',
      studentId: ext.id,
      content: 'Chương 1 Đạo hàm và Khảo sát đồ thị',
      homework: 'Bài 1 đến bài 5',
      attitude: 'Tập trung cao độ',
      comment: 'Tiếp thu nhanh',
    });

    expect(log).toBeDefined();
    expect(log.studentId).toBe(ext.id);
    expect(log.content).toBe('Chương 1 Đạo hàm và Khảo sát đồ thị');
  });

  // EXT-ACCEPT-07: Score
  it('EXT-ACCEPT-07: Teacher A nhập điểm số các loại (15p, 1 tiết, giữa kỳ) cho External Student A', async () => {
    const ext = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Điểm Số A',
    });

    const score15 = await scoresService.createScore('teacher-a', {
      classId: `private-${ext.id}`,
      studentId: ext.id,
      assessmentType: 'QUIZ',
      assessmentName: 'Kiểm tra 15 phút',
      score: 8.5,
      date: '2026-11-02',
    });
    expect(score15.score).toBe(8.5);

    const scoreMidterm = await scoresService.createScore('teacher-a', {
      classId: `private-${ext.id}`,
      studentId: ext.id,
      assessmentType: 'MIDTERM',
      assessmentName: 'Kiểm tra giữa kỳ',
      score: 9.0,
      date: '2026-11-05',
    });
    expect(scoreMidterm.score).toBe(9.0);
  });

  // EXT-ACCEPT-08: Tuition
  it('EXT-ACCEPT-08: Đồng bộ và tính toán học phí chính xác cho External Student theo số buổi học', async () => {
    const ext = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Học Phí A',
    });

    // 2 Buổi tham gia (150,000 / buổi) và 1 buổi vắng mặt (không tính tiền)
    lessonStore.push(
      {
        id: 'l-tui-1',
        teacherId: 'teacher-a',
        classId: `private-${ext.id}`,
        date: '2026-11-10',
        feePerLesson: 150000,
        duration: 1.5,
        status: 'SCHEDULED',
      },
      {
        id: 'l-tui-2',
        teacherId: 'teacher-a',
        classId: `private-${ext.id}`,
        date: '2026-11-15',
        feePerLesson: 150000,
        duration: 1.5,
        status: 'SCHEDULED',
      },
      {
        id: 'l-tui-3',
        teacherId: 'teacher-a',
        classId: `private-${ext.id}`,
        date: '2026-11-20',
        feePerLesson: 150000,
        duration: 1.5,
        status: 'SCHEDULED',
      },
    );

    participantStore.push(
      { id: 'p-tui-1', lessonId: 'l-tui-1', studentId: ext.id, attendanceStatus: 'ATTENDED', feeAmount: 150000 },
      { id: 'p-tui-2', lessonId: 'l-tui-2', studentId: ext.id, attendanceStatus: 'ATTENDED', feeAmount: 150000 },
      { id: 'p-tui-3', lessonId: 'l-tui-3', studentId: ext.id, attendanceStatus: 'ABSENT', feeAmount: 150000 },
    );

    await tuitionService.syncTuitionData('teacher-a', '2026-11');

    const tuition = tuitionStore.find((t) => t.studentId === ext.id && t.month === '2026-11');
    expect(tuition).toBeDefined();
    // 2 buổi ATTENDED = 300,000 đ
    expect(tuition.baseAmount).toBe(300000);
    expect(tuition.totalAmount).toBe(300000);
    expect(tuition.remainingAmount).toBe(300000);
    expect(tuition.status).toBe('UNPAID');
  });

  // EXT-ACCEPT-09: Payment
  it('EXT-ACCEPT-09: Ghi nhận thanh toán học phí cho External Student, chặn overpayment và bảo vệ số dư', async () => {
    const ext = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Thanh Toán A',
    });

    const tuitionItem = {
      id: 'tui-pay-1',
      teacherId: 'teacher-a',
      classId: `private-${ext.id}`,
      studentId: ext.id,
      month: '2026-11',
      baseAmount: 300000,
      discountAmount: 0,
      surchargeAmount: 0,
      totalAmount: 300000,
      paidAmount: 0,
      remainingAmount: 300000,
      status: 'UNPAID',
    };
    tuitionStore.push(tuitionItem);

    // Overpayment check
    await expect(
      tuitionService.recordPayment('teacher-a', 'tui-pay-1', {
        amount: 350000, // vượt quá 300,000
        paymentDate: '2026-11-22',
        paymentMethod: 'CASH',
      }),
    ).rejects.toThrow(BadRequestException);

    // Thanh toán hợp lệ 1 phần
    const payment1 = await tuitionService.recordPayment('teacher-a', 'tui-pay-1', {
      amount: 200000,
      paymentDate: '2026-11-22',
      paymentMethod: 'CASH',
    });
    expect(payment1.paidAmount).toBe(200000);
    expect(payment1.remainingAmount).toBe(100000);
    expect(payment1.status).toBe('PARTIALLY_PAID');

    // Thanh toán nốt số tiền còn lại
    const payment2 = await tuitionService.recordPayment('teacher-a', 'tui-pay-1', {
      amount: 100000,
      paymentDate: '2026-11-23',
      paymentMethod: 'BANK_TRANSFER',
    });
    expect(payment2.paidAmount).toBe(300000);
    expect(payment2.remainingAmount).toBe(0);
    expect(payment2.status).toBe('PAID');
  });

  // EXT-ACCEPT-10: Adjustment
  it('EXT-ACCEPT-10: Áp dụng điều chỉnh học phí (phụ thu & giảm trừ) cho External Student an toàn', async () => {
    const ext = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Điều Chỉnh A',
    });

    const tuitionItem = {
      id: 'tui-adj-1',
      teacherId: 'teacher-a',
      classId: `private-${ext.id}`,
      studentId: ext.id,
      month: '2026-11',
      baseAmount: 500000,
      surcharge: 0,
      discount: 0,
      totalAmount: 500000,
      paidAmount: 200000,
      remainingAmount: 300000,
      status: 'PARTIALLY_PAID',
    };
    tuitionStore.push(tuitionItem);
    paymentStore.push({
      id: 'pay-adj-hist',
      tuitionItemId: 'tui-adj-1',
      teacherId: 'teacher-a',
      studentId: ext.id,
      amount: 200000,
      paymentDate: '2026-11-20',
      status: 'COMPLETED',
    });

    // Giảm trừ vượt quá khiến tổng học phí thấp hơn số tiền đã trả -> Bị từ chối
    await expect(
      tuitionService.addAdjustment('teacher-a', 'tui-adj-1', {
        type: 'DISCOUNT',
        amount: 350000, // 500k - 350k = 150k < 200k đã trả
        reason: 'Giảm trừ quá mức',
      }),
    ).rejects.toThrow(BadRequestException);

    // Phụ thu hợp lệ
    await tuitionService.addAdjustment('teacher-a', 'tui-adj-1', {
      type: 'SURCHARGE',
      amount: 50000,
      reason: 'Tài liệu học tập chuyên đề',
    });
    expect(adjustmentStore.some((a) => a.type === 'SURCHARGE' && a.amount === 50000)).toBe(true);
  });

  // EXT-ACCEPT-11: Link
  it('EXT-ACCEPT-11: Liên kết External Student A với Student Account A; giữ nguyên toàn bộ lịch sử', async () => {
    const ext = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Chuẩn Bị Link A',
    });
    const originalProfileId = ext.id;

    // Giả sử đã có lịch học và học phí gắn với originalProfileId
    lessonStore.push({ id: 'l-hist-1', teacherId: 'teacher-a', date: '2026-10-01' });
    participantStore.push({ id: 'p-hist-1', lessonId: 'l-hist-1', studentId: originalProfileId });
    tuitionStore.push({ id: 't-hist-1', teacherId: 'teacher-a', studentId: originalProfileId, totalAmount: 400000 });

    const linked = await studentsService.linkAccount('teacher-a', originalProfileId, {
      emailOrAccountId: 'student_a@quiz.vn',
    });

    expect(linked.id).toBe(originalProfileId);
    expect(linked.studentAccountId).toBe('student-account-a');
    expect(linked.isExternal).toBe(false);

    // Toàn bộ lịch sử vẫn gắn với originalProfileId
    expect(participantStore[0].studentId).toBe(originalProfileId);
    expect(tuitionStore[0].studentId).toBe(originalProfileId);
  });

  // EXT-ACCEPT-12: Link Invalid Account
  it('EXT-ACCEPT-12: Từ chối liên kết tài khoản không hợp lệ (ADMIN, TEACHER, hoặc tài khoản đã liên kết)', async () => {
    const ext1 = await studentsService.createExternalStudent('teacher-a', { fullName: 'Học Sinh 1' });
    const ext2 = await studentsService.createExternalStudent('teacher-a', { fullName: 'Học Sinh 2' });

    // Cố link với ADMIN
    await expect(
      studentsService.linkAccount('teacher-a', ext1.id, { emailOrAccountId: 'admin@quiz.vn' }),
    ).rejects.toThrow(BadRequestException);

    // Cố link với TEACHER
    await expect(
      studentsService.linkAccount('teacher-a', ext1.id, { emailOrAccountId: 'cuong@quiz.vn' }),
    ).rejects.toThrow(BadRequestException);

    // Link ext1 với student_a@quiz.vn -> thành công
    await studentsService.linkAccount('teacher-a', ext1.id, { emailOrAccountId: 'student_a@quiz.vn' });

    // ext2 cố link trùng với student_a@quiz.vn -> bị từ chối
    await expect(
      studentsService.linkAccount('teacher-a', ext2.id, { emailOrAccountId: 'student_a@quiz.vn' }),
    ).rejects.toThrow(BadRequestException);
  });

  // EXT-ACCEPT-13: Unlink
  it('EXT-ACCEPT-13: Hủy liên kết tài khoản chuyển về External Student; toàn bộ lịch sử giữ nguyên 100%', async () => {
    const ext = await studentsService.createExternalStudent('teacher-a', { fullName: 'Học Sinh Test Unlink' });
    await studentsService.linkAccount('teacher-a', ext.id, { emailOrAccountId: 'student_b@quiz.vn' });

    const unlinked = await studentsService.unlinkAccount('teacher-a', ext.id);
    expect(unlinked.id).toBe(ext.id);
    expect(unlinked.studentAccountId).toBeNull();
    expect(unlinked.isExternal).toBe(true);
  });

  // EXT-ACCEPT-14: IDOR Protection
  it('EXT-ACCEPT-14: Chống IDOR tuyệt đối — Teacher A không được xem, sửa, xóa, hoặc thao tác trên học sinh của Teacher B', async () => {
    const extB = await studentsService.createExternalStudent('teacher-b', {
      fullName: 'Học Sinh Của Cô Hoa (Teacher B)',
    });

    // 1. Teacher A cố lấy chi tiết học sinh của Teacher B -> Bị từ chối
    await expect(studentsService.getStudentDetail('teacher-a', extB.id)).rejects.toThrow();

    // 2. Teacher A cố sửa học sinh của Teacher B -> Bị từ chối
    await expect(
      studentsService.updateStudent('teacher-a', extB.id, { fullName: 'Cố ý đổi tên' }),
    ).rejects.toThrow();

    // 3. Teacher A cố xóa học sinh của Teacher B -> Bị từ chối
    await expect(studentsService.deleteStudent('teacher-a', extB.id)).rejects.toThrow();

    // 4. Teacher A cố link account học sinh của Teacher B -> Bị từ chối
    await expect(
      studentsService.linkAccount('teacher-a', extB.id, { emailOrAccountId: 'student_a@quiz.vn' }),
    ).rejects.toThrow();

    // 5. Teacher A cố unlink account học sinh của Teacher B -> Bị từ chối
    await expect(studentsService.unlinkAccount('teacher-a', extB.id)).rejects.toThrow();
  });

  // EXT-ACCEPT-15: Legacy Compatibility
  it('EXT-ACCEPT-15: Tương thích hoàn hảo với học sinh legacy và import Excel không tạo fake User', async () => {
    // 1. Excel import không tạo fake user với password 123456
    const userCountBefore = userStore.length;
    const importResult = await classroomsService.importStudents(
      'class-teacher-a',
      'teacher-a',
      undefined,
      [{ name: 'Học Sinh Mới Từ File', email: 'file_student@gmail.com' }],
    );

    expect(importResult.successCount).toBe(1);
    expect(userStore.length).toBe(userCountBefore); // Không tạo User
    const createdProfile = studentStore.find((s) => s.fullName === 'Học Sinh Mới Từ File');
    expect(createdProfile).toBeDefined();
    expect(createdProfile.studentAccountId).toBeNull();

    // 2. Legacy student mapping
    await fakeTeacherStudentRepo.save({
      id: 'ts-legacy-test',
      teacherId: 'teacher-a',
      fullName: 'Em Nam Cũ',
      studentAccountId: 'student-account-a',
      status: 'ACTIVE',
    });

    const resolved = await studentsService.resolveStudent('teacher-a', 'student-account-a');
    expect(resolved).toBeDefined();
    expect(resolved.id).toBe('ts-legacy-test');
    expect(resolved.fullName).toBe('Em Nam Cũ');
  });

  // EXT-ACCEPT-16: Historical Data Protection on Delete
  it('EXT-ACCEPT-16: Chống xóa vĩnh viễn (hard delete) khi học sinh đã có dữ liệu lịch sử (học phí/buổi học/điểm số)', async () => {
    // 1. Học sinh chưa có lịch sử -> Cho phép xóa
    const extFresh = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Mới Chưa Học',
    });
    const deleteFresh = await studentsService.deleteStudent('teacher-a', extFresh.id);
    expect(deleteFresh.success).toBe(true);
    expect(studentStore.some((s) => s.id === extFresh.id)).toBe(false);

    // 2. Học sinh đã có học phí / lịch sử học -> Bị từ chối hard delete, yêu cầu deactivate (INACTIVE)
    const extWithHistory = await studentsService.createExternalStudent('teacher-a', {
      fullName: 'Học Sinh Đã Có Lịch Sử',
    });
    tuitionStore.push({
      id: 'tui-hist-del-1',
      teacherId: 'teacher-a',
      studentId: extWithHistory.id,
      month: '2026-11',
      totalAmount: 300000,
    });

    await expect(
      studentsService.deleteStudent('teacher-a', extWithHistory.id),
    ).rejects.toThrow(BadRequestException);

    // Dữ liệu học sinh và học phí vẫn còn nguyên
    expect(studentStore.some((s) => s.id === extWithHistory.id)).toBe(true);
    expect(tuitionStore.some((t) => t.studentId === extWithHistory.id)).toBe(true);

    // Chuyển sang NGHỈ HỌC (INACTIVE) thành công
    const updated = await studentsService.updateStudent('teacher-a', extWithHistory.id, {
      status: 'INACTIVE',
    });
    expect(updated.status).toBe('INACTIVE');
  });
});
