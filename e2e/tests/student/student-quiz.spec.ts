import { test, expect } from '@playwright/test';
import { StudentQuizPage } from '../../pages/student/student-quiz.page';
import { StudentExamPage } from '../../pages/student/student-exam.page';
import { ApiHelper } from '../../utils/api-helper';
import { TEST_USERS } from '../../utils/constants';

test.describe('Student Module — Quiz Discovery & Security', () => {
  test.use({ storageState: 'e2e/.auth/student.json' });

  let teacherApi: ApiHelper;
  let studentApi: ApiHelper;
  let studentId: string;
  let classId: string;
  let publishedQuizId: string;
  let publishedQuizTitle: string;
  let draftQuizId: string;

  test.beforeAll(async () => {
    teacherApi = await ApiHelper.create();
    await teacherApi.login(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);

    studentApi = await ApiHelper.create();
    const stuLogin = await studentApi.login(TEST_USERS.STUDENT.email, TEST_USERS.STUDENT.password);
    studentId = stuLogin.body?.data?.user?.id;

    const timestamp = Date.now();

    // 1. Tạo lớp học và cho học sinh tham gia để gán bài thi
    const classRes = await teacherApi.post('/classrooms', {
      name: `E2E QuizClass ${timestamp}`,
      subject: 'Tin Học',
      description: 'Lớp học kiểm thử đề thi',
    });
    classId = classRes.body?.data?.id;
    const inviteCode = classRes.body?.data?.inviteCode;

    if (inviteCode) {
      await studentApi.post('/classrooms/join', { inviteCode });
    }

    // 2. Tạo đề thi PUBLISHED có gán vào classId
    publishedQuizTitle = `E2E Published Quiz ${timestamp}`;
    const pubQuizRes = await teacherApi.post('/quizzes', {
      title: publishedQuizTitle,
      description: 'Mô tả bài kiểm tra đã xuất bản',
      subject: 'Tin Học',
      durationMinutes: 30,
      totalPoints: 1000,
      classId,
      assignedStudentIds: [studentId],
    });
    publishedQuizId = pubQuizRes.body?.data?.id;

    // Thêm 2 câu hỏi (tổng 1000 điểm để có thể Publish)
    await teacherApi.post(`/quizzes/${publishedQuizId}/questions`, {
      content: 'Câu hỏi số 1: HTML là gì?',
      type: 'SINGLE_CHOICE',
      score: 500,
      points: 500,
      order: 1,
      explanation: 'HTML là ngôn ngữ đánh dấu siêu văn bản',
      options: [
        { text: 'HyperText Markup Language', isCorrect: true },
        { text: 'HighText Machine Language', isCorrect: false },
      ],
    });

    await teacherApi.post(`/quizzes/${publishedQuizId}/questions`, {
      content: 'Câu hỏi số 2: CSS dùng để làm gì?',
      type: 'SINGLE_CHOICE',
      score: 500,
      points: 500,
      order: 2,
      explanation: 'CSS dùng để định dạng giao diện',
      options: [
        { text: 'Định dạng giao diện web', isCorrect: true },
        { text: 'Xử lý logic backend', isCorrect: false },
      ],
    });

    // Xuất bản bài thi
    await teacherApi.post(`/quizzes/${publishedQuizId}/publish`);

    // 3. Tạo đề thi DRAFT (chưa xuất bản)
    const draftQuizRes = await teacherApi.post('/quizzes', {
      title: `E2E Draft Quiz ${timestamp}`,
      description: 'Bài kiểm tra đang soạn thảo',
      subject: 'Tin Học',
      durationMinutes: 20,
      totalPoints: 1000,
      classId,
    });
    draftQuizId = draftQuizRes.body?.data?.id;
  });

  test('TC-STU-007: Học sinh xem Danh sách bài thi khả dụng (/student/quizzes)', async ({ page }) => {
    test.skip(!publishedQuizId, 'Không có đề thi published');

    const quizPage = new StudentQuizPage(page);
    await quizPage.goto();
    await quizPage.expectLoaded();

    // Tìm kiếm đề thi vừa tạo
    await quizPage.searchQuiz(publishedQuizTitle);
    const card = quizPage.getQuizCard(publishedQuizTitle);
    await expect(card).toBeVisible({ timeout: 10000 });

    // Lọc theo môn học
    await quizPage.filterSubject('Tin Học');
    await expect(card).toBeVisible();
  });

  test('TC-STU-008: Học sinh mở trang chi tiết bài thi đã xuất bản (/student/quizzes/:id)', async ({ page }) => {
    test.skip(!publishedQuizId, 'Không có đề thi published');

    const examPage = new StudentExamPage(page);
    await examPage.gotoDetail(publishedQuizId);
    await examPage.expectDetailLoaded();

    // Xác nhận tiêu đề và các thông tin cấu hình
    await expect(examPage.detailTitle).toContainText(publishedQuizTitle);
    await expect(page.locator('text=30 phút')).toBeVisible();
    await expect(page.locator('text=2 câu')).toBeVisible();
    await expect(page.locator('text=Quy định phòng thi trực tuyến')).toBeVisible();
    await expect(examPage.startExamTriggerBtn).toBeVisible();
  });

  test('TC-STU-009: Học sinh không thể truy cập bài kiểm tra đang ở trạng thái bản thảo (DRAFT)', async () => {
    test.skip(!draftQuizId, 'Không có đề thi draft');

    // Gọi API chi tiết đề thi dưới quyền Học sinh
    const res = await studentApi.get(`/quizzes/${draftQuizId}`);
    
    // Backend ném BadRequestException (status 400)
    expect(res.status).toBe(400);
    expect(res.body?.message).toContain('Bài kiểm tra này chưa được xuất bản hoặc đã đóng');
  });

  test('TC-STU-010: Bảo mật đề thi: API lấy câu hỏi không tiết lộ đáp án đúng và lời giải cho Học sinh', async () => {
    test.skip(!publishedQuizId, 'Không có đề thi published');

    // 1. Học sinh gọi API lấy danh sách câu hỏi
    const studentRes = await studentApi.get(`/quizzes/${publishedQuizId}/questions`);
    expect(studentRes.status).toBe(200);
    const studentQuestions = studentRes.body?.data || [];
    expect(studentQuestions.length).toBeGreaterThan(0);

    for (const q of studentQuestions) {
      // Lời giải (explanation) phải bị ẩn hoàn toàn
      expect(q.explanation).toBeUndefined();

      // Mọi option KHÔNG được chứa trường isCorrect
      for (const opt of q.options) {
        expect(opt.isCorrect).toBeUndefined();
      }
    }

    // 2. Giáo viên gọi API lấy cùng bài thi thì PHẢI có isCorrect và explanation
    const teacherRes = await teacherApi.get(`/quizzes/${publishedQuizId}/questions`);
    expect(teacherRes.status).toBe(200);
    const teacherQuestions = teacherRes.body?.data || [];
    expect(teacherQuestions.length).toBeGreaterThan(0);

    const firstTeacherQ = teacherQuestions[0];
    expect(firstTeacherQ.explanation).toBeTruthy();
    expect(firstTeacherQ.options.some((o: any) => o.isCorrect === true)).toBe(true);
  });
});
