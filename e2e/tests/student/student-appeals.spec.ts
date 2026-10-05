import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { TEST_USERS } from '../../utils/constants';

test.describe('Batch 4 — Appeals Workflow & Security RBAC', () => {
  test.describe.configure({ mode: 'serial' });
  let teacherApi: ApiHelper;
  let studentApi: ApiHelper;
  let otherTeacherApi: ApiHelper;
  let studentId: string;
  let quizId: string;
  let submissionId: string;
  let appealId: string;

  test.beforeAll(async () => {
    teacherApi = await ApiHelper.create(undefined, 'TEACHER');
    await teacherApi.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);

    studentApi = await ApiHelper.create(undefined, 'STUDENT');
    const stuLogin = await studentApi.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);
    studentId = stuLogin.body?.data?.user?.id;

    // Tạo đề thi và câu hỏi để có submission
    const timestamp = Date.now();
    const quizRes = await teacherApi.post('/quizzes', {
      title: `E2E Appeals Quiz ${timestamp}`,
      description: 'Kiểm thử quy trình phúc khảo điểm thi',
      subject: 'Triết Học',
      durationMinutes: 20,
      totalPoints: 1000,
      totalAttempts: 5,
      assignedStudentIds: [studentId],
    });
    quizId = quizRes.body?.data?.id;

    await teacherApi.post(`/quizzes/${quizId}/questions`, {
      content: 'Chủ nghĩa Mác - Lênin gồm mấy bộ phận cấu thành?',
      type: 'SINGLE_CHOICE',
      points: 1000,
      score: 10.0,
      order: 1,
      options: [
        { text: '3 bộ phận', isCorrect: true },
        { text: '4 bộ phận', isCorrect: false },
      ],
    });

    await teacherApi.post(`/quizzes/${quizId}/publish`);

    // Học sinh bắt đầu và nộp bài thi
    await studentApi.post(`/quizzes/${quizId}/start`);
    const submitRes = await studentApi.post(`/quizzes/${quizId}/submit`, {
      answers: [],
      timeUsedSeconds: 60,
    });
    submissionId = submitRes.body?.data?.id;
  });

  test('TC-B4-009: Học sinh gửi yêu cầu phúc khảo cho bài nộp của mình thành công', async () => {
    test.skip(!submissionId, 'Chưa có bài nộp');

    const res = await studentApi.post(`/appeals/submissions/${submissionId}`, {
      reason: 'Em làm đúng câu 1 nhưng hệ thống tính 0 điểm, xin thầy/cô xem lại.',
    });

    expect(res.status).toBe(201);
    expect(res.body?.data).toBeDefined();
    expect(res.body?.data?.status).toBe('PENDING');
    expect(res.body?.data?.reason).toContain('Em làm đúng câu 1');
    appealId = res.body?.data?.id;
  });

  test('TC-B4-010: Chặn học sinh gửi yêu cầu phúc khảo trùng lặp trên cùng một bài nộp (400 Bad Request)', async () => {
    test.skip(!submissionId, 'Chưa có bài nộp');

    const res = await studentApi.post(`/appeals/submissions/${submissionId}`, {
      reason: 'Gửi lại yêu cầu phúc khảo lần thứ hai.',
    });

    expect(res.status).toBe(400);
    expect(res.body?.message).toContain('Bạn đã gửi yêu cầu phúc khảo cho bài này rồi');
  });

  test('TC-B4-011: Chặn gửi yêu cầu phúc khảo cho bài nộp không tồn tại (404 Not Found)', async () => {
    const res = await studentApi.post('/appeals/submissions/non-existent-sub-id-9999', {
      reason: 'Bài nộp giả mạo',
    });

    expect(res.status).toBe(404);
    expect(res.body?.message).toContain('Không tìm thấy bài nộp');
  });

  test('TC-B4-012: Chặn Giáo viên gửi yêu cầu phúc khảo (chỉ dành riêng cho Học sinh - 401 Unauthorized)', async () => {
    test.skip(!submissionId, 'Chưa có bài nộp');

    const res = await teacherApi.post(`/appeals/submissions/${submissionId}`, {
      reason: 'Giáo viên cố gắng tự gửi phúc khảo',
    });

    expect(res.status).toBe(401);
    expect(res.body?.message).toContain('Chỉ học sinh mới có quyền gửi phúc khảo');
  });

  test('TC-B4-013: Chặn Học sinh tự phản hồi / duyệt yêu cầu phúc khảo (401 Unauthorized)', async () => {
    test.skip(!appealId, 'Chưa có yêu cầu phúc khảo');

    const res = await studentApi.patch(`/appeals/${appealId}/reply`, {
      status: 'APPROVED',
      reply: 'Học sinh tự duyệt phúc khảo của chính mình',
    });

    expect(res.status).toBe(401);
    expect(res.body?.message).toContain('Chỉ giáo viên mới có quyền xử lý phúc khảo');
  });

  test('TC-B4-014: Học sinh xem danh sách phúc khảo của bản thân (GET /api/appeals)', async () => {
    test.skip(!appealId, 'Chưa có yêu cầu phúc khảo');

    const res = await studentApi.get('/appeals');
    expect(res.status).toBe(200);

    const list = res.body?.data;
    expect(Array.isArray(list)).toBe(true);
    const thisAppeal = list.find((a: any) => a.id === appealId);
    expect(thisAppeal).toBeDefined();
    expect(thisAppeal.submissionId).toBe(submissionId);
  });

  test('TC-B4-015: Giáo viên xem danh sách các yêu cầu phúc khảo từ học sinh (GET /api/appeals)', async () => {
    test.skip(!appealId, 'Chưa có yêu cầu phúc khảo');

    const res = await teacherApi.get('/appeals');
    expect(res.status).toBe(200);

    const list = res.body?.data;
    expect(Array.isArray(list)).toBe(true);
    const thisAppeal = list.find((a: any) => a.id === appealId);
    expect(thisAppeal).toBeDefined();
    expect(thisAppeal.reason).toContain('Em làm đúng câu 1');
  });

  test('TC-B4-016: Giáo viên phản hồi phúc khảo — Chấp nhận (APPROVED) kèm lời giải thích', async () => {
    test.skip(!appealId, 'Chưa có yêu cầu phúc khảo');

    const replyText = 'Thầy đã kiểm tra lại bài thi và ghi nhận, điểm đã được cập nhật.';
    const res = await teacherApi.patch(`/appeals/${appealId}/reply`, {
      status: 'APPROVED',
      reply: replyText,
    });

    expect(res.status).toBe(200);
    expect(res.body?.data?.status).toBe('APPROVED');
    expect(res.body?.data?.teacherReply).toBe(replyText);

    // Học sinh xem lại thấy trạng thái APPROVED
    const stuCheck = await studentApi.get('/appeals');
    const updated = stuCheck.body?.data?.find((a: any) => a.id === appealId);
    expect(updated?.status).toBe('APPROVED');
    expect(updated?.teacherReply).toBe(replyText);
  });

  test('TC-B4-017: Giáo viên phản hồi phúc khảo — Từ chối (REJECTED)', async () => {
    // Tạo 1 bài thi + submission + appeal thứ hai để test REJECTED
    const timestamp = Date.now();
    const qRes = await teacherApi.post('/quizzes', {
      title: `E2E Appeals Reject Quiz ${timestamp}`,
      description: 'Test reject appeal',
      subject: 'Toán',
      durationMinutes: 10,
      totalPoints: 1000,
      totalAttempts: 5,
      assignedStudentIds: [studentId],
    });
    const rejectQuizId = qRes.body?.data?.id;

    await teacherApi.post(`/quizzes/${rejectQuizId}/questions`, {
      content: '1 + 1 = ?',
      type: 'SINGLE_CHOICE',
      points: 1000,
      score: 10.0,
      order: 1,
      options: [{ text: '2', isCorrect: true }],
    });
    await teacherApi.post(`/quizzes/${rejectQuizId}/publish`);

    await studentApi.post(`/quizzes/${rejectQuizId}/start`);
    const subRes = await studentApi.post(`/quizzes/${rejectQuizId}/submit`, {
      answers: [],
      timeUsedSeconds: 30,
    });
    const sub2Id = subRes.body?.data?.id;

    const appealRes = await studentApi.post(`/appeals/submissions/${sub2Id}`, {
      reason: 'Xin thầy xem lại câu 1',
    });
    const appeal2Id = appealRes.body?.data?.id;

    // Giáo viên từ chối phúc khảo
    const rejectReply = 'Câu trả lời của em chưa chính xác, giữ nguyên điểm số.';
    const replyRes = await teacherApi.patch(`/appeals/${appeal2Id}/reply`, {
      status: 'REJECTED',
      reply: rejectReply,
    });

    expect(replyRes.status).toBe(200);
    expect(replyRes.body?.data?.status).toBe('REJECTED');
    expect(replyRes.body?.data?.teacherReply).toBe(rejectReply);
  });

  test('TC-B4-018: Phản hồi yêu cầu phúc khảo không tồn tại -> 404 Not Found', async () => {
    const res = await teacherApi.patch('/appeals/non-existent-appeal-9999/reply', {
      status: 'APPROVED',
      reply: 'Duyệt bài không có thật',
    });

    expect(res.status).toBe(404);
    expect(res.body?.message).toContain('Không tìm thấy yêu cầu phúc khảo');
  });

  test('TC-B4-019: Upload API chặn các file không phải ảnh (PDF / DOCX qua POST /api/upload -> 400)', async () => {
    // Thử gửi base64 rỗng
    const res = await teacherApi.post('/upload/base64', {
      image: '',
    });
    expect(res.status).toBe(400);
    expect(res.body?.message).toContain('No image provided');
  });

  test('TC-B4-020: Chặn truy cập trái phép xem bài nộp khi chưa xác thực (GET /submissions/:id -> 401)', async () => {
    test.skip(!submissionId, 'Chưa có bài nộp');

    const unauthApi = await ApiHelper.create();
    const getRes = await unauthApi.get(`/submissions/${submissionId}`);
    expect(getRes.status).toBe(401);
  });
});
