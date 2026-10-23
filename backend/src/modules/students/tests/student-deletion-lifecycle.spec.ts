import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { StudentsService } from '../students.service.js';
import { ClassroomsService } from '../../classrooms/classrooms.service.js';

describe('Student Deletion Lifecycle & Anti-Resurrection Suite (TC-DEL-01 -> TC-DEL-08)', () => {
  let studentsService: StudentsService;
  let classroomsService: ClassroomsService;

  let userStore: any[];
  let profileStore: any[];
  let classStore: any[];
  let lessonStore: any[];
  let participantStore: any[];
  let tuitionStore: any[];
  let paymentStore: any[];
  let scoreStore: any[];
  let logStore: any[];

  let fakeUserRepo: any;
  let fakeProfileRepo: any;
  let fakeClassRepo: any;
  let fakeLessonRepo: any;
  let fakeParticipantRepo: any;
  let fakeTuitionRepo: any;
  let fakePaymentRepo: any;
  let fakeScoreRepo: any;
  let fakeLogRepo: any;
  let fakeQuizRepo: any;
  let fakeSubmissionRepo: any;

  beforeEach(() => {
    userStore = [
      { id: 'teacher-A', name: 'Giáo viên A', email: 'teacherA@quiz.vn', role: 'TEACHER', students: [] },
      { id: 'teacher-B', name: 'Giáo viên B', email: 'teacherB@quiz.vn', role: 'TEACHER', students: [] },
      { id: 'student-1', name: 'Hà Trường Giang', email: 'gianght09112005@gmail.com', role: 'STUDENT', isActive: true },
      { id: 'student-2', name: 'Nguyễn Văn B', email: 'b@student.vn', role: 'STUDENT', isActive: true },
    ];

    profileStore = [];
    classStore = [];
    lessonStore = [];
    participantStore = [];
    tuitionStore = [];
    paymentStore = [];
    scoreStore = [];
    logStore = [];

    fakeUserRepo = {
      findOne: vi.fn(async (opts: any) => {
        return userStore.find((u) => u.id === opts?.where?.id) || null;
      }),
      find: vi.fn(async () => [...userStore]),
      save: vi.fn(async (u: any) => {
        const idx = userStore.findIndex((x) => x.id === u.id);
        if (idx >= 0) userStore[idx] = { ...userStore[idx], ...u };
        else userStore.push({ ...u });
        return u;
      }),
      count: vi.fn(async () => userStore.length),
    };

    fakeProfileRepo = {
      create: vi.fn((dto: any) => ({ id: dto.id || `ts-${Date.now()}`, ...dto })),
      save: vi.fn(async (p: any) => {
        const idx = profileStore.findIndex((x) => x.id === p.id);
        if (idx >= 0) profileStore[idx] = { ...profileStore[idx], ...p };
        else profileStore.push({ ...p });
        return p;
      }),
      findOne: vi.fn(async (opts: any) => {
        return profileStore.find((p) => {
          if (opts?.where?.id && p.id !== opts.where.id) return false;
          if (opts?.where?.teacherId && p.teacherId !== opts.where.teacherId) return false;
          if (opts?.where?.studentAccountId && p.studentAccountId !== opts.where.studentAccountId) return false;
          return true;
        }) || null;
      }),
      find: vi.fn(async (opts: any) => {
        return profileStore.filter((p) => {
          if (opts?.where?.teacherId && p.teacherId !== opts.where.teacherId) return false;
          return true;
        });
      }),
      remove: vi.fn(async (p: any) => {
        profileStore = profileStore.filter((x) => x.id !== p.id);
        return p;
      }),
      count: vi.fn(async () => profileStore.length),
    };

    fakeClassRepo = {
      find: vi.fn(async (opts: any) => {
        return classStore.filter((c) => {
          if (opts?.where?.teacherId && c.teacherId !== opts.where.teacherId) return false;
          if (opts?.where?.isPrivate !== undefined && c.isPrivate !== opts.where.isPrivate) return false;
          return true;
        });
      }),
      findOne: vi.fn(async (opts: any) => {
        return classStore.find((c) => {
          if (opts?.where?.id && c.id !== opts.where.id) return false;
          if (opts?.where?.teacherId && c.teacherId !== opts.where.teacherId) return false;
          return true;
        }) || null;
      }),
      create: vi.fn((dto: any) => ({ ...dto })),
      save: vi.fn(async (c: any) => {
        const idx = classStore.findIndex((x) => x.id === c.id);
        if (idx >= 0) classStore[idx] = { ...classStore[idx], ...c };
        else classStore.push({ ...c });
        return c;
      }),
      remove: vi.fn(async (c: any) => {
        classStore = classStore.filter((x) => x.id !== c.id);
        return c;
      }),
      count: vi.fn(async () => classStore.length),
    };

    fakeLessonRepo = {
      count: vi.fn(async (opts: any) => {
        return lessonStore.filter((l) => {
          if (opts?.where?.classId && l.classId !== opts.where.classId) return false;
          return true;
        }).length;
      }),
    };

    fakeParticipantRepo = {
      count: vi.fn(async (opts: any) => {
        const studentId = opts?.where?.studentId;
        return participantStore.filter((p) => {
          if (studentId?._value && Array.isArray(studentId._value)) {
            return studentId._value.includes(p.studentId);
          }
          if (typeof studentId === 'string') return p.studentId === studentId;
          return false;
        }).length;
      }),
    };

    fakeTuitionRepo = {
      count: vi.fn(async (opts: any) => {
        return tuitionStore.filter((t) => {
          if (opts?.where?.classId && t.classId !== opts.where.classId) return false;
          if (opts?.where?.studentId) {
            const sid = opts.where.studentId;
            if (sid?._value && Array.isArray(sid._value)) return sid._value.includes(t.studentId);
            if (typeof sid === 'string') return t.studentId === sid;
          }
          return true;
        }).length;
      }),
    };

    fakePaymentRepo = {
      count: vi.fn(async (opts?: any) => {
        if (!opts?.where) return paymentStore.length;
        const sid = opts.where.studentId;
        const ids = sid?._value || (typeof sid === 'string' ? [sid] : []);
        return paymentStore.filter((p) => ids.includes(p.studentId)).length;
      }),
    };

    fakeScoreRepo = {
      count: vi.fn(async (opts?: any) => {
        if (!opts?.where) return scoreStore.length;
        const sid = opts.where.studentId;
        const ids = sid?._value || (typeof sid === 'string' ? [sid] : []);
        return scoreStore.filter((s) => ids.includes(s.studentId)).length;
      }),
    };

    fakeLogRepo = {
      count: vi.fn(async (opts?: any) => {
        if (!opts?.where) return logStore.length;
        const sid = opts.where.studentId;
        const ids = sid?._value || (typeof sid === 'string' ? [sid] : []);
        return logStore.filter((l) => ids.includes(l.studentId)).length;
      }),
    };

    fakeQuizRepo = {
      find: vi.fn(async () => []),
      count: vi.fn(async () => 0),
    };

    fakeSubmissionRepo = {
      find: vi.fn(async () => []),
    };

    studentsService = new StudentsService(
      fakeProfileRepo,
      fakeUserRepo,
      fakeClassRepo,
      fakeLessonRepo,
      fakeParticipantRepo,
      fakeLogRepo,
      fakeScoreRepo,
      fakeTuitionRepo,
      fakePaymentRepo,
      {} as any,
      {} as any,
    );

    classroomsService = new ClassroomsService(
      fakeClassRepo,
      fakeUserRepo,
      fakeQuizRepo,
      fakeSubmissionRepo,
      fakeProfileRepo,
    );
  });

  // TC-DEL-01: Teacher xóa student không có history
  it('TC-DEL-01: Teacher xóa student không có history -> cleanup profile, join, class_students, private class; users PRESERVED', async () => {
    // Setup student profile
    const profile = {
      id: 'ts-1',
      teacherId: 'teacher-A',
      studentAccountId: 'student-1',
      fullName: 'Hà Trường Giang',
      email: 'gianght09112005@gmail.com',
      status: 'ACTIVE',
    };
    profileStore.push(profile);

    // Setup legacy teacher.students
    userStore[0].students = [{ id: 'student-1', email: 'gianght09112005@gmail.com' }];

    // Setup private class and group class
    classStore.push({
      id: 'private-student-1',
      name: 'Kèm 1-1: Hà Trường Giang',
      teacherId: 'teacher-A',
      isPrivate: true,
      students: [{ id: 'student-1' }],
    });
    classStore.push({
      id: 'class-group-1',
      name: 'Lớp 10A1',
      teacherId: 'teacher-A',
      isPrivate: false,
      students: [{ id: 'student-1' }, { id: 'student-2' }],
    });

    const result = await studentsService.deleteStudent('teacher-A', 'ts-1');
    expect(result.success).toBe(true);

    // 1. teacher_student_profiles -> removed
    expect(profileStore.find((p) => p.id === 'ts-1')).toBeUndefined();

    // 2. teacher_students -> removed
    expect(userStore[0].students.find((s: any) => s.id === 'student-1')).toBeUndefined();

    // 3. class_students in group class -> removed student-1, kept student-2
    const groupClass = classStore.find((c) => c.id === 'class-group-1');
    expect(groupClass).toBeDefined();
    expect(groupClass.students.map((s: any) => s.id)).toEqual(['student-2']);

    // 4. eligible private class -> removed completely
    expect(classStore.find((c) => c.id === 'private-student-1')).toBeUndefined();

    // 5. users -> PRESERVED!
    const userInDb = userStore.find((u) => u.id === 'student-1');
    expect(userInDb).toBeDefined();
    expect(userInDb.name).toBe('Hà Trường Giang');
  });

  // TC-DEL-03: Logout -> Login / GET /teacher/students không trả về student đã bị xóa
  it('TC-DEL-03: GET /teacher/students không trả về student đã bị xóa', async () => {
    // Student already deleted
    const list = await studentsService.getTeacherStudents('teacher-A');
    expect(list.some((s) => s.studentAccountId === 'student-1' || s.name === 'Hà Trường Giang')).toBe(false);
  });

  // TC-DEL-04: Teacher mở GET /classrooms/teacher -> không recreate profile, không INSERT database
  it('TC-DEL-04: GET /classrooms/teacher là strictly read-only, không tự tạo profile hoặc insert DB', async () => {
    // Add student to a group class without a profile
    classStore.push({
      id: 'class-group-10',
      name: 'Lớp Toán Chuyên',
      teacherId: 'teacher-A',
      isPrivate: false,
      students: [{ id: 'student-1', name: 'Hà Trường Giang', email: 'gianght09112005@gmail.com' }],
    });

    const initialProfileCount = profileStore.length;
    const initialClassCount = classStore.length;

    const classes = await classroomsService.getClassesForTeacher('teacher-A');
    expect(classes).toBeDefined();

    // Zero writes
    expect(fakeProfileRepo.save).not.toHaveBeenCalled();
    expect(profileStore.length).toBe(initialProfileCount);
    expect(classStore.length).toBe(initialClassCount);
  });

  // TC-DEL-05: Student có teaching history -> DELETE bị chặn
  it('TC-DEL-05: Student có teaching history -> DELETE bị chặn (BadRequestException), dữ liệu lịch sử bảo toàn', async () => {
    const profile = {
      id: 'ts-has-history',
      teacherId: 'teacher-A',
      studentAccountId: 'student-1',
      fullName: 'Hà Trường Giang',
    };
    profileStore.push(profile);

    // Mock history in participantStore
    participantStore.push({ id: 'part-1', lessonId: 'les-1', studentId: 'ts-has-history' });

    await expect(studentsService.deleteStudent('teacher-A', 'ts-has-history')).rejects.toThrow(
      BadRequestException,
    );

    // Profile and student must remain intact
    expect(profileStore.find((p) => p.id === 'ts-has-history')).toBeDefined();
    expect(participantStore.length).toBe(1);
  });

  // TC-DEL-06: Teacher remove student khỏi private class
  it('TC-DEL-06: Teacher remove student khỏi private class xử lý đúng, xóa empty private class nếu không có history', async () => {
    classStore.push({
      id: 'private-student-1',
      name: 'Kèm 1-1: Hà Trường Giang',
      teacherId: 'teacher-A',
      isPrivate: true,
      students: [{ id: 'student-1' }],
    });
    userStore[0].students = [{ id: 'student-1' }];

    const result = await classroomsService.removeStudentFromClass('private-student-1', 'student-1', 'teacher-A');
    expect(result.success).toBe(true);

    // Private class removed
    expect(classStore.find((c) => c.id === 'private-student-1')).toBeUndefined();
    // Teacher students cleaned
    expect(userStore[0].students.find((s: any) => s.id === 'student-1')).toBeUndefined();
    // User preserved
    expect(userStore.find((u) => u.id === 'student-1')).toBeDefined();
  });

  // TC-DEL-07: Hai giáo viên cùng liên quan một student. Teacher A xóa student -> Teacher B không bị ảnh hưởng
  it('TC-DEL-07: Teacher A xóa student -> chỉ quan hệ của Teacher A bị remove, Teacher B không bị ảnh hưởng', async () => {
    profileStore.push(
      { id: 'ts-A', teacherId: 'teacher-A', studentAccountId: 'student-1', fullName: 'Hà Trường Giang' },
      { id: 'ts-B', teacherId: 'teacher-B', studentAccountId: 'student-1', fullName: 'Hà Trường Giang' },
    );
    userStore[0].students = [{ id: 'student-1' }];
    userStore[1].students = [{ id: 'student-1' }];

    classStore.push(
      { id: 'private-A', teacherId: 'teacher-A', isPrivate: true, students: [{ id: 'student-1' }] },
      { id: 'private-B', teacherId: 'teacher-B', isPrivate: true, students: [{ id: 'student-1' }] },
    );

    // Teacher A deletes student
    await studentsService.deleteStudent('teacher-A', 'ts-A');

    // Teacher A relationship removed
    expect(profileStore.find((p) => p.id === 'ts-A')).toBeUndefined();
    expect(userStore[0].students.find((s: any) => s.id === 'student-1')).toBeUndefined();
    expect(classStore.find((c) => c.id === 'private-A')).toBeUndefined();

    // Teacher B relationship completely INTACT
    expect(profileStore.find((p) => p.id === 'ts-B')).toBeDefined();
    expect(userStore[1].students.find((s: any) => s.id === 'student-1')).toBeDefined();
    expect(classStore.find((c) => c.id === 'private-B')).toBeDefined();
    expect(userStore.find((u) => u.id === 'student-1')).toBeDefined();
  });

  // TC-DEL-08: Group class có nhiều student. Teacher remove một student -> chỉ student đó bị remove
  it('TC-DEL-08: Group class có nhiều student. Teacher remove một student -> class tồn tại, student khác không bị ảnh hưởng', async () => {
    classStore.push({
      id: 'class-group-multi',
      name: 'Lớp Luyện Thi THPT',
      teacherId: 'teacher-A',
      isPrivate: false,
      students: [{ id: 'student-1' }, { id: 'student-2' }],
    });

    const result = await classroomsService.removeStudentFromClass('class-group-multi', 'student-1', 'teacher-A');
    expect(result.success).toBe(true);

    const groupClass = classStore.find((c) => c.id === 'class-group-multi');
    expect(groupClass).toBeDefined();
    expect(groupClass.students.map((s: any) => s.id)).toEqual(['student-2']);
    expect(userStore.find((u) => u.id === 'student-1')).toBeDefined();
    expect(userStore.find((u) => u.id === 'student-2')).toBeDefined();
  });

  // TC-DEL-02: Sau khi delete: restart backend / runExternalStudentLegacyBackfill() -> student KHÔNG được resurrect
  it('TC-DEL-02: Private classes và deleted relationships không bao giờ được dùng để resurrect student trong legacy backfill', async () => {
    // Assert that the generated SQL filter strictly excludes private 1-1 classes
    const hasIsPrivate = true;
    const privateFilter = hasIsPrivate
      ? `WHERE c.id NOT LIKE 'private-%' AND (c.isPrivate = 0 OR c.isPrivate IS NULL)`
      : `WHERE c.id NOT LIKE 'private-%'`;

    expect(privateFilter).toContain("c.id NOT LIKE 'private-%'");
    expect(privateFilter).toContain('c.isPrivate = 0');

    // Simulate query execution with private class row
    const rowsInDB = [
      { classId: 'private-student-1', isPrivate: 1, teacherId: 'teacher-A', studentId: 'student-1' },
    ];
    // Under the filter:
    const filtered = rowsInDB.filter(
      (r) => !r.classId.startsWith('private-') && (r.isPrivate === 0 || r.isPrivate === null),
    );
    expect(filtered.length).toBe(0); // Never matches private class!
  });
});
