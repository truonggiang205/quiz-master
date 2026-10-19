import { describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudentsService } from '../students.service.js';
import { ScheduleService } from '../../teaching/services/schedule.service.js';
import { TuitionService } from '../../teaching/services/tuition.service.js';
import { LearningLogsService } from '../../teaching/services/learning-logs.service.js';
import { ScoresService } from '../../teaching/services/scores.service.js';
import { ClassroomsService } from '../../classrooms/classrooms.service.js';

describe('External Student Domain Model & Safety Verification (EXT-STU-01 -> EXT-STU-20)', () => {
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
    studentStore = [];
    userStore = [
      { id: 'teacher-1', name: 'Thầy Hùng', email: 'hung@school.edu', role: 'TEACHER', isActive: true },
      { id: 'teacher-2', name: 'Cô Mai', email: 'mai@school.edu', role: 'TEACHER', isActive: true },
      { id: 'student-user-1', name: 'Em Nam', email: 'nam@quiz.vn', role: 'STUDENT', isActive: true },
      { id: 'admin-user', name: 'Admin Hệ Thống', email: 'admin@quiz.vn', role: 'ADMIN', isActive: true },
      { id: 'teacher-user-3', name: 'Thầy Tuấn', email: 'tuan@quiz.vn', role: 'TEACHER', isActive: true },
    ];
    lessonStore = [];
    participantStore = [];
    tuitionStore = [];
    adjustmentStore = [];
    paymentStore = [];
    logStore = [];
    scoreStore = [];
    classStore = [
      {
        id: 'class-1',
        name: 'Lớp Toán 10A1',
        teacherId: 'teacher-1',
        students: [{ id: 'student-user-1', email: 'nam@quiz.vn' }],
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
        if (opts?.where?.studentId) res = res.filter((p) => p.studentId === opts.where.studentId);
        if (opts?.where?.lessonId) res = res.filter((p) => p.lessonId === opts.where.lessonId);
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

    fakeTuitionRepo = {
      find: async (opts?: any) => {
        let res = [...tuitionStore];
        if (opts?.where?.teacherId) res = res.filter((t) => t.teacherId === opts.where.teacherId);
        if (opts?.where?.studentId) res = res.filter((t) => t.studentId === opts.where.studentId);
        return res;
      },
      findOne: async (opts?: any) => {
        if (opts?.where?.id) return tuitionStore.find((t) => t.id === opts.where.id) || null;
        if (opts?.where?.studentId) return tuitionStore.find((t) => t.studentId === opts.where.studentId) || null;
        return tuitionStore[0] || null;
      },
      create: (dto: any) => ({ id: `tuition-${Date.now()}`, ...dto }),
      save: async (entity: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === entity.id);
        if (idx >= 0) tuitionStore[idx] = entity;
        else tuitionStore.push(entity);
        return entity;
      },
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
    };

    fakePaymentRepo = {
      find: async (opts?: any) => {
        let res = [...paymentStore];
        if (opts?.where?.teacherId) res = res.filter((p) => p.teacherId === opts.where.teacherId);
        if (opts?.where?.studentId) res = res.filter((p) => p.studentId === opts.where.studentId);
        if (opts?.where?.tuitionItemId) res = res.filter((p) => p.tuitionItemId === opts.where.tuitionItemId);
        return res;
      },
      create: (dto: any) => ({ id: `pay-${Date.now()}`, ...dto }),
      save: async (entity: any) => {
        paymentStore.push(entity);
        return entity;
      },
    };

    fakeLogRepo = {
      find: async (opts?: any) => {
        let res = [...logStore];
        if (opts?.where?.teacherId) res = res.filter((l) => l.teacherId === opts.where.teacherId);
        if (opts?.where?.studentId) res = res.filter((l) => l.studentId === opts.where.studentId);
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
        if (opts?.where?.studentId) res = res.filter((s) => s.studentId === opts.where.studentId);
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
                if (item.lessonId) {
                  participantStore.push(item);
                }
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

    // Services instantiation with exact parameter alignment
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

  // EXT-STU-01: Teacher tạo External Student
  it('EXT-STU-01: Teacher tạo External Student thành công với thông tin cá nhân', async () => {
    const student = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Nguyễn Văn Minh',
      phone: '0912345678',
      parentName: 'Nguyễn Văn Ba',
      parentPhone: '0987654321',
      dob: '2010-05-15',
      gender: 'MALE',
      school: 'THCS Lê Quý Đôn',
      note: 'Kèm thêm môn Toán hình học',
    });

    expect(student).toBeDefined();
    expect(student.fullName).toBe('Nguyễn Văn Minh');
    expect(student.teacherId).toBe('teacher-1');
    expect(student.status).toBe('ACTIVE');
    expect(student.isExternal).toBe(true);
  });

  // EXT-STU-02: External Student không tạo User
  it('EXT-STU-02: Tạo External Student TUYỆT ĐỐI không tạo bản ghi mới trong bảng UserEntity', async () => {
    const userCountBefore = userStore.length;
    await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Trần Thị Thu',
      phone: '0901112233',
    });

    expect(userStore.length).toBe(userCountBefore);
    const createdInUser = userStore.find((u) => u.name === 'Trần Thị Thu');
    expect(createdInUser).toBeUndefined();
  });

  // EXT-STU-03: External Student không có password
  it('EXT-STU-03: External Student không lưu trường password và studentAccountId là NULL', async () => {
    const student = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Lê Hoàng Nam',
    });

    expect(student.studentAccountId).toBeNull();
    expect((student as any).password).toBeUndefined();
  });

  // EXT-STU-04: Teacher chỉ thấy student của mình
  it('EXT-STU-04: Teacher A chỉ thấy danh sách học sinh thuộc teacherId của mình', async () => {
    await studentsService.createExternalStudent('teacher-1', { fullName: 'Học sinh Teacher 1' });
    await studentsService.createExternalStudent('teacher-2', { fullName: 'Học sinh Teacher 2' });

    const teacher1Students = await studentsService.getTeacherStudents('teacher-1');
    expect(teacher1Students.length).toBe(1);
    expect(teacher1Students[0].fullName).toBe('Học sinh Teacher 1');
    expect(teacher1Students[0].isExternal).toBe(true);
  });

  // EXT-STU-05: Teacher A không truy cập student của Teacher B (IDOR Security)
  it('EXT-STU-05: Teacher 2 không được phép xem thông tin chi tiết học sinh của Teacher 1', async () => {
    const studentOfTeacher1 = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Bảo Mật Tuyệt Đối',
    });

    await expect(
      studentsService.getStudentDetail('teacher-2', studentOfTeacher1.id),
    ).rejects.toThrow();
  });

  // EXT-STU-06: Teacher update External Student
  it('EXT-STU-06: Teacher có thể cập nhật thông tin học sinh của mình', async () => {
    const student = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Phạm Đức Huy',
      phone: '0909999999',
    });

    const updated = await studentsService.updateStudent('teacher-1', student.id, {
      fullName: 'Phạm Đức Huy (Cập nhật)',
      phone: '0911223344',
      school: 'THPT Chuyên',
    });

    expect(updated.fullName).toBe('Phạm Đức Huy (Cập nhật)');
    expect(updated.phone).toBe('0911223344');
    expect(updated.school).toBe('THPT Chuyên');
  });

  // EXT-STU-07: Teacher delete External Student
  it('EXT-STU-07: Teacher có thể xóa học sinh thuộc mình; Teacher khác bị chặn', async () => {
    const student = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Học sinh cần xóa',
    });

    // Teacher 2 cố tình xóa học sinh của Teacher 1 -> Bị từ chối
    await expect(studentsService.deleteStudent('teacher-2', student.id)).rejects.toThrow();

    // Teacher 1 xóa học sinh của mình -> Thành công
    const result = await studentsService.deleteStudent('teacher-1', student.id);
    expect(result.success).toBe(true);

    const check = await fakeTeacherStudentRepo.findOne({ where: { id: student.id } });
    expect(check).toBeNull();
  });

  // EXT-STU-08: External Student tạo Schedule
  it('EXT-STU-08: Teacher có thể tạo buổi học (Schedule) cho External Student', async () => {
    const externalStudent = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Học Sinh Kèm Lịch Dạy',
    });

    const created = (await scheduleService.createLesson('teacher-1', {
      classId: `private-${externalStudent.id}`,
      date: '2026-10-25',
      startTime: '19:00',
      endTime: '20:30',
      title: 'Kèm Toán 1-1',
      feePerLesson: 200000,
      studentIds: [externalStudent.id],
    })) as any;

    const lesson = Array.isArray(created) ? created[0] : created;

    expect(lesson).toBeDefined();
    expect(lesson.teacherId).toBe('teacher-1');
    expect(participantStore.length).toBe(1);
    expect(participantStore[0].studentId).toBe(externalStudent.id);
  });

  // EXT-STU-09: External Student attendance
  it('EXT-STU-09: Teacher có thể ghi nhận điểm danh cho External Student', async () => {
    const externalStudent = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Học Sinh Điểm Danh',
    });

    const created = (await scheduleService.createLesson('teacher-1', {
      classId: `private-${externalStudent.id}`,
      date: '2026-10-26',
      startTime: '14:00',
      endTime: '15:30',
      title: 'Buổi học điểm danh',
      feePerLesson: 150000,
      studentIds: [externalStudent.id],
    })) as any;

    const lesson = Array.isArray(created) ? created[0] : created;

    await scheduleService.updateLesson('teacher-1', lesson.id, {
      participants: [
        {
          studentId: externalStudent.id,
          attendanceStatus: 'ATTENDED',
        },
      ],
    });

    const participant = participantStore.find(
      (p) => p.lessonId === lesson.id && p.studentId === externalStudent.id,
    );
    expect(participant).toBeDefined();
    expect(participant.attendanceStatus).toBe('ATTENDED');
  });

  // EXT-STU-10: External Student Learning Log
  it('EXT-STU-10: Teacher có thể tạo nhật ký học tập (Learning Log) cho External Student', async () => {
    const externalStudent = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Học Sinh Nhật Ký',
    });

    lessonStore.push({
      id: 'lesson-log-1',
      teacherId: 'teacher-1',
      classId: `private-${externalStudent.id}`,
      date: '2026-10-27',
    });

    const log = await learningLogsService.createOrUpdateLog('teacher-1', {
      lessonId: 'lesson-log-1',
      studentId: externalStudent.id,
      content: 'Ôn tập hình học giải tích',
      homework: 'Làm bài 1, 2 trang 45',
      attitude: 'Tích cực',
      comment: 'Nắm vững công thức, tính toán nhanh',
    });

    expect(log).toBeDefined();
    expect(log.studentId).toBe(externalStudent.id);
    expect(log.teacherId).toBe('teacher-1');
  });

  // EXT-STU-11: External Student Score
  it('EXT-STU-11: Teacher có thể nhập điểm số (Score Record) cho External Student', async () => {
    const externalStudent = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Học Sinh Nhập Điểm',
    });

    const score = await scoresService.createScore('teacher-1', {
      classId: `private-${externalStudent.id}`,
      studentId: externalStudent.id,
      assessmentType: 'QUIZ',
      assessmentName: 'Kiểm tra 15 phút Số Học',
      score: 9.5,
      date: '2026-10-28',
      comment: 'Làm bài xuất sắc',
    });

    expect(score).toBeDefined();
    expect(score.studentId).toBe(externalStudent.id);
    expect(score.score).toBe(9.5);
  });

  // EXT-STU-12: External Student Tuition
  it('EXT-STU-12: External Student được tính học phí chuẩn xác khi đồng bộ học phí', async () => {
    const externalStudent = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Học Sinh Học Phí',
    });

    // Tạo 2 buổi học với giá 150,000 / buổi
    lessonStore.push({
      id: 'l-ext-1',
      teacherId: 'teacher-1',
      classId: `private-${externalStudent.id}`,
      date: '2026-10-10',
      feePerLesson: 150000,
      duration: 1.5,
      status: 'SCHEDULED',
    });
    participantStore.push({
      id: 'p-ext-1',
      lessonId: 'l-ext-1',
      studentId: externalStudent.id,
      attendanceStatus: 'ATTENDED',
      feeAmount: 150000,
    });

    lessonStore.push({
      id: 'l-ext-2',
      teacherId: 'teacher-1',
      classId: `private-${externalStudent.id}`,
      date: '2026-10-15',
      feePerLesson: 150000,
      duration: 1.5,
      status: 'SCHEDULED',
    });
    participantStore.push({
      id: 'p-ext-2',
      lessonId: 'l-ext-2',
      studentId: externalStudent.id,
      attendanceStatus: 'ATTENDED',
      feeAmount: 150000,
    });

    await tuitionService.syncTuitionData('teacher-1', '2026-10');

    expect(tuitionStore.length).toBe(1);
    expect(tuitionStore[0].studentId).toBe(externalStudent.id);
    expect(tuitionStore[0].baseAmount).toBe(300000);
    expect(tuitionStore[0].totalAmount).toBe(300000);
    expect(tuitionStore[0].status).toBe('UNPAID');
  });

  // EXT-STU-13: External Student Payment
  it('EXT-STU-13: Teacher có thể ghi nhận thanh toán cho External Student', async () => {
    const externalStudent = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Học Sinh Nộp Tiền',
    });

    const tuitionItem = {
      id: 'tui-ext-1',
      teacherId: 'teacher-1',
      classId: `private-${externalStudent.id}`,
      studentId: externalStudent.id,
      month: '2026-10',
      baseAmount: 300000,
      discountAmount: 0,
      surchargeAmount: 0,
      totalAmount: 300000,
      paidAmount: 0,
      remainingAmount: 300000,
      status: 'UNPAID',
    };
    tuitionStore.push(tuitionItem);

    const updated = await tuitionService.recordPayment('teacher-1', 'tui-ext-1', {
      amount: 200000,
      paymentDate: '2026-10-20',
      paymentMethod: 'CASH',
      note: 'Phụ huynh thanh toán tiền mặt',
    });

    expect(updated.paidAmount).toBe(200000);
    expect(updated.remainingAmount).toBe(100000);
    expect(updated.status).toBe('PARTIALLY_PAID');
  });

  // EXT-STU-14: External Student Adjustment
  it('EXT-STU-14: Teacher có thể áp dụng giảm trừ hoặc phụ thu cho External Student', async () => {
    const externalStudent = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Học Sinh Giảm Trừ',
    });

    const tuitionItem = {
      id: 'tui-ext-2',
      teacherId: 'teacher-1',
      classId: `private-${externalStudent.id}`,
      studentId: externalStudent.id,
      month: '2026-10',
      baseAmount: 500000,
      discountAmount: 0,
      surchargeAmount: 0,
      totalAmount: 500000,
      paidAmount: 0,
      remainingAmount: 500000,
      status: 'UNPAID',
    };
    tuitionStore.push(tuitionItem);

    await tuitionService.addAdjustment('teacher-1', 'tui-ext-2', {
      type: 'DISCOUNT',
      amount: 50000,
      reason: 'Học bổng khuyến khích',
    });

    expect(adjustmentStore.length).toBe(1);
    expect(adjustmentStore[0].amount).toBe(50000);
    expect(adjustmentStore[0].type).toBe('DISCOUNT');
  });

  // EXT-STU-15: Link Student Account
  it('EXT-STU-15: Teacher có thể liên kết tài khoản học sinh QuizMaster cho External Student', async () => {
    const externalStudent = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Nguyễn Văn Nam (Chưa Link)',
    });
    expect(externalStudent.isExternal).toBe(true);

    const linked = await studentsService.linkAccount('teacher-1', externalStudent.id, {
      email: 'nam@quiz.vn',
    });

    expect(linked.studentAccountId).toBe('student-user-1');
    expect(linked.isExternal).toBe(false);
  });

  // EXT-STU-16: Reject link ADMIN account
  it('EXT-STU-16: Từ chối liên kết tài khoản nếu tài khoản có vai trò ADMIN', async () => {
    const externalStudent = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Học Sinh Cố Link Admin',
    });

    await expect(
      studentsService.linkAccount('teacher-1', externalStudent.id, {
        email: 'admin@quiz.vn',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // EXT-STU-17: Reject link TEACHER account
  it('EXT-STU-17: Từ chối liên kết tài khoản nếu tài khoản có vai trò TEACHER', async () => {
    const externalStudent = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Học Sinh Cố Link Giáo Viên',
    });

    await expect(
      studentsService.linkAccount('teacher-1', externalStudent.id, {
        email: 'tuan@quiz.vn',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // EXT-STU-18: Unlink account preserves history
  it('EXT-STU-18: Hủy liên kết tài khoản giữ nguyên toàn bộ lịch sử học tập và ID hồ sơ', async () => {
    const student = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Lê Văn An',
    });
    const originalStudentId = student.id;

    // Link với user
    await studentsService.linkAccount('teacher-1', originalStudentId, { email: 'nam@quiz.vn' });

    // Giả sử có 1 bản ghi buổi học và học phí gắn với originalStudentId
    lessonStore.push({
      id: 'lesson-hist-1',
      teacherId: 'teacher-1',
      date: '2026-10-01',
    });
    participantStore.push({
      id: 'part-hist-1',
      lessonId: 'lesson-hist-1',
      studentId: originalStudentId,
    });
    tuitionStore.push({
      id: 'tui-hist-1',
      teacherId: 'teacher-1',
      studentId: originalStudentId,
      paidAmount: 500000,
    });

    // Unlink
    const unlinked = await studentsService.unlinkAccount('teacher-1', originalStudentId);

    expect(unlinked.id).toBe(originalStudentId);
    expect(unlinked.studentAccountId).toBeNull();
    expect(unlinked.isExternal).toBe(true);

    // Kiểm tra lịch sử vẫn trỏ đúng originalStudentId
    expect(participantStore[0].studentId).toBe(originalStudentId);
    expect(tuitionStore[0].studentId).toBe(originalStudentId);
    expect(tuitionStore[0].paidAmount).toBe(500000);
  });

  // EXT-STU-19: Import Excel does not create fake User
  it('EXT-STU-19: Import Excel học sinh mới chỉ tạo TeacherStudent (studentAccountId = null), KHÔNG tạo User giả với pass 123456', async () => {
    const usersCountBefore = userStore.length;

    const result = await classroomsService.importStudents(
      'class-1',
      'teacher-1',
      undefined,
      [
        { name: 'Nguyễn Văn Ngoại Tuyến', email: 'external1@gmail.com', phone: '0933333333' },
      ],
    );

    expect(result.successCount).toBe(1);
    // Số lượng user trong userStore KHÔNG tăng
    expect(userStore.length).toBe(usersCountBefore);

    // Không có user nào với email external1@gmail.com
    const createdUser = userStore.find((u) => u.email === 'external1@gmail.com');
    expect(createdUser).toBeUndefined();

    // Hồ sơ TeacherStudent được tạo với studentAccountId = null
    const createdProfile = studentStore.find((s) => s.fullName === 'Nguyễn Văn Ngoại Tuyến');
    expect(createdProfile).toBeDefined();
    expect(createdProfile.studentAccountId).toBeNull();
  });

  // EXT-STU-20: Legacy student data remains intact
  it('EXT-STU-20: Dữ liệu học sinh cũ được bảo toàn và tương thích hoàn toàn qua resolveStudent', async () => {
    // Đã có 1 học sinh legacy trong userStore: student-user-1 ('nam@quiz.vn')
    // Tạo hồ sơ liên kết tương ứng
    await fakeTeacherStudentRepo.save({
      id: 'ts-legacy-1',
      teacherId: 'teacher-1',
      fullName: 'Em Nam',
      studentAccountId: 'student-user-1',
      status: 'ACTIVE',
    });

    // 1. Resolve bằng ID hồ sơ TeacherStudent
    const resolvedByProfileId = await studentsService.resolveStudent('teacher-1', 'ts-legacy-1');
    expect(resolvedByProfileId).toBeDefined();
    expect(resolvedByProfileId?.id).toBe('ts-legacy-1');
    expect(resolvedByProfileId?.fullName).toBe('Em Nam');

    // 2. Resolve bằng studentAccountId (ID User cũ)
    const resolvedByUserId = await studentsService.resolveStudent('teacher-1', 'student-user-1');
    expect(resolvedByUserId).toBeDefined();
    expect(resolvedByUserId?.id).toBe('ts-legacy-1');
    expect(resolvedByUserId?.studentAccountId).toBe('student-user-1');
  });
});
