import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ClassroomsService } from '../classrooms.service.js';

describe('Classroom Detail Lifecycle & Anti-Resurrection Suite (TC-CLASS-DETAIL-01 -> TC-CLASS-DETAIL-10)', () => {
  let classroomsService: ClassroomsService;

  let userStore: any[];
  let profileStore: any[];
  let classStore: any[];
  let quizStore: any[];
  let submissionStore: any[];

  let fakeUserRepo: any;
  let fakeProfileRepo: any;
  let fakeClassRepo: any;
  let fakeQuizRepo: any;
  let fakeSubmissionRepo: any;

  beforeEach(() => {
    userStore = [
      { id: 'teacher-A', name: 'Giáo viên A', email: 'teacherA@quiz.vn', role: 'TEACHER', students: [] },
      { id: 'teacher-B', name: 'Giáo viên B', email: 'teacherB@quiz.vn', role: 'TEACHER', students: [] },
      { id: 'student-linked-1', name: 'Đặng Thị Hồng Xuân', email: 'xuan@student.vn', role: 'STUDENT', isActive: true },
      { id: 'student-linked-2', name: 'Trần Võ Hải Mi', email: 'mi@student.vn', role: 'STUDENT', isActive: true },
      { id: 'student-other', name: 'Học sinh khác', email: 'other@student.vn', role: 'STUDENT', isActive: true },
    ];

    profileStore = [
      {
        id: 'ts-external-thuy',
        teacherId: 'teacher-A',
        studentAccountId: null,
        fullName: 'Thùy',
        email: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'ts-linked-xuan',
        teacherId: 'teacher-A',
        studentAccountId: 'student-linked-1',
        fullName: 'Đặng Thị Hồng Xuân',
        email: 'xuan@student.vn',
        status: 'ACTIVE',
        studentAccount: userStore[2],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'ts-linked-mi',
        teacherId: 'teacher-A',
        studentAccountId: 'student-linked-2',
        fullName: 'Trần Võ Hải Mi',
        email: 'mi@student.vn',
        status: 'ACTIVE',
        studentAccount: userStore[3],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    classStore = [
      {
        id: 'class-group-1',
        name: 'Lớp Toán 10A1',
        subject: 'Toán học',
        teacherId: 'teacher-A',
        isPrivate: false,
        inviteCode: 'TOAN-10A1',
        students: [userStore[2], userStore[3]],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'private-ts-external-thuy',
        name: 'Kèm 1-1: Thùy',
        subject: 'Gia sư cá nhân',
        teacherId: 'teacher-A',
        isPrivate: true,
        inviteCode: 'PV-THUY',
        students: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'private-student-linked-1',
        name: 'Kèm 1-1: Đặng Thị Hồng Xuân',
        subject: 'Gia sư cá nhân',
        teacherId: 'teacher-A',
        isPrivate: true,
        inviteCode: 'PV-XUAN',
        students: [userStore[2]],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'private-empty-students',
        name: 'Kèm 1-1: Empty',
        subject: 'Gia sư cá nhân',
        teacherId: 'teacher-A',
        isPrivate: true,
        inviteCode: 'PV-EMPTY',
        students: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    quizStore = [];
    submissionStore = [];

    fakeUserRepo = {
      findOne: vi.fn(async (opts: any) => {
        return userStore.find((u) => u.id === opts?.where?.id) || null;
      }),
      findOneBy: vi.fn(async (opts: any) => {
        return userStore.find((u) => u.id === opts?.id) || null;
      }),
      find: vi.fn(async () => [...userStore]),
      save: vi.fn(async (u: any) => u),
    };

    fakeProfileRepo = {
      findOne: vi.fn(async (opts: any) => {
        const where = opts?.where;
        if (Array.isArray(where)) {
          for (const cond of where) {
            const found = profileStore.find((p) => {
              for (const key of Object.keys(cond)) {
                if (p[key] !== cond[key]) return false;
              }
              return true;
            });
            if (found) return found;
          }
          return null;
        }
        return profileStore.find((p) => {
          for (const key of Object.keys(where || {})) {
            if (p[key] !== where[key]) return false;
          }
          return true;
        }) || null;
      }),
      find: vi.fn(async (opts: any) => {
        const teacherId = opts?.where?.teacherId;
        return profileStore.filter((p) => !teacherId || p.teacherId === teacherId);
      }),
      save: vi.fn(async (p: any) => p),
    };

    fakeClassRepo = {
      findOne: vi.fn(async (opts: any) => {
        const where = opts?.where;
        if (Array.isArray(where)) {
          for (const cond of where) {
            const found = classStore.find((c) => {
              for (const key of Object.keys(cond)) {
                if (c[key] !== cond[key]) return false;
              }
              return true;
            });
            if (found) return found;
          }
          return null;
        }
        return classStore.find((c) => {
          for (const key of Object.keys(where || {})) {
            if (c[key] !== where[key]) return false;
          }
          return true;
        }) || null;
      }),
      find: vi.fn(async (opts: any) => {
        const where = opts?.where;
        return classStore.filter((c) => {
          if (!where) return true;
          for (const key of Object.keys(where)) {
            if (c[key] !== where[key]) return false;
          }
          return true;
        });
      }),
      save: vi.fn(async (c: any) => c),
    };

    fakeQuizRepo = {
      find: vi.fn(async () => [...quizStore]),
      count: vi.fn(async () => quizStore.length),
    };

    fakeSubmissionRepo = {
      find: vi.fn(async () => [...submissionStore]),
    };

    classroomsService = new ClassroomsService(
      fakeClassRepo,
      fakeUserRepo,
      fakeQuizRepo,
      fakeSubmissionRepo,
      fakeProfileRepo,
    );
  });

  it('TC-CLASS-DETAIL-01: Teacher mở private class hợp lệ (cả external student và linked student)', async () => {
    // 1. External student (Thùy)
    const thuyDetail = await classroomsService.getClassDetails('private-ts-external-thuy', 'teacher-A');
    expect(thuyDetail).toBeDefined();
    expect(thuyDetail.id).toBe('private-ts-external-thuy');
    expect(thuyDetail.isPrivate).toBe(true);
    expect(thuyDetail.name).toBe('Kèm 1-1: Thùy');
    expect(thuyDetail.students).toHaveLength(1);
    expect(thuyDetail.students[0].name).toBe('Thùy');

    // 2. Linked student (Đặng Thị Hồng Xuân)
    const xuanDetail = await classroomsService.getClassDetails('private-student-linked-1', 'teacher-A');
    expect(xuanDetail).toBeDefined();
    expect(xuanDetail.id).toBe('private-student-linked-1');
    expect(xuanDetail.isPrivate).toBe(true);
    expect(xuanDetail.students).toHaveLength(1);
    expect(xuanDetail.students[0].name).toBe('Đặng Thị Hồng Xuân');
  });

  it('TC-CLASS-DETAIL-02: Teacher mở group class hợp lệ', async () => {
    const groupDetail = await classroomsService.getClassDetails('class-group-1', 'teacher-A');
    expect(groupDetail).toBeDefined();
    expect(groupDetail.id).toBe('class-group-1');
    expect(groupDetail.isPrivate).toBe(false);
    expect(groupDetail.name).toBe('Lớp Toán 10A1');
    expect(groupDetail.students).toHaveLength(2);
  });

  it('TC-CLASS-DETAIL-03: Private class trả về danh sách students hợp lệ cho bảng học sinh', async () => {
    const students = await classroomsService.getClassStudents('private-ts-external-thuy', 'teacher-A');
    expect(students).toBeDefined();
    expect(students).toHaveLength(1);
    expect(students[0].name).toBe('Thùy');
    expect(students[0].stt).toBe(1);
    expect(students[0].status).toBe('ACTIVE');

    const linkedStudents = await classroomsService.getClassStudents('private-student-linked-1', 'teacher-A');
    expect(linkedStudents).toHaveLength(1);
    expect(linkedStudents[0].name).toBe('Đặng Thị Hồng Xuân');
    expect(linkedStudents[0].email).toBe('xuan@student.vn');
  });

  it('TC-CLASS-DETAIL-04: Class không tồn tại -> trả về 404 NotFoundException', async () => {
    await expect(classroomsService.getClassDetails('class-not-found', 'teacher-A')).rejects.toThrow(NotFoundException);
    await expect(classroomsService.getClassDetails('private-not-found', 'teacher-A')).rejects.toThrow(NotFoundException);
    await expect(classroomsService.getClassStudents('class-not-found', 'teacher-A')).rejects.toThrow(NotFoundException);
    await expect(classroomsService.getClassStudents('private-not-found', 'teacher-A')).rejects.toThrow(NotFoundException);
  });

  it('TC-CLASS-DETAIL-05: Teacher khác truy cập class của Teacher A -> trả về 403 ForbiddenException', async () => {
    // 1. Group class
    await expect(classroomsService.getClassDetails('class-group-1', 'teacher-B')).rejects.toThrow(ForbiddenException);
    await expect(classroomsService.getClassStudents('class-group-1', 'teacher-B')).rejects.toThrow(ForbiddenException);

    // 2. Private class
    await expect(classroomsService.getClassDetails('private-ts-external-thuy', 'teacher-B')).rejects.toThrow(ForbiddenException);
    await expect(classroomsService.getClassStudents('private-ts-external-thuy', 'teacher-B')).rejects.toThrow(ForbiddenException);
    await expect(classroomsService.getClassDetails('private-student-linked-1', 'teacher-B')).rejects.toThrow(ForbiddenException);
    await expect(classroomsService.getClassStudents('private-student-linked-1', 'teacher-B')).rejects.toThrow(ForbiddenException);
  });

  it('TC-CLASS-DETAIL-06: Private class không có class_students -> không crash 500, trả về rỗng an toàn', async () => {
    const emptyDetail = await classroomsService.getClassDetails('private-empty-students', 'teacher-A');
    expect(emptyDetail).toBeDefined();
    expect(emptyDetail.students).toHaveLength(0);

    const emptyStudents = await classroomsService.getClassStudents('private-empty-students', 'teacher-A');
    expect(emptyStudents).toEqual([]);
  });

  it('TC-CLASS-DETAIL-07: GET detail & GET students là STRICTLY READ-ONLY (không INSERT/UPDATE/SAVE DB)', async () => {
    await classroomsService.getClassDetails('private-ts-external-thuy', 'teacher-A');
    await classroomsService.getClassStudents('private-ts-external-thuy', 'teacher-A');
    await classroomsService.getClassDetails('private-student-linked-1', 'teacher-A');
    await classroomsService.getClassStudents('private-student-linked-1', 'teacher-A');
    await classroomsService.getClassDetails('class-group-1', 'teacher-A');
    await classroomsService.getClassStudents('class-group-1', 'teacher-A');

    expect(fakeClassRepo.save).not.toHaveBeenCalled();
    expect(fakeProfileRepo.save).not.toHaveBeenCalled();
    expect(fakeUserRepo.save).not.toHaveBeenCalled();
  });

  it('TC-CLASS-DETAIL-08: Refresh detail page -> kết quả trả về nhất quán, không lỗi', async () => {
    const firstCall = await classroomsService.getClassDetails('private-ts-external-thuy', 'teacher-A');
    const secondCall = await classroomsService.getClassDetails('private-ts-external-thuy', 'teacher-A');
    expect(firstCall.name).toBe(secondCall.name);
    expect(firstCall.students).toEqual(secondCall.students);

    const firstStudents = await classroomsService.getClassStudents('private-ts-external-thuy', 'teacher-A');
    const secondStudents = await classroomsService.getClassStudents('private-ts-external-thuy', 'teacher-A');
    expect(firstStudents).toEqual(secondStudents);
  });

  it('TC-CLASS-DETAIL-09: Logout / Login mở lại -> tải đúng dữ liệu của giáo viên đang đăng nhập', async () => {
    // Teacher A can access
    const teacherAResult = await classroomsService.getClassDetails('private-ts-external-thuy', 'teacher-A');
    expect(teacherAResult).toBeDefined();

    // Teacher B logs in and tries to access -> 403
    await expect(classroomsService.getClassDetails('private-ts-external-thuy', 'teacher-B')).rejects.toThrow(ForbiddenException);
  });

  it('TC-CLASS-DETAIL-10: Các fix anti-resurrection vẫn PASS và không bị ảnh hưởng', async () => {
    // Viewing a classroom detail never revives a student or creates unexpected profiles
    const initialProfileCount = profileStore.length;
    await classroomsService.getClassDetails('private-ts-external-thuy', 'teacher-A');
    await classroomsService.getClassStudents('private-ts-external-thuy', 'teacher-A');
    expect(profileStore.length).toBe(initialProfileCount);
  });
});
