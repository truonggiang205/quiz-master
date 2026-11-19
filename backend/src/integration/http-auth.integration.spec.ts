import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHttpFixture } from './http.fixture.js';
let fixture: Awaited<ReturnType<typeof createHttpFixture>>;
describe('Nest HTTP authentication integration', () => {
  beforeAll(async () => { fixture = await createHttpFixture(); });
  afterAll(async () => { await fixture?.close(); });
  it('runs JwtAuthGuard through real HTTP and preserves role access', async () => {
    expect((await fixture.request('/quizzes')).status).toBe(401);
    expect((await fixture.request('/quizzes', 'invalid.token')).status).toBe(401);
    const student = await fixture.user('STUDENT');
    expect((await fixture.request('/quizzes', fixture.token(student, 'STUDENT'))).status).toBe(200);
  });
});
