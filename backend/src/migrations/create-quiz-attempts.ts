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
  if (!['localhost', '127.0.0.1', '::1'].includes(host) || process.env.NODE_ENV === 'production') {
    throw new Error('Refusing schema migration: only an explicitly local/test database is allowed.');
  }
  const connection = await mysql.createConnection({
    host, port, database, user: process.env.DB_USERNAME || 'root', password: process.env.DB_PASSWORD || '',
  });
  try {
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
  } finally {
    await connection.end();
  }
}

if (process.argv[1]?.includes('create-quiz-attempts')) {
  createQuizAttemptsTable().then(() => console.log('quiz_attempts migration completed')).catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
