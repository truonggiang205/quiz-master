import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

export async function createHttpFixture() {
  const required = ['E2E_TEST_MODE','E2E_DB_HOST','E2E_DB_PORT','E2E_DB_DATABASE','E2E_DB_USERNAME','E2E_DB_PASSWORD','E2E_DB_SERVER_UUID'];
  if (process.env.E2E_TEST_MODE !== 'true' || required.some(k => !process.env[k])) throw new Error('Integration DB is not verified.');
  const db = await mysql.createConnection({ host: process.env.E2E_DB_HOST, port: Number(process.env.E2E_DB_PORT), user: process.env.E2E_DB_USERNAME, password: process.env.E2E_DB_PASSWORD, database: process.env.E2E_DB_DATABASE });
  const [identity] = await db.query<any[]>('SELECT @@server_uuid AS serverUuid');
  if (identity[0]?.serverUuid !== process.env.E2E_DB_SERVER_UUID) throw new Error('Integration DB server UUID mismatch.');
  Object.assign(process.env, { DB_HOST: process.env.E2E_DB_HOST, DB_PORT: process.env.E2E_DB_PORT, DB_USERNAME: process.env.E2E_DB_USERNAME, DB_PASSWORD: process.env.E2E_DB_PASSWORD, DB_DATABASE: process.env.E2E_DB_DATABASE, DB_SYNCHRONIZE: 'false', NODE_ENV: 'test', JWT_SECRET: 'integration-test-secret' });
  const { AppModule } = await import('../app.module.js');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  const baseUrl = `http://127.0.0.1:${address.port}/api`;
  const namespace = `httpi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ids = { users: new Set<string>(), quizzes: new Set<string>(), questions: new Set<string>(), attempts: new Set<string>(), submissions: new Set<string>(), appeals: new Set<string>() };
  const remove = async (table: string, values: Set<string>) => {
    if (!values.size) return;
    const placeholders = Array.from(values).map(() => '?').join(',');
    await db.execute(`DELETE FROM \`${table}\` WHERE id IN (${placeholders})`, Array.from(values));
  };
  const jwt = app.get(JwtService);
  return {
    db, baseUrl, namespace,
    token: (id: string, role: string) => jwt.sign({ sub: id, id, role, name: id, email: `${id}@example.test` }),
    ids,
    register: { user: (id: string) => ids.users.add(id), quiz: (id: string) => ids.quizzes.add(id), question: (id: string) => ids.questions.add(id), attempt: (id: string) => ids.attempts.add(id), submission: (id: string) => ids.submissions.add(id), appeal: (id: string) => ids.appeals.add(id) },
    async user(role: string) { const id = `${namespace}-${role.toLowerCase()}-${ids.users.size}`; await db.execute('INSERT INTO users (id,name,email,password,role,isVerified,isActive) VALUES (?,?,?,?,?,1,1)', [id, id, `${id}@example.test`, await bcrypt.hash('test-pass', 4), role]); ids.users.add(id); return id; },
    request: (path: string, token?: string, init: RequestInit = {}) => fetch(`${baseUrl}${path}`, { ...init, headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } }),
    async close() {
      let cleanupError: unknown;
      try {
        // Verified dependency order: appeals -> submissions -> attempts -> questions -> quizzes -> users.
        await remove('appeals', ids.appeals); await remove('submissions', ids.submissions);
        await remove('quiz_attempts', ids.attempts); await remove('questions', ids.questions);
        await remove('quizzes', ids.quizzes); await remove('users', ids.users);
      } catch (error) { cleanupError = error; }
      try { await app.close(); } finally { await db.end(); }
      if (cleanupError) throw cleanupError;
    },
  };
}
