import 'dotenv/config';
import mysql from 'mysql2/promise';

/**
 * Creates the server-side attempt ledger. This migration deliberately refuses
 * non-loopback targets: production deployment must use its managed migration
 * process, not this local/test utility.
 */
export async function createQuizAttemptsTable() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const database = process.env.DB_DATABASE || 'quizmaster';
  const environment = process.env.NODE_ENV || '';
  const allowedDatabases = new Set(['quizmaster', 'quizmaster_local', 'quizmaster_test', 'quizmaster_external_migration_test']);
  if (!['localhost', '127.0.0.1', '::1'].includes(host) || !['development', 'test'].includes(environment) || !allowedDatabases.has(database) ||
      process.env.DB_MIGRATION_CONFIRM !== 'quiz-attempts-v1') {
    throw new Error('Refusing schema migration: require development/test, an allowlisted database, and DB_MIGRATION_CONFIRM=quiz-attempts-v1.');
  }
  const connection = await mysql.createConnection({
    host, port, database, user: process.env.DB_USERNAME || 'root', password: process.env.DB_PASSWORD || '',
  });
  try {
    await connection.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name varchar(128) NOT NULL PRIMARY KEY,
      appliedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ) ENGINE=InnoDB`);
    const [applied] = await connection.execute<any[]>('SELECT name FROM schema_migrations WHERE name = ?', ['20261118_quiz_attempts_v1']);
    if (applied.length) return;
    await connection.execute(`CREATE TABLE IF NOT EXISTS quiz_attempts (
      id varchar(64) NOT NULL,
      quizId varchar(64) NOT NULL,
      studentId varchar(64) NOT NULL,
      attemptNumber int NOT NULL,
      status varchar(20) NOT NULL DEFAULT 'IN_PROGRESS',
      questionSnapshot json NOT NULL,
      startedAt varchar(50) NOT NULL,
      expiresAt varchar(50) NOT NULL,
      submittedAt varchar(50) NULL,
      submissionId varchar(64) NULL,
      createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      UNIQUE KEY UQ_quiz_attempt_student_number (quizId, studentId, attemptNumber),
      UNIQUE KEY UQ_quiz_attempt_submission (submissionId),
      KEY IDX_quiz_attempt_quiz (quizId),
      KEY IDX_quiz_attempt_student (studentId),
      KEY IDX_quiz_attempt_status (status)
    ) ENGINE=InnoDB`);
    const ensureColumn = async (table: string, column: string, definition: string) => {
      const [existing] = await connection.execute<any[]>(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column]);
      if (!existing.length) await connection.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    };
    await ensureColumn('quiz_attempts', 'quizSnapshot', 'JSON NULL');
    await ensureColumn('quiz_attempts', 'draftAnswers', 'JSON NULL');
    await ensureColumn('submissions', 'answerReleaseAt', 'varchar(50) NULL');
    const [columns] = await connection.execute<any[]>(`SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_attempts'
        AND COLUMN_NAME IN ('questionSnapshot', 'quizSnapshot', 'draftAnswers')`);
    if (columns.length !== 3) throw new Error('quiz_attempts schema validation failed');
    await connection.execute('INSERT INTO schema_migrations (name) VALUES (?)', ['20261118_quiz_attempts_v1']);
  } finally {
    await connection.end();
  }
}

/** A destructive rollback is deliberately refused once attempts exist. */
export async function rollbackCreateQuizAttemptsTable() {
  throw new Error('Rollback is not automatic: quiz_attempts may contain assessment history. Archive data and use an approved manual rollback.');
}

if (process.argv[1]?.includes('create-quiz-attempts')) {
  createQuizAttemptsTable().then(() => console.log('quiz_attempts migration completed')).catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
