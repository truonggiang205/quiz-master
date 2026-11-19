import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mysql from 'mysql2/promise';
import { createQuizAttemptsTable } from '../migrations/create-quiz-attempts.js';

const required = ['E2E_TEST_MODE', 'E2E_DB_HOST', 'E2E_DB_PORT', 'E2E_DB_DATABASE', 'E2E_DB_USERNAME', 'E2E_DB_PASSWORD', 'E2E_DB_SERVER_UUID'] as const;
let connection: mysql.Connection;

describe('MySQL migration advisory-lock integration', () => {
  beforeAll(async () => {
    const missing = required.filter((name) => !process.env[name]);
    if (process.env.E2E_TEST_MODE !== 'true' || missing.length || process.env.E2E_DB_HOST !== '127.0.0.1' || process.env.E2E_DB_PORT !== '3307' || process.env.E2E_DB_DATABASE !== 'quizmaster') {
      throw new Error('Integration DB is not verified. Set explicit E2E_TEST_MODE/local DB identity variables; no test was run.');
    }
    connection = await mysql.createConnection({ host: process.env.E2E_DB_HOST, port: 3307, user: process.env.E2E_DB_USERNAME, password: process.env.E2E_DB_PASSWORD, database: process.env.E2E_DB_DATABASE });
    const [identity] = await connection.query<any[]>('SELECT @@server_uuid AS serverUuid');
    if (identity[0]?.serverUuid !== process.env.E2E_DB_SERVER_UUID) throw new Error('Integration DB server UUID mismatch.');
    Object.assign(process.env, {
      DB_HOST: process.env.E2E_DB_HOST, DB_PORT: process.env.E2E_DB_PORT, DB_DATABASE: process.env.E2E_DB_DATABASE,
      DB_USERNAME: process.env.E2E_DB_USERNAME, DB_PASSWORD: process.env.E2E_DB_PASSWORD, NODE_ENV: 'test',
      DB_MIGRATION_CONFIRM: 'quiz-attempts-v1', DB_MIGRATION_ENVIRONMENT: 'test',
      DB_MIGRATION_DATABASE_ALLOWLIST: 'quizmaster', DB_MIGRATION_SERVER_UUID: process.env.E2E_DB_SERVER_UUID,
    });
  });

  afterAll(async () => { await connection?.end(); });

  it('releases the MySQL advisory lock after a post-lock failure', async () => {
    await expect(createQuizAttemptsTable({ afterLockAcquired: () => { throw new Error('injected post-lock failure'); } })).rejects.toThrow('injected post-lock failure');
    const [rows] = await connection.query<any[]>('SELECT GET_LOCK(?, 0) AS acquired', ['quizmaster:quiz_attempts:v1']);
    expect(Number(rows[0]?.acquired)).toBe(1);
    await connection.query('SELECT RELEASE_LOCK(?)', ['quizmaster:quiz_attempts:v1']);
    await expect(createQuizAttemptsTable()).resolves.toMatchObject({ migration: '20261118_quiz_attempts_v1' });
  });
});
