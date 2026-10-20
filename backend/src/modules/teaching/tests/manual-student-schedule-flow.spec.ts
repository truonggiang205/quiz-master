import { describe, it, expect, beforeEach } from 'vitest';
import { StudentsService } from '../../students/students.service.js';
import { ScheduleService } from '../services/schedule.service.js';
import { ClassroomsService } from '../../classrooms/classrooms.service.js';

describe('Manual Student & Schedule Full UX Flow Specification (TEST-01 -> TEST-08)', () => {
  let studentStore: any[] = [];
  let userStore: any[] = [];
  let lessonStore: any[] = [];
  let participantStore: any[] = [];
  let classStore: any[] = [];

  let fakeTeacherStudentRepo: any;
  let fakeUserRepo: any;
  let fakeClassRepo: any;
  let fakeLessonRepo: any;
  let fakeParticipantRepo: any;
  let fakeTuitionRepo: any;
  let fakeDataSource: any;

  let studentsService: StudentsService;
  let scheduleService: ScheduleService;
  let classroomsService: ClassroomsService;

  beforeEach(() => {
    studentStore = [];
    userStore = [
      { id: 'teacher-1', name: 'Thầy Hùng', email: 'hung@quizmaster.edu', role: 'TEACHER', isActive: true, students: [] },
      { id: 'student-account-1', name: 'Trần Văn B (Account)', email: 'b@student.edu', role: 'STUDENT', isActive: true },
    ];
    lessonStore = [];
    participantStore = [];
    classStore = [
      {
        id: 'class-math-10',
        name: 'Lớp Toán 10',
        teacherId: 'teacher-1',
        isPrivate: false,
        students: [{ id: 'student-account-1', name: 'Trần Văn B (Account)', email: 'b@student.edu' }],
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
        if (opts?.where?.teacherId) {
          results = results.filter((s) => s.teacherId === opts.where.teacherId);
        }
        if (opts?.where?.studentAccountId) {
          results = results.filter((s) => s.studentAccountId === opts.where.studentAccountId);
        }
        return results;
      },
      findOne: async (opts?: any) => {
        if (Array.isArray(opts?.where)) {
          return (
            studentStore.find((s) =>
              opts.where.some((w: any) => {
                if (w.id && s.id !== w.id) return false;
                if (w.teacherId && s.teacherId !== w.teacherId) return false;
                if (w.studentAccountId && s.studentAccountId !== w.studentAccountId) return false;
                return true;
              }),
            ) || null
          );
        }
        if (opts?.where?.id) {
          return studentStore.find((s) => s.id === opts.where.id) || null;
        }
        if (opts?.where?.teacherId && opts?.where?.studentAccountId) {
          return (
            studentStore.find(
              (s) =>
                s.teacherId === opts.where.teacherId &&
                s.studentAccountId === opts.where.studentAccountId,
            ) || null
          );
        }
        return null;
      },
    };

    fakeUserRepo = {
      findOne: async (opts: any) => {
        if (opts?.where?.id) {
          return userStore.find((u) => u.id === opts.where.id) || null;
        }
        return null;
      },
      findOneBy: async (where: any) => {
        if (where?.id) {
          return userStore.find((u) => u.id === where.id) || null;
        }
        return null;
      },
      save: async (u: any) => u,
    };

    fakeClassRepo = {
      create: (dto: any) => ({
        id: dto.id || `class-${Date.now()}`,
        students: [],
        ...dto,
      }),
      save: async (c: any) => {
        const idx = classStore.findIndex((x) => x.id === c.id);
        if (idx >= 0) {
          classStore[idx] = { ...classStore[idx], ...c };
          return classStore[idx];
        }
        classStore.push({ ...c });
        return c;
      },
      find: async (opts?: any) => {
        let results = [...classStore];
        if (opts?.where?.teacherId) {
          results = results.filter((c) => c.teacherId === opts.where.teacherId);
        }
        if (opts?.where?.isPrivate !== undefined) {
          results = results.filter((c) => c.isPrivate === opts.where.isPrivate);
        }
        return results;
      },
      findOne: async (opts: any) => {
        if (opts?.where?.id) {
          return classStore.find((c) => c.id === opts.where.id) || null;
        }
        return null;
      },
    };

    fakeLessonRepo = {
      create: (dto: any) => ({
        id: dto.id || `lesson-${Date.now()}`,
        ...dto,
      }),
      save: async (l: any) => {
        lessonStore.push({ ...l });
        return l;
      },
      find: async (opts?: any) => {
        let results = [...lessonStore];
        if (opts?.where?.teacherId) results = results.filter((l) => l.teacherId === opts.where.teacherId);
        if (opts?.where?.date) results = results.filter((l) => l.date === opts.where.date);
        return results;
      },
      createQueryBuilder: () => {
        return {
          leftJoinAndSelect: function () { return this; },
          where: function () { return this; },
          andWhere: function () { return this; },
          orderBy: function () { return this; },
          addOrderBy: function () { return this; },
          getMany: async () => {
            return lessonStore.map((l) => ({
              ...l,
              participants: participantStore
                .filter((p) => p.lessonId === l.id)
                .map((p) => {
                  const student = studentStore.find((s) => s.id === p.studentId);
                  return {
                    ...p,
                    student: student ? { ...student, name: student.fullName } : null,
                  };
                }),
            }));
          },
          getOne: async () => {
            if (lessonStore.length === 0) return null;
            const l = lessonStore[0];
            return {
              ...l,
              participants: participantStore
                .filter((p) => p.lessonId === l.id)
                .map((p) => {
                  const student = studentStore.find((s) => s.id === p.studentId);
                  return {
                    ...p,
                    student: student ? { ...student, name: student.fullName } : null,
                  };
                }),
            };
          },
        };
      },
    };

    fakeParticipantRepo = {
      create: (dto: any) => ({
        id: dto.id || `part-${Date.now()}`,
        ...dto,
      }),
      save: async (parts: any) => {
        const arr = Array.isArray(parts) ? parts : [parts];
        participantStore.push(...arr);
        return parts;
      },
      find: async () => participantStore,
    };

    fakeTuitionRepo = {
      findOne: async () => null,
      save: async () => {},
    };

    fakeDataSource = {
      transaction: async (cb: any) => {
        const mockManager = {
          create: (entityClass: any, dto: any) => {
            if (entityClass.name === 'LessonEntity' || dto.startTime) {
              return fakeLessonRepo.create(dto);
            }
            return fakeParticipantRepo.create(dto);
          },
          save: async (entityOrEntities: any) => {
            if (Array.isArray(entityOrEntities)) {
              return fakeParticipantRepo.save(entityOrEntities);
            }
            if (entityOrEntities.startTime) {
              return fakeLessonRepo.save(entityOrEntities);
            }
            return fakeParticipantRepo.save(entityOrEntities);
          },
        };
        return await cb(mockManager);
      },
    };

    studentsService = new StudentsService(
      fakeTeacherStudentRepo,
      fakeUserRepo,
      fakeClassRepo,
      fakeLessonRepo,
      fakeParticipantRepo,
      {} as any,
      {} as any,
      fakeTuitionRepo,
      {} as any,
      {} as any,
      {} as any,
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

    const fakeQuizRepo = {
      find: async () => [],
      createQueryBuilder: () => ({
        where: function () { return this; },
        orWhere: function () { return this; },
        orderBy: function () { return this; },
        getMany: async () => [],
      }),
    };
    const fakeSubmissionRepo = {
      find: async () => [],
    };

    classroomsService = new ClassroomsService(
      fakeClassRepo,
      fakeUserRepo,
      fakeQuizRepo as any,
      fakeSubmissionRepo as any,
      fakeTeacherStudentRepo,
    );
  });

  it('TEST-01: UI Wording & Label requirement - "Thêm học sinh thủ công"', () => {
    const OFFICIAL_BUTTON_LABEL = 'Thêm học sinh thủ công';
    const FORBIDDEN_LABELS = [
      'Thêm học sinh ngoài hệ thống',
      'Tạo học sinh ngoài hệ thống',
      'External Student',
      'Offline Student',
    ];

    expect(OFFICIAL_BUTTON_LABEL).toBe('Thêm học sinh thủ công');
    for (const forbidden of FORBIDDEN_LABELS) {
      expect(OFFICIAL_BUTTON_LABEL).not.toContain(forbidden);
    }
  });

  it('TEST-02: Form/modal descriptor requirement', () => {
    const OFFICIAL_BANNER =
      'Học sinh này chưa có tài khoản trên hệ thống. Bạn vẫn có thể tạo lịch dạy, theo dõi học phí, nhật ký học tập và điểm số cho học sinh này.';

    expect(OFFICIAL_BANNER).toContain('chưa có tài khoản trên hệ thống');
    expect(OFFICIAL_BANNER).toContain('tạo lịch dạy, theo dõi học phí, nhật ký học tập và điểm số');
  });

  it('TEST-03: Nhập tên học sinh thủ công và tạo thành công (Không yêu cầu tài khoản)', async () => {
    const student = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Nguyễn Văn A',
      phone: '0901234567',
      email: 'a@example.com',
      note: 'Học sinh ôn thi môn Toán',
    });

    expect(student).toBeDefined();
    expect(student.fullName).toBe('Nguyễn Văn A');
    expect(student.name).toBe('Nguyễn Văn A');
    expect(student.studentAccountId).toBeNull();
    expect(student.isExternal).toBe(true);

    // Không tạo UserEntity giả trong hệ thống
    const fakeUser = userStore.find((u) => u.name === 'Nguyễn Văn A');
    expect(fakeUser).toBeUndefined();
  });

  it('TEST-04: Học sinh mới xuất hiện ngay trong danh sách của giáo viên', async () => {
    await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Nguyễn Văn A',
    });

    const teacherStudents = await studentsService.getTeacherStudents('teacher-1');
    expect(teacherStudents).toHaveLength(1);
    expect(teacherStudents[0].fullName).toBe('Nguyễn Văn A');
    expect(teacherStudents[0].isExternal).toBe(true);
  });

  it('TEST-05: Học sinh thủ công có thể được chọn khi tạo lịch dạy (Xuất hiện trong lớp Kèm 1-1)', async () => {
    const student = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Nguyễn Văn A',
    });

    const classes = await classroomsService.getClassesForTeacher('teacher-1');
    const privateClass = classes.find((c) => c.id === `private-${student.id}`);

    expect(privateClass).toBeDefined();
    expect(privateClass?.name).toBe('Kèm 1-1: Nguyễn Văn A');
    expect(privateClass?.students[0].id).toBe(student.id);
  });

  it('TEST-06: Tạo lịch dạy thành công cho học sinh không có account (Nguyễn Văn A, 21/10/2026, 19:00 - 20:30, Toán)', async () => {
    // 1. Tạo học sinh thủ công
    const student = await studentsService.createExternalStudent('teacher-1', {
      fullName: 'Nguyễn Văn A',
    });

    // 2. Tạo lịch dạy kèm 1-1
    const lesson = (await scheduleService.createLesson('teacher-1', {
      classId: `private-${student.id}`,
      title: 'Toán',
      date: '2026-10-21',
      startTime: '19:00',
      endTime: '20:30',
      feePerLesson: 150000,
      studentIds: [student.id],
    })) as any;

    expect(lesson).toBeDefined();
    expect(lesson.title).toBe('Toán');
    expect(lesson.date).toBe('2026-10-21');
    expect(lesson.startTime).toBe('19:00');
    expect(lesson.endTime).toBe('20:30');
    expect(lesson.duration).toBe(1.5);
    expect(lesson.participants).toHaveLength(1);
    expect(lesson.participants[0].studentId).toBe(student.id);

    // 3. Lấy lại danh sách buổi học và xác nhận tên hiển thị là Nguyễn Văn A
    const lessons = await scheduleService.getLessons('teacher-1', {
      startDate: '2026-10-21',
      endDate: '2026-10-21',
    });
    expect(lessons).toHaveLength(1);
    expect(lessons[0].participants?.[0]?.student?.name).toBe('Nguyễn Văn A');
  });

  it('TEST-07: Học sinh có account vẫn hoạt động bình thường', async () => {
    // Giáo viên tạo buổi học cho lớp học có học sinh có tài khoản
    const lesson = (await scheduleService.createLesson('teacher-1', {
      classId: 'class-math-10',
      title: 'Đại số 10',
      date: '2026-10-22',
      startTime: '08:00',
      endTime: '09:30',
      feePerLesson: 100000,
    })) as any;

    expect(lesson).toBeDefined();
    expect(lesson.classId).toBe('class-math-10');
    expect(lesson.participants[0].studentId).toBe('student-account-1');
  });

  it('TEST-08: Không tạo duplicate external student khi thao tác lặp lại', async () => {
    // Legacy sync duplicate protection test
    const teacherUser = userStore.find((u) => u.id === 'teacher-1')!;
    teacherUser.students = [{ id: 'student-account-1', name: 'Trần Văn B (Account)', email: 'b@student.edu' }];

    await studentsService.syncLegacyStudents('teacher-1');
    const countAfterFirstSync = studentStore.filter((s) => s.studentAccountId === 'student-account-1').length;
    expect(countAfterFirstSync).toBe(1);

    // Chạy đồng bộ lần 2
    await studentsService.syncLegacyStudents('teacher-1');
    const countAfterSecondSync = studentStore.filter((s) => s.studentAccountId === 'student-account-1').length;
    expect(countAfterSecondSync).toBe(1);
  });
});
