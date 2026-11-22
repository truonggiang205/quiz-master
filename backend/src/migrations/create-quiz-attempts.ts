import 'dotenv/config';
import mysql from 'mysql2/promise';

const MIGRATION_NAME = '20261118_quiz_attempts_v1';
const MIGRATION_LOCK = 'quizmaster:quiz_attempts:v1';

export interface QuizAttemptsMigrationReport {
  migration: string;
  database: string;
  serverUuid: string;
  alreadyRecorded: boolean;
}

/** Test seam: it is invoked only after the advisory lock is held, before DDL. */
export interface QuizAttemptsMigrationOptions {
  afterLockAcquired?: () => Promise<void> | void;
}

function configuredAllowlist(value: string | undefined, fallback: string[]): Set<string> {
  return new Set((value || fallback.join(',')).split(',').map(item => item.trim()).filter(Boolean));
}

/**
 * This command is intentionally never called by application startup.  It can
 * run against a remotely managed DB only after an operator supplies both the
 * exact database name and the MySQL server UUID obtained during an approved
 * preflight.  Thus a copied Render environment cannot accidentally migrate a
 * different Aiven instance.
 */
function readTarget() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const database = process.env.DB_DATABASE || 'quizmaster';
  const environment = process.env.DB_MIGRATION_ENVIRONMENT || process.env.NODE_ENV || '';
  const local = ['localhost', '127.0.0.1', '::1'].includes(host);
  const allowedDatabases = configuredAllowlist(
    process.env.DB_MIGRATION_DATABASE_ALLOWLIST,
    ['quizmaster', 'quizmaster_local', 'quizmaster_test', 'quizmaster_external_migration_test'],
  );
  const allowedEnvironments = configuredAllowlist(
    process.env.DB_MIGRATION_ENVIRONMENT_ALLOWLIST,
    local ? ['development', 'test'] : [],
  );
  const expectedServerUuid = process.env.DB_MIGRATION_SERVER_UUID || process.env.DB_MIGRATION_TEST_SERVER_UUID;

  if (process.env.DB_MIGRATION_CONFIRM !== 'quiz-attempts-v1' || !allowedDatabases.has(database) ||
      !allowedEnvironments.has(environment) || !expectedServerUuid) {
    throw new Error('Refusing schema migration: require DB_MIGRATION_CONFIRM=quiz-attempts-v1, an allowlisted DB_MIGRATION_ENVIRONMENT/database, and DB_MIGRATION_SERVER_UUID.');
  }
  // A remote target needs an additional, deliberately separate acknowledgement.
  if (!local && process.env.DB_MIGRATION_REMOTE_APPROVED !== 'quiz-attempts-v1') {
    throw new Error('Refusing remote schema migration: set DB_MIGRATION_REMOTE_APPROVED=quiz-attempts-v1 after approved backup/preflight.');
  }
  return { host, port, database, expectedServerUuid };
}

/**
 * Creates the server-side attempt ledger. This migration deliberately refuses
 * non-loopback targets: production deployment must use its managed migration
 * process, not this local/test utility.
 */
