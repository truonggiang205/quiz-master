import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

export interface MigrationResult {
  success: boolean;
  timestamp: string;
  profilesCreated: number;
  profilesReused: number;
  referencesUpdated: {
    teaching_lesson_participants: number;
    teaching_tuition_items: number;
    teaching_tuition_payments: number;
    teaching_learning_logs: number;
    teaching_scores: number;
  };
  validation: {
    orphanLessonParticipants: number;
    orphanTuitionItems: number;
    orphanTuitionPayments: number;
    orphanLearningLogs: number;
    orphanScores: number;
    ownershipMismatches: number;
  };
  unresolvedRecords: any[];
  error?: string;
}

export async function runExternalStudentLegacyBackfill(
  customConfig?: mysql.ConnectionOptions,
): Promise<MigrationResult> {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = Number(process.env.DB_PORT || 3306);
  const dbUser = process.env.DB_USERNAME || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbDatabase = process.env.DB_DATABASE || 'quizmaster';
  const isAiven = dbHost.includes('aivencloud.com');
  const dbSsl = (process.env.DB_SSL === 'true' || isAiven) ? { rejectUnauthorized: false } : undefined;

  if (isAiven && !process.env.DB_PASSWORD) {
    throw new Error('[Migration] Missing required DB_PASSWORD environment variable for cloud database.');
  }

  const config: mysql.ConnectionOptions = customConfig || {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbDatabase,
    ssl: dbSsl,
  };

  const result: MigrationResult = {
    success: false,
    timestamp: new Date().toISOString(),
    profilesCreated: 0,
    profilesReused: 0,
    referencesUpdated: {
      teaching_lesson_participants: 0,
      teaching_tuition_items: 0,
      teaching_tuition_payments: 0,
      teaching_learning_logs: 0,
      teaching_scores: 0,
    },
    validation: {
      orphanLessonParticipants: 0,
      orphanTuitionItems: 0,
      orphanTuitionPayments: 0,
      orphanLearningLogs: 0,
      orphanScores: 0,
      ownershipMismatches: 0,
    },
    unresolvedRecords: [],
  };

  let connection: mysql.Connection | null = null;
  let inTransaction = false;

  try {
    console.log('[Migration] Starting External Student Legacy Backfill Migration...');
    console.log('[Migration] Phase 1: Connecting to database...');
    console.log('[Migration] Database connection options (safe diagnostics):', {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      ssl: config.ssl ? 'ENABLED (rejectUnauthorized: false)' : 'DISABLED',
    });

    connection = await mysql.createConnection(config);
    console.log('[Migration] Connected to database successfully.');

    // Safe session lock wait timeouts (fail fast instead of hanging on lock waits)
    try {
      await connection.query('SET SESSION innodb_lock_wait_timeout = 15;');
      await connection.query('SET SESSION lock_wait_timeout = 15;');
    } catch {
      // Non-blocking if DB user has restricted session privileges
    }

    // 1. Check existing tables
    console.log('[Migration] Phase 2: Ensuring teacher_student_profiles schema...');
    const [tablesRaw] = await connection.query(`SHOW TABLES;`);
    const tables = (tablesRaw as any[]).map((r) => Object.values(r)[0] as string);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`teacher_student_profiles\` (
        \`id\` varchar(64) NOT NULL,
        \`teacherId\` varchar(64) NOT NULL,
        \`studentAccountId\` varchar(64) DEFAULT NULL,
        \`fullName\` varchar(255) NOT NULL,
        \`email\` varchar(255) DEFAULT NULL,
        \`phone\` varchar(50) DEFAULT NULL,
        \`parentName\` varchar(255) DEFAULT NULL,
        \`parentPhone\` varchar(50) DEFAULT NULL,
        \`dob\` varchar(20) DEFAULT NULL,
        \`gender\` varchar(10) DEFAULT NULL,
        \`school\` varchar(255) DEFAULT NULL,
        \`note\` text DEFAULT NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'ACTIVE',
        \`avatar\` text DEFAULT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`IDX_tsp_teacherId_status\` (\`teacherId\`, \`status\`),
        KEY \`IDX_tsp_teacherId_studentAccountId\` (\`teacherId\`, \`studentAccountId\`),
        KEY \`IDX_tsp_teacherId\` (\`teacherId\`),
        KEY \`IDX_tsp_studentAccountId\` (\`studentAccountId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure foreign keys on teacher_student_profiles if users table exists
    if (tables.includes('users')) {
      const [fks] = await connection.query(`
        SELECT CONSTRAINT_NAME, COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'teacher_student_profiles'
          AND REFERENCED_TABLE_NAME = 'users';
      `);
      const existingCols = (fks as any[]).map((f) => f.COLUMN_NAME);

      if (!existingCols.includes('teacherId')) {
        try {
          await connection.query(`
            ALTER TABLE \`teacher_student_profiles\`
            ADD CONSTRAINT \`FK_tsp_teacherId_users\`
            FOREIGN KEY (\`teacherId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE;
          `);
        } catch (e: any) {
          console.warn('[Migration] Note: Could not add FK_tsp_teacherId_users:', e.message);
        }
      }

      if (!existingCols.includes('studentAccountId')) {
        try {
          await connection.query(`
            ALTER TABLE \`teacher_student_profiles\`
            ADD CONSTRAINT \`FK_tsp_studentAccountId_users\`
            FOREIGN KEY (\`studentAccountId\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL;
          `);
        } catch (e: any) {
          console.warn('[Migration] Note: Could not add FK_tsp_studentAccountId_users:', e.message);
        }
      }
    }

    // START TRANSACTION FOR DATA MIGRATION
    console.log('[Migration] Phase 3: Starting transaction & discovering relationships from 7 sources...');
    await connection.beginTransaction();
    inTransaction = true;

    // Load existing profiles into memory
    const [profiles] = await connection.query(`
      SELECT id, teacherId, studentAccountId FROM teacher_student_profiles;
    `);
    const profileIdSet = new Set<string>();
    const profileByTeacherAndAccount = new Map<string, string>(); // "teacherId__studentAccountId" -> id
    for (const p of profiles as any[]) {
      profileIdSet.add(p.id);
      if (p.studentAccountId) {
        profileByTeacherAndAccount.set(`${p.teacherId}__${p.studentAccountId}`, p.id);
      }
    }

    // Load users into memory
    const userMap = new Map<string, any>();
    if (tables.includes('users')) {
      const [users] = await connection.query(`
        SELECT id, name, email, phone, school, avatar, isActive FROM users;
      `);
      for (const u of users as any[]) {
        userMap.set(u.id, u);
      }
    }

    // Collect all candidate (teacherId, rawStudentId) relations across all tables
    const candidatePairs = new Map<
      string,
      { teacherId: string; rawStudentId: string; sourceTables: Set<string>; recordId: string }
    >();

    const registerCandidate = (
      teacherId: string,
      rawStudentId: string,
      sourceTable: string,
      recordId: string,
    ) => {
      const key = `${teacherId}__${rawStudentId}`;
      const existing = candidatePairs.get(key);
      if (existing) {
        existing.sourceTables.add(sourceTable);
      } else {
        candidatePairs.set(key, {
          teacherId,
          rawStudentId,
          sourceTables: new Set([sourceTable]),
          recordId,
        });
      }
    };

    // Source 1: teacher_students join table
    if (tables.includes('teacher_students')) {
      const [tsRows] = await connection.query(`SELECT teacherId, studentId FROM teacher_students;`);
      for (const r of tsRows as any[]) {
        if (r.teacherId && r.studentId) {
          registerCandidate(r.teacherId, r.studentId, 'teacher_students', `${r.teacherId}:${r.studentId}`);
        }
      }
    }

    // Source 2: class_students join classes (Group classes only - strictly exclude private 1-1 classes)
    if (tables.includes('class_students') && tables.includes('classes')) {
      const [colsRaw]: any = await connection.query(`
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'classes'
          AND COLUMN_NAME = 'isPrivate';
      `);
      const hasIsPrivate = Array.isArray(colsRaw) && colsRaw.length > 0;
      const classFilter = hasIsPrivate
        ? `WHERE c.id NOT LIKE 'private-%' AND (c.isPrivate = 0 OR c.isPrivate IS NULL)`
        : `WHERE c.id NOT LIKE 'private-%'`;

      const [csRows] = await connection.query(`
        SELECT c.teacherId, cs.studentId
        FROM class_students cs
        JOIN classes c ON c.id = cs.classId
        ${classFilter};
      `);
      for (const r of csRows as any[]) {
        if (r.teacherId && r.studentId) {
          registerCandidate(r.teacherId, r.studentId, 'class_students', `${r.teacherId}:${r.studentId}`);
        }
      }
    }

    // Source 3: teaching_lesson_participants join teaching_lessons
    if (tables.includes('teaching_lesson_participants') && tables.includes('teaching_lessons')) {
      const [lpRows] = await connection.query(`
        SELECT lp.id as participantId, l.teacherId, lp.studentId
        FROM teaching_lesson_participants lp
        JOIN teaching_lessons l ON l.id = lp.lessonId;
      `);
      for (const r of lpRows as any[]) {
        if (r.teacherId && r.studentId) {
          registerCandidate(r.teacherId, r.studentId, 'teaching_lesson_participants', r.participantId);
        } else if (!r.teacherId && r.studentId) {
          result.unresolvedRecords.push({
            table: 'teaching_lesson_participants',
            recordId: r.participantId,
            studentId: r.studentId,
            reason: 'Lesson has no teacherId',
          });
        }
      }
    }

    // Source 4: teaching_tuition_items
    if (tables.includes('teaching_tuition_items')) {
      const [tiRows] = await connection.query(`SELECT id, teacherId, studentId FROM teaching_tuition_items;`);
      for (const r of tiRows as any[]) {
        if (r.teacherId && r.studentId) {
          registerCandidate(r.teacherId, r.studentId, 'teaching_tuition_items', r.id);
        } else if (!r.teacherId && r.studentId) {
          result.unresolvedRecords.push({
            table: 'teaching_tuition_items',
            recordId: r.id,
            studentId: r.studentId,
            reason: 'Tuition item has no teacherId',
          });
        }
      }
    }

    // Source 5: teaching_tuition_payments
    if (tables.includes('teaching_tuition_payments')) {
      const [tpRows] = await connection.query(`SELECT id, teacherId, studentId FROM teaching_tuition_payments;`);
      for (const r of tpRows as any[]) {
        if (r.teacherId && r.studentId) {
          registerCandidate(r.teacherId, r.studentId, 'teaching_tuition_payments', r.id);
        }
      }
    }

    // Source 6: teaching_learning_logs
    if (tables.includes('teaching_learning_logs')) {
      const [llRows] = await connection.query(`SELECT id, teacherId, studentId FROM teaching_learning_logs;`);
      for (const r of llRows as any[]) {
        if (r.teacherId && r.studentId) {
          registerCandidate(r.teacherId, r.studentId, 'teaching_learning_logs', r.id);
        }
      }
    }

    // Source 7: teaching_scores
    if (tables.includes('teaching_scores')) {
      const [scRows] = await connection.query(`SELECT id, teacherId, studentId FROM teaching_scores;`);
      for (const r of scRows as any[]) {
        if (r.teacherId && r.studentId) {
          registerCandidate(r.teacherId, r.studentId, 'teaching_scores', r.id);
        }
      }
    }

    console.log(`[Migration] Discovered ${candidatePairs.size} candidate teacher-student pairs.`);
    console.log('[Migration] Phase 4: Backfilling / resolving profiles...');

    // Mapping: "teacherId__rawStudentId" -> { targetProfileId, sourceTables }
    const pairToProfileMap = new Map<string, { targetProfileId: string; sourceTables: Set<string> }>();

    // Process all candidate pairs
    for (const [pairKey, item] of candidatePairs.entries()) {
      const { teacherId, rawStudentId, sourceTables, recordId } = item;

      // 1. Is rawStudentId ALREADY an existing TeacherStudent.id?
      if (profileIdSet.has(rawStudentId)) {
        // Valid existing profile. Reuse it directly.
        pairToProfileMap.set(pairKey, { targetProfileId: rawStudentId, sourceTables });
        result.profilesReused++;
        continue;
      }

      // 2. Does a profile exist for this (teacherId, studentAccountId = rawStudentId)?
      const existingProfileId = profileByTeacherAndAccount.get(`${teacherId}__${rawStudentId}`);
      if (existingProfileId) {
        pairToProfileMap.set(pairKey, { targetProfileId: existingProfileId, sourceTables });
        result.profilesReused++;
        continue;
      }

      // 3. Does rawStudentId exist in users table?
      const user = userMap.get(rawStudentId);
      if (user) {
        // Backfill a new TeacherStudent profile
        const newProfileId = `ts-legacy-${teacherId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}-${user.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}-${crypto.randomBytes(3).toString('hex')}`;
        const fullName = user.name || 'Học sinh';
        const email = user.email || null;
        const phone = user.phone || null;
        const school = user.school || null;
        const avatar = user.avatar || null;
        const status = user.isActive !== false ? 'ACTIVE' : 'INACTIVE';
        const note = 'Đồng bộ tự động từ tài khoản học sinh QuizMaster';

        await connection.query(
          `
          INSERT INTO teacher_student_profiles (
            id, teacherId, studentAccountId, fullName, email, phone, school, avatar, status, note, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());
        `,
          [newProfileId, teacherId, user.id, fullName, email, phone, school, avatar, status, note],
        );

        profileIdSet.add(newProfileId);
        profileByTeacherAndAccount.set(`${teacherId}__${user.id}`, newProfileId);
        pairToProfileMap.set(pairKey, { targetProfileId: newProfileId, sourceTables });
        result.profilesCreated++;
        continue;
      }

      // 4. If neither profile nor user, this is UNRESOLVABLE!
      result.unresolvedRecords.push({
        table: Array.from(sourceTables).join(', '),
        recordId,
        teacherId,
        studentId: rawStudentId,
        reason: 'studentId does not exist in teacher_student_profiles or users',
      });
    }

    // Fail safe check
    if (result.unresolvedRecords.length > 0) {
      throw new Error(
        `Migration aborted: Found ${result.unresolvedRecords.length} unresolvable student references. Rollback triggered.`,
      );
    }

    console.log(
      `[Migration] Backfilled ${result.profilesCreated} profiles, reused ${result.profilesReused} existing profiles.`,
    );

    // 5. Rewrite legacy references in all 5 teaching tables
    console.log('[Migration] Phase 5: Rewriting teaching references across 5 tables...');

    // A. teaching_lesson_participants
    console.log('[Migration] Phase 5.1: Updating teaching_lesson_participants...');
    if (tables.includes('teaching_lesson_participants') && tables.includes('teaching_lessons')) {
      for (const [pairKey, info] of pairToProfileMap.entries()) {
        if (!info.sourceTables.has('teaching_lesson_participants')) continue;
        const [teacherId, rawStudentId] = pairKey.split('__');
        if (rawStudentId === info.targetProfileId) continue;

        const [updateRes]: any = await connection.query(
          `
          UPDATE teaching_lesson_participants lp
          JOIN teaching_lessons l ON l.id = lp.lessonId
          SET lp.studentId = ?
          WHERE l.teacherId = ? AND lp.studentId = ?;
        `,
          [info.targetProfileId, teacherId, rawStudentId],
        );
        result.referencesUpdated.teaching_lesson_participants += updateRes.affectedRows || 0;
      }
    }
    console.log(
      `[Migration] Phase 5.1 completed. affectedRows=${result.referencesUpdated.teaching_lesson_participants}`,
    );

    // B. teaching_tuition_items
    console.log('[Migration] Phase 5.2: Updating teaching_tuition_items...');
    if (tables.includes('teaching_tuition_items')) {
      for (const [pairKey, info] of pairToProfileMap.entries()) {
        if (!info.sourceTables.has('teaching_tuition_items')) continue;
        const [teacherId, rawStudentId] = pairKey.split('__');
        if (rawStudentId === info.targetProfileId) continue;

        const [updateRes]: any = await connection.query(
          `
          UPDATE teaching_tuition_items
          SET studentId = ?
          WHERE teacherId = ? AND studentId = ?;
        `,
          [info.targetProfileId, teacherId, rawStudentId],
        );
        result.referencesUpdated.teaching_tuition_items += updateRes.affectedRows || 0;
      }
    }
    console.log(
      `[Migration] Phase 5.2 completed. affectedRows=${result.referencesUpdated.teaching_tuition_items}`,
    );

    // C. teaching_tuition_payments
    console.log('[Migration] Phase 5.3: Updating teaching_tuition_payments...');
    if (tables.includes('teaching_tuition_payments')) {
      for (const [pairKey, info] of pairToProfileMap.entries()) {
        if (!info.sourceTables.has('teaching_tuition_payments')) continue;
        const [teacherId, rawStudentId] = pairKey.split('__');
        if (rawStudentId === info.targetProfileId) continue;

        const [updateRes]: any = await connection.query(
          `
          UPDATE teaching_tuition_payments
          SET studentId = ?
          WHERE teacherId = ? AND studentId = ?;
        `,
          [info.targetProfileId, teacherId, rawStudentId],
        );
        result.referencesUpdated.teaching_tuition_payments += updateRes.affectedRows || 0;
      }
    }
    console.log(
      `[Migration] Phase 5.3 completed. affectedRows=${result.referencesUpdated.teaching_tuition_payments}`,
    );

    // D. teaching_learning_logs
    console.log('[Migration] Phase 5.4: Updating teaching_learning_logs...');
    if (tables.includes('teaching_learning_logs')) {
      for (const [pairKey, info] of pairToProfileMap.entries()) {
        if (!info.sourceTables.has('teaching_learning_logs')) continue;
        const [teacherId, rawStudentId] = pairKey.split('__');
        if (rawStudentId === info.targetProfileId) continue;

        const [updateRes]: any = await connection.query(
          `
          UPDATE teaching_learning_logs
          SET studentId = ?
          WHERE teacherId = ? AND studentId = ?;
        `,
          [info.targetProfileId, teacherId, rawStudentId],
        );
        result.referencesUpdated.teaching_learning_logs += updateRes.affectedRows || 0;
      }
    }
    console.log(
      `[Migration] Phase 5.4 completed. affectedRows=${result.referencesUpdated.teaching_learning_logs}`,
    );

    // E. teaching_scores
    console.log('[Migration] Phase 5.5: Updating teaching_scores...');
    if (tables.includes('teaching_scores')) {
      for (const [pairKey, info] of pairToProfileMap.entries()) {
        if (!info.sourceTables.has('teaching_scores')) continue;
        const [teacherId, rawStudentId] = pairKey.split('__');
        if (rawStudentId === info.targetProfileId) continue;

        const [updateRes]: any = await connection.query(
          `
          UPDATE teaching_scores
          SET studentId = ?
          WHERE teacherId = ? AND studentId = ?;
        `,
          [info.targetProfileId, teacherId, rawStudentId],
        );
        result.referencesUpdated.teaching_scores += updateRes.affectedRows || 0;
      }
    }
    console.log(
      `[Migration] Phase 5.5 completed. affectedRows=${result.referencesUpdated.teaching_scores}`,
    );

    // 6. Validation step before commit
    console.log('[Migration] Phase 6: Validating integrity across all 5 tables...');

    if (tables.includes('teaching_lesson_participants')) {
      const [res]: any = await connection.query(`
        SELECT COUNT(*) as count
        FROM teaching_lesson_participants lp
        LEFT JOIN teacher_student_profiles tsp ON tsp.id = lp.studentId
        WHERE tsp.id IS NULL;
      `);
      result.validation.orphanLessonParticipants = Number(res[0].count);
    }

    if (tables.includes('teaching_tuition_items')) {
      const [res]: any = await connection.query(`
        SELECT COUNT(*) as count
        FROM teaching_tuition_items ti
        LEFT JOIN teacher_student_profiles tsp ON tsp.id = ti.studentId
        WHERE tsp.id IS NULL;
      `);
      result.validation.orphanTuitionItems = Number(res[0].count);
    }

    if (tables.includes('teaching_tuition_payments')) {
      const [res]: any = await connection.query(`
        SELECT COUNT(*) as count
        FROM teaching_tuition_payments tp
        LEFT JOIN teacher_student_profiles tsp ON tsp.id = tp.studentId
        WHERE tsp.id IS NULL;
      `);
      result.validation.orphanTuitionPayments = Number(res[0].count);
    }

    if (tables.includes('teaching_learning_logs')) {
      const [res]: any = await connection.query(`
        SELECT COUNT(*) as count
        FROM teaching_learning_logs ll
        LEFT JOIN teacher_student_profiles tsp ON tsp.id = ll.studentId
        WHERE tsp.id IS NULL;
      `);
      result.validation.orphanLearningLogs = Number(res[0].count);
    }

    if (tables.includes('teaching_scores')) {
      const [res]: any = await connection.query(`
        SELECT COUNT(*) as count
        FROM teaching_scores sc
        LEFT JOIN teacher_student_profiles tsp ON tsp.id = sc.studentId
        WHERE tsp.id IS NULL;
      `);
      result.validation.orphanScores = Number(res[0].count);
    }

    // Ownership check on lesson participants
    if (tables.includes('teaching_lesson_participants') && tables.includes('teaching_lessons')) {
      const [res]: any = await connection.query(`
        SELECT COUNT(*) as count
        FROM teaching_lesson_participants lp
        JOIN teaching_lessons l ON l.id = lp.lessonId
        JOIN teacher_student_profiles tsp ON tsp.id = lp.studentId
        WHERE tsp.teacherId != l.teacherId;
      `);
      result.validation.ownershipMismatches = Number(res[0].count);
    }

    const totalOrphans =
      result.validation.orphanLessonParticipants +
      result.validation.orphanTuitionItems +
      result.validation.orphanTuitionPayments +
      result.validation.orphanLearningLogs +
      result.validation.orphanScores;

    if (totalOrphans > 0 || result.validation.ownershipMismatches > 0) {
      throw new Error(
        `Migration validation failed: ${totalOrphans} orphan references and ${result.validation.ownershipMismatches} ownership mismatches remain.`,
      );
    }

    // COMMIT DATA CHANGES
    console.log('[Migration] Phase 7: Committing data reconciliation transaction...');
    await connection.commit();
    inTransaction = false;
    console.log('[Migration] Data reconciliation committed successfully!');

    // 7. Enforce Foreign Key Constraints safely
    console.log('[Migration] Phase 8: Updating and aligning foreign key constraints to teacher_student_profiles...');

    const alignForeignKey = async (tableName: string, constraintName: string) => {
      if (!tables.includes(tableName) || !connection) return;

      // Find existing constraints on studentId
      const [existingFKs]: any = await connection.query(`
        SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${tableName}'
          AND COLUMN_NAME = 'studentId'
          AND REFERENCED_TABLE_NAME IS NOT NULL;
      `);

      for (const fk of existingFKs) {
        if (fk.REFERENCED_TABLE_NAME !== 'teacher_student_profiles') {
          console.log(`[Migration] Dropping obsolete foreign key ${fk.CONSTRAINT_NAME} on ${tableName}...`);
          try {
            await connection.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`;`);
          } catch (e: any) {
            console.warn(`[Migration] Notice dropping ${fk.CONSTRAINT_NAME}:`, e.message);
          }
        }
      }

      // Check if target FK already exists
      const hasTargetFK = existingFKs.some(
        (fk: any) => fk.REFERENCED_TABLE_NAME === 'teacher_student_profiles',
      );

      if (!hasTargetFK) {
        console.log(`[Migration] Creating foreign key constraint ${constraintName} on ${tableName}...`);
        await connection.query(`
          ALTER TABLE \`${tableName}\`
          ADD CONSTRAINT \`${constraintName}\`
          FOREIGN KEY (\`studentId\`)
          REFERENCES \`teacher_student_profiles\`(\`id\`)
          ON DELETE RESTRICT
          ON UPDATE NO ACTION;
        `);
      }
    };

    await alignForeignKey('teaching_lesson_participants', 'FK_teaching_lesson_participants_student');
    await alignForeignKey('teaching_tuition_items', 'FK_teaching_tuition_items_student');
    await alignForeignKey('teaching_tuition_payments', 'FK_teaching_tuition_payments_student');
    await alignForeignKey('teaching_learning_logs', 'FK_teaching_learning_logs_student');
    await alignForeignKey('teaching_scores', 'FK_teaching_scores_student');

    result.success = true;
    console.log('[Migration] Phase 9: External Student Legacy Backfill COMPLETED SUCCESSFULLY.');
    return result;
  } catch (err: any) {
    if (inTransaction && connection) {
      try {
        await connection.rollback();
        console.error('[Migration] Transaction rolled back due to error.');
      } catch (rbErr: any) {
        console.error('[Migration] Rollback error:', rbErr.message);
      }
    }
    result.error = err.message;
    console.error('[Migration] Migration failed with error:', err.message);
    throw err;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Standalone CLI runner
if (process.argv[1] && process.argv[1].includes('external-student-legacy-backfill')) {
  runExternalStudentLegacyBackfill()
    .then((res) => {
      console.log('Migration Result:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal Migration Error:', err);
      process.exit(1);
    });
}
