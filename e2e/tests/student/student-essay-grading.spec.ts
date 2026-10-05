import { test, expect } from '@playwright/test';
import { ApiHelper } from '../../utils/api-helper';
import { TEST_USERS } from '../../utils/constants';
import { StudentExamPage } from '../../pages/student/student-exam.page';

test.describe('Batch 4 — Essay Auto/Manual Grading & Question Image Rendering', () => {
  test.describe.configure({ mode: 'serial' });
  test.use({ storageState: 'e2e/.auth/student.json' });

  let teacherApi: ApiHelper;
  let studentApi: ApiHelper;
  let studentId: string;

  // 1. Đề thi tự luận CÓ ĐIỀN ĐÁP ÁN (Auto-grading)
  let autoGradedQuizId: string;
  let essayQAutoId: string;

  // 2. Đề thi tự luận KHÔNG ĐIỀN ĐÁP ÁN (Manual grading)
  let manualGradedQuizId: string;
  let essayQManualId: string;

  // 3. Đề thi có câu hỏi đính kèm ảnh
  let imageQuizId: string;
  const sampleBase64Image =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  test.beforeAll(async () => {
    teacherApi = await ApiHelper.create(undefined, 'TEACHER');
    await teacherApi.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);

    studentApi = await ApiHelper.create(undefined, 'STUDENT');
    const stuLogin = await studentApi.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);
    studentId = stuLogin.body?.data?.user?.id;

    const timestamp = Date.now();
    const pastRelease = new Date(Date.now() - 60000).toISOString();

    // ── Setup 1: Đề thi tự luận có điền đáp án ──
    const q1Res = await teacherApi.post('/quizzes', {
      title: `E2E Essay Auto-Grading Quiz ${timestamp}`,
      description: 'Kiểm thử câu hỏi tự luận có điền đáp án tự động chấm',
      subject: 'Địa Lý',
      durationMinutes: 30,
      totalPoints: 1000,
      totalAttempts: 5,
      answerReleaseAt: pastRelease,
      assignedStudentIds: [studentId],
    });
    autoGradedQuizId = q1Res.body?.data?.id;

    const essayQRes = await teacherApi.post(`/quizzes/${autoGradedQuizId}/questions`, {
      content: 'Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là gì?',
      type: 'ESSAY',
      options: [],
      points: 500,
      score: 5.0,
      order: 1,
      essayRubric: {
        acceptedAnswers: ['Hà Nội', 'thành phố Hà Nội', 'Ha Noi'],
        criteria: [
          {
            id: 'crit-1',
            description: 'Nêu đúng tên thủ đô',
            keywords: ['Hà Nội', 'Ha Noi'],
            maxPoints: 500,
            requireAll: false,
          },
        ],
      },
    });
    essayQAutoId = essayQRes.body?.data?.id;

    // Câu 2: Trắc nghiệm (500 điểm)
    await teacherApi.post(`/quizzes/${autoGradedQuizId}/questions`, {
      content: 'Việt Nam nằm ở khu vực nào?',
      type: 'SINGLE_CHOICE',
      points: 500,
      score: 5.0,
      order: 2,
      options: [
        { text: 'Đông Nam Á', isCorrect: true },
        { text: 'Đông Bắc Á', isCorrect: false },
      ],
    });

    await teacherApi.post(`/quizzes/${autoGradedQuizId}/publish`);

    // ── Setup 2: Đề thi tự luận KHÔNG điền đáp án ──
    const q2Res = await teacherApi.post('/quizzes', {
      title: `E2E Essay Manual Grading Quiz ${timestamp}`,
      description: 'Kiểm thử câu hỏi tự luận không điền đáp án chờ giáo viên chấm',
      subject: 'Văn Học',
      durationMinutes: 30,
      totalPoints: 1000,
      totalAttempts: 5,
      answerReleaseAt: pastRelease,
      assignedStudentIds: [studentId],
    });
    manualGradedQuizId = q2Res.body?.data?.id;

    const essayQ2Res = await teacherApi.post(`/quizzes/${manualGradedQuizId}/questions`, {
      content: 'Hãy nêu cảm nghĩ của em về bài thơ Tây Tiến của Quang Dũng.',
      type: 'ESSAY',
      options: [],
      points: 1000,
      score: 10.0,
      order: 1,
      essayRubric: {
        acceptedAnswers: [],
        criteria: [],
      },
    });
    essayQManualId = essayQ2Res.body?.data?.id;

    await teacherApi.post(`/quizzes/${manualGradedQuizId}/publish`);

    // ── Setup 3: Đề thi có đính kèm ảnh ──
    const q3Res = await teacherApi.post('/quizzes', {
      title: `E2E Image Question Quiz ${timestamp}`,
      description: 'Kiểm thử hiển thị hình ảnh đề bài khi học sinh vào làm',
      subject: 'Hình Học',
      durationMinutes: 20,
      totalPoints: 1000,
      totalAttempts: 5,
      answerReleaseAt: pastRelease,
      assignedStudentIds: [studentId],
    });
    imageQuizId = q3Res.body?.data?.id;

    await teacherApi.post(`/quizzes/${imageQuizId}/questions`, {
      content: 'Quan sát hình ảnh dưới đây và cho biết đây là hình gì?',
      type: 'ESSAY',
      options: [],
      imageUrl: sampleBase64Image,
      points: 1000,
      score: 10.0,
      order: 1,
      essayRubric: {
        acceptedAnswers: ['Hình vuông', 'hình chữ nhật'],
      },
    });

    await teacherApi.post(`/quizzes/${imageQuizId}/publish`);
  });

  test('TC-B4-001: Giáo viên tạo câu hỏi tự luận có cấu hình đáp án tự động (acceptedAnswers & criteria)', async () => {
    test.skip(!autoGradedQuizId, 'Chưa có đề thi');

    const res = await teacherApi.get(`/quizzes/${autoGradedQuizId}/questions`);
    expect(res.status).toBe(200);

    const essayQ = res.body?.data?.find((q: any) => q.id === essayQAutoId);
    expect(essayQ).toBeDefined();
    expect(essayQ.type).toBe('ESSAY');
    expect(essayQ.essayRubric).toBeDefined();
    expect(essayQ.essayRubric.acceptedAnswers).toContain('Hà Nội');
  });

  test('TC-B4-002: Học sinh nộp bài tự luận CÓ ĐIỀN ĐÁP ÁN — Hệ thống TỰ ĐỘNG CHẤM điểm đúng tuyệt đối', async () => {
    test.skip(!autoGradedQuizId, 'Chưa có đề thi');

    // Bắt đầu làm bài
    await studentApi.post(`/quizzes/${autoGradedQuizId}/start`);

    // Nộp bài với câu trả lời tự luận đúng: "Thành phố Hà Nội"
    const submitRes = await studentApi.post(`/quizzes/${autoGradedQuizId}/submit`, {
      answers: [
        {
          questionId: essayQAutoId,
          essayText: 'Thành phố Hà Nội',
        },
      ],
      timeUsedSeconds: 45,
    });

    expect(submitRes.status).toBe(201);
    const subData = submitRes.body?.data;
    expect(subData).toBeDefined();

    // Điểm số phải được tự động chấm > 0
    expect(subData.score).toBeGreaterThan(0);
    const essayAns = subData.answers?.find((a: any) => a.questionId === essayQAutoId);
    expect(essayAns).toBeDefined();
    expect(essayAns.isCorrect).toBe(true);
    expect(essayAns.scoreAwarded).toBe(500);

    // Kiểm tra chi tiết bài nộp qua GET /submissions/:id
    const detailRes = await studentApi.get(`/submissions/${subData.id}`);
    expect(detailRes.status).toBe(200);
    const detailAns = detailRes.body?.data?.detailedAnswers?.find((a: any) => a.questionId === essayQAutoId);
    expect(detailAns.isCorrect).toBe(true);
    expect(detailAns.scoreAwarded).toBe(500);
  });

  test('TC-B4-003: Học sinh nộp bài tự luận CÓ ĐIỀN ĐÁP ÁN nhưng trả lời SAI — Hệ thống tự động chấm 0 điểm', async () => {
    test.skip(!autoGradedQuizId, 'Chưa có đề thi');

    await studentApi.post(`/quizzes/${autoGradedQuizId}/start`);

    const submitRes = await studentApi.post(`/quizzes/${autoGradedQuizId}/submit`, {
      answers: [
        {
          questionId: essayQAutoId,
          essayText: 'Không biết đáp án',
        },
      ],
      timeUsedSeconds: 30,
    });

    expect(submitRes.status).toBe(201);
    const subData = submitRes.body?.data;
    const essayAns = subData.answers?.find((a: any) => a.questionId === essayQAutoId);
    expect(essayAns).toBeDefined();
    expect(essayAns.isCorrect).toBe(false);
    expect(essayAns.scoreAwarded).toBe(0);
  });

  test('TC-B4-004: Giáo viên tạo đề tự luận KHÔNG ĐIỀN ĐÁP ÁN — Học sinh làm xong KHÔNG được tự động chấm (chờ giáo viên chấm)', async () => {
    test.skip(!manualGradedQuizId, 'Chưa có đề thi');

    await studentApi.post(`/quizzes/${manualGradedQuizId}/start`);

    const submitRes = await studentApi.post(`/quizzes/${manualGradedQuizId}/submit`, {
      answers: [
        {
          questionId: essayQManualId,
          essayText: 'Bài thơ Tây Tiến thể hiện vẻ đẹp bi tráng của người lính thời kỳ đầu kháng chiến chống Pháp.',
        },
      ],
      timeUsedSeconds: 60,
    });

    expect(submitRes.status).toBe(201);
    const subData = submitRes.body?.data;
    const essayAns = subData.answers?.find((a: any) => a.questionId === essayQManualId);
    expect(essayAns).toBeDefined();

    // Vì giáo viên không điền đáp án chấm, isCorrect phải là undefined (chờ chấm thủ công)
    expect(essayAns.isCorrect).toBeUndefined();
    expect(essayAns.scoreAwarded).toBe(0);

    // Kiểm tra danh sách bài nộp của học sinh: isFullyGraded = false
    const mySubsRes = await studentApi.get('/student/submissions');
    const thisSub = mySubsRes.body?.data?.find((s: any) => s.id === subData.id);
    expect(thisSub).toBeDefined();
    expect(thisSub.isFullyGraded).toBe(false);
  });

  test('TC-B4-005: Giáo viên chấm điểm thủ công cho bài nộp tự luận chưa có đáp án (POST /submissions/:id/grade)', async () => {
    test.skip(!manualGradedQuizId, 'Chưa có đề thi');

    // Lấy bài nộp gần nhất của đề thi manualGradedQuizId
    const res = await teacherApi.get(`/quizzes/${manualGradedQuizId}/results`);
    const submissions = res.body?.data?.submissions;
    expect(submissions?.length).toBeGreaterThan(0);
    const subToGrade = submissions[0];

    // Giáo viên chấm điểm 850/1000 cho câu tự luận
    const gradeRes = await teacherApi.post(`/submissions/${subToGrade.id}/grade`, {
      grades: [
        {
          questionId: essayQManualId,
          scoreAwarded: 850,
        },
      ],
    });

    expect(gradeRes.status).toBe(201);
    const updatedSub = gradeRes.body?.data;
    expect(updatedSub.score).toBe(850);
    expect(updatedSub.percentage).toBe(85);

    const gradedAns = updatedSub.answers?.find((a: any) => a.questionId === essayQManualId);
    expect(gradedAns.isCorrect).toBe(true);
    expect(gradedAns.scoreAwarded).toBe(850);

    // Sau khi chấm thủ công, học sinh xem lại lịch sử làm bài -> isFullyGraded = true
    const mySubsRes = await studentApi.get('/student/submissions');
    const thisSub = mySubsRes.body?.data?.find((s: any) => s.id === subToGrade.id);
    expect(thisSub?.isFullyGraded).toBe(true);
  });

  test('TC-B4-006: Hiển thị hình ảnh đề bài khi học sinh bấm vào làm bài thi (UI E2E trên Chromium)', async ({ page }) => {
    test.skip(!imageQuizId, 'Chưa có đề thi có ảnh');

    // Đăng nhập storage state học sinh
    await page.goto(`/student/quizzes/${imageQuizId}`);
    const examPage = new StudentExamPage(page);
    await examPage.expectDetailLoaded();

    await examPage.startExamFromDetail();
    await examPage.expectTakingLoaded();

    // Xác nhận thẻ ảnh đề bài có mặt và hiển thị src hợp lệ
    const questionImg = page.locator('img[alt="Đề bài"]').first();
    await expect(questionImg).toBeVisible({ timeout: 10000 });

    const src = await questionImg.getAttribute('src');
    expect(src).toBeTruthy();
    // Đảm bảo src không bị prepend sai thành http://localhost:3000data:
    expect(src).not.toContain('localhost:3000data:');
    expect(src).toMatch(/^(data:image\/|https?:\/\/|\/)/);
  });

  test('TC-B4-007: Hiển thị hình ảnh đề bài và trạng thái chấm trên trang Kết quả (UI E2E)', async ({ page }) => {
    test.skip(!imageQuizId, 'Chưa có đề thi có ảnh');

    const examPage = new StudentExamPage(page);
    await page.goto(`/student/quizzes/${imageQuizId}/take`);
    await examPage.expectTakingLoaded();

    // Nhập câu trả lời tự luận: "Hình vuông" (đáp án đúng)
    const textarea = page.locator('textarea[placeholder*="Nhập câu trả lời"]').first();
    await textarea.fill('Hình vuông');

    // Nộp bài
    await examPage.openSubmitModal();
    await examPage.confirmSubmit();

    // Chuyển hướng tới trang kết quả
    await expect(page).toHaveURL(new RegExp(`/student/quizzes/${imageQuizId}/result`), { timeout: 15000 });

    // Kiểm tra ảnh đề bài trên trang kết quả
    const resultImg = page.locator('img[alt="Đề bài"]').first();
    await expect(resultImg).toBeVisible({ timeout: 10000 });

    // Kiểm tra badge tự động chấm: Chính xác
    await expect(page.locator('text=Chính xác (+10.00 điểm)')).toBeVisible({ timeout: 10000 });
  });

  test('TC-B4-008: Đề thi hỗn hợp Trắc nghiệm + Tự luận (có đáp án) — Tính toán tổng điểm chính xác', async () => {
    test.skip(!autoGradedQuizId, 'Chưa có đề thi');

    // Lấy câu hỏi trắc nghiệm
    const questionsRes = await teacherApi.get(`/quizzes/${autoGradedQuizId}/questions`);
    const mcQuestion = questionsRes.body?.data?.find((q: any) => q.type === 'SINGLE_CHOICE');
    const correctOpt = mcQuestion.options?.find((o: any) => o.isCorrect);

    await studentApi.post(`/quizzes/${autoGradedQuizId}/start`);

    // Học sinh làm: Câu tự luận ĐÚNG (+500đ) và Câu trắc nghiệm ĐÚNG (+500đ)
    const submitRes = await studentApi.post(`/quizzes/${autoGradedQuizId}/submit`, {
      answers: [
        {
          questionId: essayQAutoId,
          essayText: 'Hà Nội',
        },
        {
          questionId: mcQuestion.id,
          selectedOptionIds: [correctOpt.id],
        },
      ],
      timeUsedSeconds: 70,
    });

    expect(submitRes.status).toBe(201);
    const subData = submitRes.body?.data;
    // Tổng điểm: 500 + 500 = 1000 (10.00 điểm, 100%)
    expect(subData.score).toBe(1000);
    expect(subData.percentage).toBe(100);
    expect(subData.correctCount).toBe(2);
    expect(subData.wrongCount).toBe(0);
  });
});
