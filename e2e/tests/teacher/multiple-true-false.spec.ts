import { expect, test } from '@playwright/test';
import { STORAGE_PATHS, TEST_CONFIG } from '../../utils/constants';

test.use({ storageState: STORAGE_PATHS.TEACHER });

test('soạn, lưu, xem trước và làm câu đúng sai nhiều nhận định', async ({ page, browser }) => {
  const title = `Đúng sai E2E ${Date.now()}`;
  await page.goto('/teacher/quizzes/create');
  await page.getByLabel('Tiêu đề bài kiểm tra').fill(title);
  await page.locator('select').filter({ has: page.locator('option[value="MULTIPLE_TRUE_FALSE"]') }).selectOption('MULTIPLE_TRUE_FALSE');
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await page.getByLabel('Nội dung câu hỏi').first().fill('Nhận định nào đúng?');
  for (let i = 0; i < 4; i++) {
    await page.getByLabel(`Nội dung nhận định ${String.fromCharCode(97 + i)})`).fill(`Nhận định ${i + 1}`);
  }
  await page.getByRole('radio', { name: 'Sai' }).nth(1).check();
  await page.getByRole('button', { name: 'Thêm nhận định', exact: true }).click();
  await page.getByLabel('Nội dung nhận định e)').fill('Nhận định thứ năm');
  await page.getByRole('button', { name: 'Xóa nhận định e)' }).click();
  await page.getByRole('button', { name: 'Lưu bản thảo' }).click();
  await expect(page).toHaveURL(/\/teacher\/quizzes$/, { timeout: 15000 });

  const token = await page.evaluate(() => localStorage.getItem('quizmaster_auth_token'));
  const headers = { Authorization: `Bearer ${token}` };
  const list = await page.request.get(`${TEST_CONFIG.API_URL}/quizzes`, { headers });
  const quiz = (await list.json()).data.find((item: any) => item.title === title);
  expect(quiz).toBeTruthy();
  try {
    await page.goto(`/teacher/quizzes/${quiz.id}/edit`);
    await expect(page.getByLabel('Nội dung nhận định a)')).toHaveValue('Nhận định 1');
    await expect(page.getByRole('radio', { name: 'Sai' }).nth(1)).toBeChecked();
    await page.getByLabel('Nội dung nhận định a)').fill('Nhận định đã sửa');
    await page.getByRole('button', { name: 'Lưu bản thảo' }).click();
    await expect(page).toHaveURL(/\/teacher\/quizzes$/, { timeout: 15000 });
    await page.goto(`/teacher/quizzes/${quiz.id}/preview`);
    await expect(page.getByText('Nhận định đã sửa')).toBeVisible();
    await expect(page.getByText('Đáp án: Đúng').first()).toBeVisible();
    const publish = await page.request.post(`${TEST_CONFIG.API_URL}/quizzes/${quiz.id}/publish`, { headers });
    expect(publish.ok()).toBeTruthy();

    const student = await browser.newContext({ storageState: STORAGE_PATHS.STUDENT });
    const studentPage = await student.newPage();
    await studentPage.goto(`/student/quizzes/${quiz.id}/take`);
    await expect(studentPage.getByText('Nhận định đã sửa')).toBeVisible();
    const studentToken = await studentPage.evaluate(() => localStorage.getItem('quizmaster_auth_token'));
    const studentHeaders = { Authorization: `Bearer ${studentToken}` };
    const questionResponse = await studentPage.request.get(`${TEST_CONFIG.API_URL}/quizzes/${quiz.id}/questions`, { headers: studentHeaders });
    const question = (await questionResponse.json()).data[0];
    expect(question.options).toHaveLength(4);
    expect(question.options.every((option: any) => !('isCorrect' in option))).toBeTruthy();
    const radios = studentPage.getByRole('radio');
    await radios.nth(0).check();
    await radios.nth(1).check();
    await expect(radios.nth(0)).not.toBeChecked();
    await radios.nth(0).check();
    await radios.nth(2).check();
    await studentPage.reload();
    await expect(radios.nth(0)).toBeChecked();
    await expect(radios.nth(2)).toBeChecked();
    await studentPage.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    await studentPage.getByRole('button', { name: 'Xác nhận nộp bài' }).click();
    await expect(studentPage).toHaveURL(/\/result\?submissionId=/, { timeout: 15000 });
    const submissionId = new URL(studentPage.url()).searchParams.get('submissionId');
    const hiddenResponse = await studentPage.request.get(`${TEST_CONFIG.API_URL}/submissions/${submissionId}`, { headers: studentHeaders });
    const hidden = (await hiddenResponse.json()).data;
    expect(hidden.score).toBe(250);
    expect(JSON.stringify(hidden)).not.toContain('correctAnswer');
    const appeal = await studentPage.request.post(`${TEST_CONFIG.API_URL}/appeals/submissions/${submissionId}`, { headers: studentHeaders, data: { reason: 'Kiểm tra bảo mật kết quả' } });
    expect(appeal.ok()).toBeTruthy();
    const appeals = await studentPage.request.get(`${TEST_CONFIG.API_URL}/appeals`, { headers: studentHeaders });
    expect(JSON.stringify((await appeals.json()).data)).not.toContain('correctAnswer');
    const dashboard = await studentPage.request.get(`${TEST_CONFIG.API_URL}/dashboard/student`, { headers: studentHeaders });
    expect(JSON.stringify((await dashboard.json()).data)).not.toContain('correctAnswer');
    const teacherQuestion = (await (await page.request.get(`${TEST_CONFIG.API_URL}/quizzes/${quiz.id}/questions`, { headers })).json()).data[0];
    const editedOptions = teacherQuestion.options.map((option: any, index: number) => index === 0 ? { ...option, text: 'Nội dung đã đổi sau khi nộp', isCorrect: false } : option);
    const edit = await page.request.patch(`${TEST_CONFIG.API_URL}/questions/${teacherQuestion.id}`, { headers, data: { options: editedOptions } });
    expect(edit.ok()).toBeTruthy();
    const release = await page.request.patch(`${TEST_CONFIG.API_URL}/quizzes/${quiz.id}`, { headers, data: { answerReleaseAt: '2020-01-01T00:00:00.000Z' } });
    expect(release.ok()).toBeTruthy();
    const visibleResponse = await studentPage.request.get(`${TEST_CONFIG.API_URL}/submissions/${submissionId}`, { headers: studentHeaders });
    const visible = (await visibleResponse.json()).data;
    expect(visible.detailedAnswers[0].statementAnswers[0].correctAnswer).toBe(true);
    expect(visible.detailedAnswers[0].statementAnswers[0].text).toBe('Nhận định đã sửa');
    await student.close();
  } finally {
    await page.request.delete(`${TEST_CONFIG.API_URL}/quizzes/${quiz.id}`, { headers });
  }
});
