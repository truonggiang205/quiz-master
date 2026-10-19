import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import mysql from 'mysql2/promise';
import { runExternalStudentLegacyBackfill } from '../../../migrations/external-student-legacy-backfill.js';

const dbConfig: mysql.ConnectionOptions = {
  host: '127.0.0.1',
  port: 3308,
  user: 'root',
  password: 'root',
  database: 'quizmaster_external_migration_test',
  multipleStatements: true,
};

async function resetTestDatabase(connection: mysql.Connection) {
  // Disable FK checks temporarily during test cleanup
  await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
  const [tablesRaw] = await connection.query('SHOW TABLES;');
  const tables = (tablesRaw as any[]).map((r) => Object.values(r)[0] as string);
  for (const t of tables) {
    await connection.query(`DROP TABLE IF EXISTS \`${t}\`;`);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
}

async function createBaseLegacySchema(connection: mysql.Connection) {
  await connection.query(`
    CREATE TABLE \`users\` (
      \`id\` varchar(64) NOT NULL,
      \`name\` varchar(255) NOT NULL,
      \`email\` varchar(255) NOT NULL,
      \`role\` varchar(20) DEFAULT 'STUDENT',
      \`phone\` varchar(50) DEFAULT NULL,
      \`school\` varchar(255) DEFAULT NULL,
      \`avatar\` text DEFAULT NULL,
      \`isActive\` tinyint(1) DEFAULT 1,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE \`classes\` (
      \`id\` varchar(64) NOT NULL,
      \`teacherId\` varchar(64) NOT NULL,
      \`name\` varchar(255) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE \`teacher_students\` (
      \`teacherId\` varchar(64) NOT NULL,
      \`studentId\` varchar(64) NOT NULL,
      PRIMARY KEY (\`teacherId\`, \`studentId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE \`class_students\` (
      \`classId\` varchar(64) NOT NULL,
      \`studentId\` varchar(64) NOT NULL,
      PRIMARY KEY (\`classId\`, \`studentId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE \`teaching_lessons\` (
      \`id\` varchar(64) NOT NULL,
      \`teacherId\` varchar(64) NOT NULL,
      \`classId\` varchar(64) NOT NULL,
      \`title\` varchar(255) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE \`teaching_lesson_participants\` (
      \`id\` varchar(64) NOT NULL,
      \`lessonId\` varchar(64) NOT NULL,
      \`studentId\` varchar(64) NOT NULL,
      \`attendanceStatus\` varchar(20) DEFAULT 'ATTENDED',
      \`feeAmount\` decimal(12,2) DEFAULT 0,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE \`teaching_tuition_items\` (
      \`id\` varchar(64) NOT NULL,
      \`teacherId\` varchar(64) NOT NULL,
      \`classId\` varchar(64) NOT NULL,
      \`studentId\` varchar(64) NOT NULL,
      \`month\` varchar(20) NOT NULL,
      \`totalAmount\` decimal(12,2) DEFAULT 0,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE \`teaching_tuition_payments\` (
      \`id\` varchar(64) NOT NULL,
      \`teacherId\` varchar(64) NOT NULL,
      \`tuitionItemId\` varchar(64) NOT NULL,
      \`studentId\` varchar(64) NOT NULL,
      \`amount\` decimal(12,2) DEFAULT 0,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE \`teaching_learning_logs\` (
      \`id\` varchar(64) NOT NULL,
      \`teacherId\` varchar(64) NOT NULL,
      \`classId\` varchar(64) NOT NULL,
      \`lessonId\` varchar(64) NOT NULL,
      \`studentId\` varchar(64) NOT NULL,
      \`content\` text,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await connection.query(`
    CREATE TABLE \`teaching_scores\` (
      \`id\` varchar(64) NOT NULL,
      \`teacherId\` varchar(64) NOT NULL,
      \`classId\` varchar(64) NOT NULL,
      \`studentId\` varchar(64) NOT NULL,
      \`score\` decimal(5,2) DEFAULT 0,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

describe('External Student Production Migration Suite (MySQL 8.0 Real Database)', () => {
  let conn: mysql.Connection;
  let mysqlAvailable = false;

  beforeAll(async () => {
    try {
      const testConn = await mysql.createConnection(dbConfig);
      await testConn.end();
      mysqlAvailable = true;
    } catch {
      console.warn('⚠️ Local MySQL at 127.0.0.1:3308 is not reachable. Skipping live MySQL migration tests.');
      mysqlAvailable = false;
    }
  });

  beforeEach(async (context) => {
    if (!mysqlAvailable) {
      context.skip();
      return;
    }
    conn = await mysql.createConnection(dbConfig);
    await resetTestDatabase(conn);
    await createBaseLegacySchema(conn);
  });

  afterAll(async () => {
    if (conn) {
      await conn.end();
    }
  });

  it('MIG-01: Clean database should run migration smoothly without errors', async () => {
    const res = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res.success).toBe(true);
    expect(res.profilesCreated).toBe(0);
    expect(res.validation.orphanLessonParticipants).toBe(0);

    // Verify teacher_student_profiles table was created
    const [tables]: any = await conn.query("SHOW TABLES LIKE 'teacher_student_profiles';");
    expect(tables.length).toBe(1);
  });

  it('MIG-02: Legacy users + teacher_students should backfill TeacherStudent profiles with correct studentAccountId', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role, phone)
      VALUES 
        ('t-1', 'Teacher Alpha', 'alpha@teacher.com', 'TEACHER', '0901234567'),
        ('s-1', 'Student One', 'one@student.com', 'STUDENT', '0911222333');
    `);
    await conn.query(`INSERT INTO teacher_students (teacherId, studentId) VALUES ('t-1', 's-1');`);

    const res = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res.success).toBe(true);
    expect(res.profilesCreated).toBe(1);

    const [profiles]: any = await conn.query('SELECT * FROM teacher_student_profiles WHERE teacherId = ?', ['t-1']);
    expect(profiles.length).toBe(1);
    expect(profiles[0].studentAccountId).toBe('s-1');
    expect(profiles[0].fullName).toBe('Student One');
    expect(profiles[0].email).toBe('one@student.com');
  });

  it('MIG-03: Legacy lesson participants should be resolved and updated to TeacherStudent.id', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role)
      VALUES ('t-1', 'Teacher Alpha', 'alpha@teacher.com', 'TEACHER'),
             ('s-1', 'Student One', 'one@student.com', 'STUDENT');
      INSERT INTO classes (id, teacherId, name) VALUES ('c-1', 't-1', 'Math 10');
      INSERT INTO teaching_lessons (id, teacherId, classId, title) VALUES ('l-1', 't-1', 'c-1', 'Lesson 1');
      INSERT INTO teaching_lesson_participants (id, lessonId, studentId) VALUES ('lp-1', 'l-1', 's-1');
    `);

    const res = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res.success).toBe(true);
    expect(res.referencesUpdated.teaching_lesson_participants).toBe(1);

    const [participants]: any = await conn.query('SELECT * FROM teaching_lesson_participants WHERE id = ?', ['lp-1']);
    const [profile]: any = await conn.query('SELECT * FROM teacher_student_profiles WHERE studentAccountId = ?', ['s-1']);
    expect(participants[0].studentId).toBe(profile[0].id);
    expect(participants[0].studentId).not.toBe('s-1');
  });

  it('MIG-04: Legacy tuition items should have studentId updated to TeacherStudent.id', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role)
      VALUES ('t-1', 'Teacher Alpha', 'alpha@teacher.com', 'TEACHER'),
             ('s-1', 'Student One', 'one@student.com', 'STUDENT');
      INSERT INTO classes (id, teacherId, name) VALUES ('c-1', 't-1', 'Math 10');
      INSERT INTO teaching_tuition_items (id, teacherId, classId, studentId, month, totalAmount)
      VALUES ('ti-1', 't-1', 'c-1', 's-1', '2026-10', 500000);
    `);

    const res = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res.success).toBe(true);
    expect(res.referencesUpdated.teaching_tuition_items).toBe(1);

    const [items]: any = await conn.query('SELECT * FROM teaching_tuition_items WHERE id = ?', ['ti-1']);
    const [profile]: any = await conn.query('SELECT * FROM teacher_student_profiles WHERE studentAccountId = ?', ['s-1']);
    expect(items[0].studentId).toBe(profile[0].id);
  });

  it('MIG-05: Legacy tuition payments should have studentId updated to TeacherStudent.id', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role)
      VALUES ('t-1', 'Teacher Alpha', 'alpha@teacher.com', 'TEACHER'),
             ('s-1', 'Student One', 'one@student.com', 'STUDENT');
      INSERT INTO teaching_tuition_payments (id, teacherId, tuitionItemId, studentId, amount)
      VALUES ('pay-1', 't-1', 'ti-1', 's-1', 200000);
    `);

    const res = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res.success).toBe(true);
    expect(res.referencesUpdated.teaching_tuition_payments).toBe(1);

    const [payments]: any = await conn.query('SELECT * FROM teaching_tuition_payments WHERE id = ?', ['pay-1']);
    const [profile]: any = await conn.query('SELECT * FROM teacher_student_profiles WHERE studentAccountId = ?', ['s-1']);
    expect(payments[0].studentId).toBe(profile[0].id);
  });

  it('MIG-06: Legacy learning logs should have studentId updated to TeacherStudent.id', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role)
      VALUES ('t-1', 'Teacher Alpha', 'alpha@teacher.com', 'TEACHER'),
             ('s-1', 'Student One', 'one@student.com', 'STUDENT');
      INSERT INTO teaching_learning_logs (id, teacherId, classId, lessonId, studentId, content)
      VALUES ('log-1', 't-1', 'c-1', 'l-1', 's-1', 'Great progress today');
    `);

    const res = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res.success).toBe(true);
    expect(res.referencesUpdated.teaching_learning_logs).toBe(1);

    const [logs]: any = await conn.query('SELECT * FROM teaching_learning_logs WHERE id = ?', ['log-1']);
    const [profile]: any = await conn.query('SELECT * FROM teacher_student_profiles WHERE studentAccountId = ?', ['s-1']);
    expect(logs[0].studentId).toBe(profile[0].id);
  });

  it('MIG-07: Legacy scores should have studentId updated to TeacherStudent.id', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role)
      VALUES ('t-1', 'Teacher Alpha', 'alpha@teacher.com', 'TEACHER'),
             ('s-1', 'Student One', 'one@student.com', 'STUDENT');
      INSERT INTO teaching_scores (id, teacherId, classId, studentId, score)
      VALUES ('scr-1', 't-1', 'c-1', 's-1', 9.5);
    `);

    const res = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res.success).toBe(true);
    expect(res.referencesUpdated.teaching_scores).toBe(1);

    const [scores]: any = await conn.query('SELECT * FROM teaching_scores WHERE id = ?', ['scr-1']);
    const [profile]: any = await conn.query('SELECT * FROM teacher_student_profiles WHERE studentAccountId = ?', ['s-1']);
    expect(scores[0].studentId).toBe(profile[0].id);
  });

  it('MIG-08: Existing TeacherStudent profile should be reused without creating duplicates', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role)
      VALUES ('t-1', 'Teacher Alpha', 'alpha@teacher.com', 'TEACHER'),
             ('s-1', 'Student One', 'one@student.com', 'STUDENT');
      INSERT INTO teacher_students (teacherId, studentId) VALUES ('t-1', 's-1');
    `);
    // Pre-create table and profile
    await runExternalStudentLegacyBackfill(dbConfig);

    const [initialProfiles]: any = await conn.query('SELECT COUNT(*) as count FROM teacher_student_profiles;');
    const initialCount = initialProfiles[0].count;

    // Add another legacy reference for the same student (simulating unmigrated legacy row)
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
    await conn.query(`
      INSERT INTO classes (id, teacherId, name) VALUES ('c-1', 't-1', 'Math 10');
      INSERT INTO teaching_lessons (id, teacherId, classId, title) VALUES ('l-1', 't-1', 'c-1', 'Lesson 1');
      INSERT INTO teaching_lesson_participants (id, lessonId, studentId) VALUES ('lp-2', 'l-1', 's-1');
    `);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

    const res = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res.success).toBe(true);
    expect(res.profilesCreated).toBe(0); // No new profiles
    expect(res.profilesReused).toBeGreaterThan(0);

    const [finalProfiles]: any = await conn.query('SELECT COUNT(*) as count FROM teacher_student_profiles;');
    expect(finalProfiles[0].count).toBe(initialCount);
  });

  it('MIG-09: Migration rerun should be completely idempotent', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role)
      VALUES ('t-1', 'Teacher Alpha', 'alpha@teacher.com', 'TEACHER'),
             ('s-1', 'Student One', 'one@student.com', 'STUDENT');
      INSERT INTO classes (id, teacherId, name) VALUES ('c-1', 't-1', 'Math 10');
      INSERT INTO teaching_lessons (id, teacherId, classId, title) VALUES ('l-1', 't-1', 'c-1', 'Lesson 1');
      INSERT INTO teaching_lesson_participants (id, lessonId, studentId) VALUES ('lp-1', 'l-1', 's-1');
    `);

    // Run 1
    const res1 = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res1.success).toBe(true);
    expect(res1.profilesCreated).toBe(1);

    // Run 2
    const res2 = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res2.success).toBe(true);
    expect(res2.profilesCreated).toBe(0);
    expect(res2.referencesUpdated.teaching_lesson_participants).toBe(0);
    expect(res2.validation.orphanLessonParticipants).toBe(0);
  });

  it('MIG-10: Resolvable orphan in teaching records without teacher_students entry should auto repair', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role)
      VALUES ('t-1', 'Teacher Alpha', 'alpha@teacher.com', 'TEACHER'),
             ('s-orphan', 'Orphan Student', 'orphan@student.com', 'STUDENT');
      INSERT INTO classes (id, teacherId, name) VALUES ('c-1', 't-1', 'Math 10');
      INSERT INTO teaching_lessons (id, teacherId, classId, title) VALUES ('l-1', 't-1', 'c-1', 'Lesson 1');
      INSERT INTO teaching_lesson_participants (id, lessonId, studentId) VALUES ('lp-orphan', 'l-1', 's-orphan');
    `);

    const res = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res.success).toBe(true);
    expect(res.profilesCreated).toBe(1);

    const [participant]: any = await conn.query('SELECT * FROM teaching_lesson_participants WHERE id = ?', ['lp-orphan']);
    const [profile]: any = await conn.query('SELECT * FROM teacher_student_profiles WHERE studentAccountId = ?', ['s-orphan']);
    expect(participant[0].studentId).toBe(profile[0].id);
  });

  it('MIG-11: Unresolvable orphan should fail safe, trigger rollback, and leave data untouched', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role) VALUES ('t-1', 'Teacher Alpha', 'alpha@teacher.com', 'TEACHER');
      INSERT INTO classes (id, teacherId, name) VALUES ('c-1', 't-1', 'Math 10');
      INSERT INTO teaching_lessons (id, teacherId, classId, title) VALUES ('l-1', 't-1', 'c-1', 'Lesson 1');
      INSERT INTO teaching_lesson_participants (id, lessonId, studentId) VALUES ('lp-corrupt', 'l-1', 'non-existent-user-id');
    `);

    await expect(runExternalStudentLegacyBackfill(dbConfig)).rejects.toThrow(/Migration aborted: Found 1 unresolvable student references/);

    // Verify record was NOT deleted or altered
    const [participant]: any = await conn.query('SELECT * FROM teaching_lesson_participants WHERE id = ?', ['lp-corrupt']);
    expect(participant.length).toBe(1);
    expect(participant[0].studentId).toBe('non-existent-user-id');
  });

  it('MIG-12: Foreign key validation should enforce referential integrity and ON DELETE RESTRICT on MySQL', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role)
      VALUES ('t-1', 'Teacher Alpha', 'alpha@teacher.com', 'TEACHER'),
             ('s-1', 'Student One', 'one@student.com', 'STUDENT');
      INSERT INTO classes (id, teacherId, name) VALUES ('c-1', 't-1', 'Math 10');
      INSERT INTO teaching_lessons (id, teacherId, classId, title) VALUES ('l-1', 't-1', 'c-1', 'Lesson 1');
      INSERT INTO teaching_lesson_participants (id, lessonId, studentId) VALUES ('lp-1', 'l-1', 's-1');
    `);

    await runExternalStudentLegacyBackfill(dbConfig);

    // 1. Verify foreign key exists on teaching_lesson_participants
    const [fks]: any = await conn.query(`
      SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'teaching_lesson_participants'
        AND COLUMN_NAME = 'studentId';
    `);
    expect(fks.length).toBeGreaterThan(0);
    expect(fks[0].REFERENCED_TABLE_NAME).toBe('teacher_student_profiles');

    // 2. Inserting an invalid studentId must fail with MySQL 1452
    await expect(
      conn.query(`
        INSERT INTO teaching_lesson_participants (id, lessonId, studentId)
        VALUES ('lp-invalid', 'l-1', 'invalid-student-id');
      `),
    ).rejects.toThrow(/Cannot add or update a child row: a foreign key constraint fails/);

    // 3. Deleting a profile that has lessons must fail with MySQL 1451 RESTRICT
    const [profile]: any = await conn.query('SELECT id FROM teacher_student_profiles WHERE studentAccountId = ?', ['s-1']);
    await expect(
      conn.query('DELETE FROM teacher_student_profiles WHERE id = ?', [profile[0].id]),
    ).rejects.toThrow(/Cannot delete or update a parent row: a foreign key constraint fails/);
  });

  it('MIG-13: Multiple teachers sharing the same student account should get isolated profiles with unique IDs', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role)
      VALUES ('t-1', 'Teacher One', 't1@edu.com', 'TEACHER'),
             ('t-2', 'Teacher Two', 't2@edu.com', 'TEACHER'),
             ('s-shared', 'Shared Student', 'shared@edu.com', 'STUDENT');
      INSERT INTO teacher_students (teacherId, studentId) VALUES ('t-1', 's-shared'), ('t-2', 's-shared');
    `);

    const res = await runExternalStudentLegacyBackfill(dbConfig);
    expect(res.success).toBe(true);
    expect(res.profilesCreated).toBe(2);

    const [profiles]: any = await conn.query('SELECT * FROM teacher_student_profiles WHERE studentAccountId = ?', ['s-shared']);
    expect(profiles.length).toBe(2);
    expect(profiles[0].id).not.toBe(profiles[1].id);
    expect(new Set([profiles[0].teacherId, profiles[1].teacherId])).toEqual(new Set(['t-1', 't-2']));
  });

  it('MIG-14: New External Student profile has studentAccountId = NULL and can have lessons', async () => {
    await conn.query(`INSERT INTO users (id, name, email, role) VALUES ('t-1', 'Teacher Alpha', 'alpha@edu.com', 'TEACHER');`);
    await runExternalStudentLegacyBackfill(dbConfig);

    // Insert an External Student (studentAccountId is NULL)
    await conn.query(`
      INSERT INTO teacher_student_profiles (id, teacherId, studentAccountId, fullName, status)
      VALUES ('ts-ext-1', 't-1', NULL, 'External Boy', 'ACTIVE');
    `);

    const [extProfile]: any = await conn.query('SELECT * FROM teacher_student_profiles WHERE id = ?', ['ts-ext-1']);
    expect(extProfile[0].studentAccountId).toBeNull();
    expect(extProfile[0].fullName).toBe('External Boy');

    // Attach to lesson
    await conn.query(`
      INSERT INTO classes (id, teacherId, name) VALUES ('c-1', 't-1', 'Math 10');
      INSERT INTO teaching_lessons (id, teacherId, classId, title) VALUES ('l-1', 't-1', 'c-1', 'Lesson 1');
      INSERT INTO teaching_lesson_participants (id, lessonId, studentId) VALUES ('lp-ext', 'l-1', 'ts-ext-1');
    `);

    const [p]: any = await conn.query('SELECT * FROM teaching_lesson_participants WHERE id = ?', ['lp-ext']);
    expect(p[0].studentId).toBe('ts-ext-1');
  });

  it('MIG-15: Linking account to External Student preserves TeacherStudent.id and preserves all history', async () => {
    await conn.query(`
      INSERT INTO users (id, name, email, role)
      VALUES ('t-1', 'Teacher Alpha', 'alpha@edu.com', 'TEACHER'),
             ('s-real', 'Real Account', 'real@quizmaster.com', 'STUDENT');
      INSERT INTO classes (id, teacherId, name) VALUES ('c-1', 't-1', 'Math 10');
      INSERT INTO teaching_lessons (id, teacherId, classId, title) VALUES ('l-1', 't-1', 'c-1', 'Lesson 1');
    `);
    await runExternalStudentLegacyBackfill(dbConfig);

    // Create external student
    const studentProfileId = 'ts-persistent-id-999';
    await conn.query(`
      INSERT INTO teacher_student_profiles (id, teacherId, studentAccountId, fullName, status)
      VALUES (?, 't-1', NULL, 'Pending Link Student', 'ACTIVE');
    `, [studentProfileId]);

    // Attach history
    await conn.query(`INSERT INTO teaching_lesson_participants (id, lessonId, studentId) VALUES ('lp-hist', 'l-1', ?);`, [studentProfileId]);
    await conn.query(`INSERT INTO teaching_scores (id, teacherId, classId, studentId, score) VALUES ('scr-hist', 't-1', 'c-1', ?, 10);`, [studentProfileId]);

    // Perform Link Account (update studentAccountId on the profile)
    await conn.query(`UPDATE teacher_student_profiles SET studentAccountId = 's-real' WHERE id = ?`, [studentProfileId]);

    // Verify TeacherStudent.id is unchanged
    const [linkedProfile]: any = await conn.query('SELECT * FROM teacher_student_profiles WHERE id = ?', [studentProfileId]);
    expect(linkedProfile[0].id).toBe(studentProfileId);
    expect(linkedProfile[0].studentAccountId).toBe('s-real');

    // Verify all history still references studentProfileId intact
    const [lp]: any = await conn.query('SELECT studentId FROM teaching_lesson_participants WHERE id = ?', ['lp-hist']);
    const [scr]: any = await conn.query('SELECT studentId FROM teaching_scores WHERE id = ?', ['scr-hist']);
    expect(lp[0].studentId).toBe(studentProfileId);
    expect(scr[0].studentId).toBe(studentProfileId);
  });
});