export async function createQuizAttemptsTable(options: QuizAttemptsMigrationOptions = {}): Promise<QuizAttemptsMigrationReport> {
  if (options.afterLockAcquired && process.env.NODE_ENV !== 'test') {
    throw new Error('Migration test hooks are only available when NODE_ENV=test.');
  }
  const { host, port, database, expectedServerUuid } = readTarget();
  const connection = await mysql.createConnection({
    host, port, database, user: process.env.DB_USERNAME || 'root', password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  let lockHeld = false;
  try {
    const [serverIdentity] = await connection.query<any[]>('SELECT @@server_uuid AS serverUuid');
    const serverUuid = serverIdentity[0]?.serverUuid;
    if (serverUuid !== expectedServerUuid) {
      throw new Error('Refusing schema migration: connected MySQL server does not match DB_MIGRATION_SERVER_UUID.');
    }
    const [lockRows] = await connection.query<any[]>('SELECT GET_LOCK(?, 0) AS acquired', [MIGRATION_LOCK]);
    if (Number(lockRows[0]?.acquired) !== 1) {
      throw new Error('Refusing schema migration: another quiz_attempts migration is running.');
    }
    lockHeld = true;
    await options.afterLockAcquired?.();

    // The application requires these relations but intentionally does not add
    // FKs: assessment history must survive a future quiz/user retention policy.
    const [requiredTables] = await connection.query<any[]>(`SELECT TABLE_NAME FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('quizzes', 'users', 'submissions')`);
    if (requiredTables.length !== 3) throw new Error('Preflight failed: quizzes, users and submissions must exist before quiz_attempts migration.');
    await connection.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name varchar(128) NOT NULL PRIMARY KEY,
      appliedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ) ENGINE=InnoDB`);
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
    // CREATE TABLE IF NOT EXISTS does not repair a table left by an interrupted
    // earlier run.  Add only missing indexes; a duplicate-data error from a
    // unique index is intentional evidence that an operator must remediate
    // data before recording this migration.
    const requiredIndexes: Array<{ name: string; ddl: string }> = [
      { name: 'UQ_quiz_attempt_student_number', ddl: 'ADD UNIQUE KEY UQ_quiz_attempt_student_number (quizId, studentId, attemptNumber)' },
      { name: 'UQ_quiz_attempt_submission', ddl: 'ADD UNIQUE KEY UQ_quiz_attempt_submission (submissionId)' },
      { name: 'IDX_quiz_attempt_quiz', ddl: 'ADD KEY IDX_quiz_attempt_quiz (quizId)' },
      { name: 'IDX_quiz_attempt_student', ddl: 'ADD KEY IDX_quiz_attempt_student (studentId)' },
      { name: 'IDX_quiz_attempt_status', ddl: 'ADD KEY IDX_quiz_attempt_status (status)' },
    ];
    const [existingIndexes] = await connection.execute<any[]>(`SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_attempts'`);
    const existingIndexNames = new Set(existingIndexes.map(index => index.INDEX_NAME));
    for (const index of requiredIndexes) {
      if (!existingIndexNames.has(index.name)) await connection.execute(`ALTER TABLE quiz_attempts ${index.ddl}`);
    }
    const [columns] = await connection.execute<any[]>(`SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_attempts'
        AND COLUMN_NAME IN ('questionSnapshot', 'quizSnapshot', 'draftAnswers')`);
    const expectedJsonColumns = new Set(['questionSnapshot', 'quizSnapshot', 'draftAnswers']);
    if (columns.length !== expectedJsonColumns.size || columns.some(column => column.DATA_TYPE !== 'json' || !expectedJsonColumns.has(column.COLUMN_NAME))) {
      throw new Error('quiz_attempts JSON snapshot schema validation failed');
    }
    const [indexes] = await connection.execute<any[]>(`SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quiz_attempts'
        AND INDEX_NAME IN ('PRIMARY', 'UQ_quiz_attempt_student_number', 'UQ_quiz_attempt_submission',
          'IDX_quiz_attempt_quiz', 'IDX_quiz_attempt_student', 'IDX_quiz_attempt_status')`);
    if (indexes.length !== 6) throw new Error('quiz_attempts index schema validation failed');

    // Do not trust a version row on its own: a manually altered or partially
    // restored schema must fail closed instead of being silently accepted.
    const [applied] = await connection.execute<any[]>('SELECT name FROM schema_migrations WHERE name = ?', [MIGRATION_NAME]);
    if (!applied.length) {
      await connection.execute('INSERT INTO schema_migrations (name) VALUES (?)', [MIGRATION_NAME]);
    }
    return { migration: MIGRATION_NAME, database, serverUuid, alreadyRecorded: Boolean(applied.length) };
  } finally {
    if (lockHeld) {
      try { await connection.query('SELECT RELEASE_LOCK(?)', [MIGRATION_LOCK]); } catch { /* close releases it */ }
    }
    await connection.end();
  }
}

/** A destructive rollback is deliberately refused once attempts exist. */
export async function rollbackCreateQuizAttemptsTable() {
  throw new Error('Rollback is not automatic: quiz_attempts may contain assessment history. Archive data and use an approved manual rollback.');
}

if (process.argv[1]?.includes('create-quiz-attempts')) {
  createQuizAttemptsTable().then(report => console.log('quiz_attempts migration completed', JSON.stringify(report))).catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
