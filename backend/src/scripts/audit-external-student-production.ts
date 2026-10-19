import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export type AuditStatus =
  | 'VALID_NEW'
  | 'VALID_LEGACY'
  | 'RESOLVABLE'
  | 'UNRESOLVABLE'
  | 'NULL'
  | 'CONFLICT';

export interface AuditRecord {
  table: string;
  recordId: string;
  teacherId: string | null;
  currentStudentId: string | null;
  matchedUserId: string | null;
  matchedTeacherStudentId: string | null;
  status: AuditStatus;
  note?: string;
}

export interface AuditReport {
  timestamp: string;
  summary: {
    totalRecords: number;
    validNewCount: number;
    validLegacyCount: number;
    resolvableCount: number;
    unresolvableCount: number;
    nullCount: number;
    conflictCount: number;
    byTable: Record<string, { total: number; valid: number; needsMigration: number; invalid: number }>;
  };
  records: AuditRecord[];
}

export async function auditProductionDatabase(connectionConfig?: mysql.ConnectionOptions): Promise<AuditReport> {
  const dbHost = process.env.DB_HOST || 'csm-db-truonggiang-205.l.aivencloud.com';
  const dbPort = Number(process.env.DB_PORT) || 25532;
  const dbUser = process.env.DB_USERNAME || 'avnadmin';
  const dbPassword = process.env.DB_PASSWORD || 'AVNS__ZUD3CAQkiIrycmV2VH';
  const dbDatabase = process.env.DB_DATABASE || 'quizmaster';
  const isAiven = dbHost.includes('aivencloud.com');
  const dbSsl = (process.env.DB_SSL === 'true' || isAiven) ? { rejectUnauthorized: false } : undefined;

  const config: mysql.ConnectionOptions = connectionConfig || {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbDatabase,
    ssl: dbSsl,
  };

  const connection = await mysql.createConnection(config);

  try {
    const reportRecords: AuditRecord[] = [];

    // Check existing tables
    const [tablesRaw] = await connection.query(`SHOW TABLES;`);
    const tables = (tablesRaw as any[]).map((r) => Object.values(r)[0] as string);

    const hasProfilesTable = tables.includes('teacher_student_profiles');
    const hasUsersTable = tables.includes('users');
    const hasLessonsTable = tables.includes('teaching_lessons');

    // Preload users map
    const userMap = new Map<string, { id: string; name: string; email: string }>();
    if (hasUsersTable) {
      const [userRows] = await connection.query(`SELECT id, name, email FROM users;`);
      for (const u of userRows as any[]) {
        userMap.set(u.id, { id: u.id, name: u.name, email: u.email });
      }
    }

    // Preload teacher_student_profiles: by id and by (teacherId:studentAccountId)
    const profileById = new Map<string, { id: string; teacherId: string; studentAccountId: string | null }>();
    const profileByTeacherAndAccount = new Map<string, string>(); // "teacherId__studentAccountId" -> profileId

    if (hasProfilesTable) {
      const [profileRows] = await connection.query(
        `SELECT id, teacherId, studentAccountId FROM teacher_student_profiles;`,
      );
      for (const p of profileRows as any[]) {
        profileById.set(p.id, {
          id: p.id,
          teacherId: p.teacherId,
          studentAccountId: p.studentAccountId,
        });
        if (p.studentAccountId) {
          profileByTeacherAndAccount.set(`${p.teacherId}__${p.studentAccountId}`, p.id);
        }
      }
    }

    // Preload lessons map for lesson_participants
    const lessonTeacherMap = new Map<string, string>(); // lessonId -> teacherId
    if (hasLessonsTable) {
      const [lessonRows] = await connection.query(`SELECT id, teacherId FROM teaching_lessons;`);
      for (const l of lessonRows as any[]) {
        lessonTeacherMap.set(l.id, l.teacherId);
      }
    }

    const auditTable = async (
      tableName: string,
      idColumn: string,
      studentIdColumn: string,
      getTeacherId: (row: any) => string | null,
    ) => {
      if (!tables.includes(tableName)) return;

      const [rows] = await connection.query(`SELECT * FROM ${tableName};`);
      for (const row of rows as any[]) {
        const recordId = String(row[idColumn]);
        const currentStudentId: string | null = row[studentIdColumn] ? String(row[studentIdColumn]) : null;
        const teacherId = getTeacherId(row);

        if (!currentStudentId) {
          reportRecords.push({
            table: tableName,
            recordId,
            teacherId,
            currentStudentId: null,
            matchedUserId: null,
            matchedTeacherStudentId: null,
            status: 'NULL',
            note: 'studentId is NULL',
          });
          continue;
        }

        if (!teacherId) {
          reportRecords.push({
            table: tableName,
            recordId,
            teacherId: null,
            currentStudentId,
            matchedUserId: userMap.has(currentStudentId) ? currentStudentId : null,
            matchedTeacherStudentId: profileById.has(currentStudentId) ? currentStudentId : null,
            status: 'UNRESOLVABLE',
            note: 'Teacher ownership cannot be determined for record',
          });
          continue;
        }

        // Case 1: currentStudentId matches an existing profile id
        if (profileById.has(currentStudentId)) {
          const profile = profileById.get(currentStudentId)!;
          if (profile.teacherId === teacherId) {
            reportRecords.push({
              table: tableName,
              recordId,
              teacherId,
              currentStudentId,
              matchedUserId: profile.studentAccountId,
              matchedTeacherStudentId: profile.id,
              status: 'VALID_NEW',
              note: 'Valid reference to TeacherStudent profile owned by this teacher',
            });
          } else {
            reportRecords.push({
              table: tableName,
              recordId,
              teacherId,
              currentStudentId,
              matchedUserId: profile.studentAccountId,
              matchedTeacherStudentId: profile.id,
              status: 'CONFLICT',
              note: `Profile ${profile.id} is owned by teacher ${profile.teacherId}, but record belongs to teacher ${teacherId}`,
            });
          }
          continue;
        }

        // Case 2: currentStudentId is a legacy User.id
        if (userMap.has(currentStudentId)) {
          const matchedUserId = currentStudentId;
          const existingProfileId = profileByTeacherAndAccount.get(`${teacherId}__${matchedUserId}`);

          if (existingProfileId) {
            reportRecords.push({
              table: tableName,
              recordId,
              teacherId,
              currentStudentId,
              matchedUserId,
              matchedTeacherStudentId: existingProfileId,
              status: 'VALID_LEGACY',
              note: `Legacy User.id with existing profile ${existingProfileId} for teacher ${teacherId}; needs pointer update`,
            });
          } else {
            reportRecords.push({
              table: tableName,
              recordId,
              teacherId,
              currentStudentId,
              matchedUserId,
              matchedTeacherStudentId: null,
              status: 'RESOLVABLE',
              note: `Legacy User.id exists in users table; can backfill new profile for teacher ${teacherId}`,
            });
          }
          continue;
        }

        // Case 3: currentStudentId exists neither in profiles nor in users
        reportRecords.push({
          table: tableName,
          recordId,
          teacherId,
          currentStudentId,
          matchedUserId: null,
          matchedTeacherStudentId: null,
          status: 'UNRESOLVABLE',
          note: `studentId ${currentStudentId} does not exist in teacher_student_profiles or users`,
        });
      }
    };

    // 1. teaching_lesson_participants
    await auditTable('teaching_lesson_participants', 'id', 'studentId', (row) => {
      return lessonTeacherMap.get(row.lessonId) || null;
    });

    // 2. teaching_tuition_items
    await auditTable('teaching_tuition_items', 'id', 'studentId', (row) => {
      return row.teacherId ? String(row.teacherId) : null;
    });

    // 3. teaching_tuition_payments
    await auditTable('teaching_tuition_payments', 'id', 'studentId', (row) => {
      return row.teacherId ? String(row.teacherId) : null;
    });

    // 4. teaching_learning_logs
    await auditTable('teaching_learning_logs', 'id', 'studentId', (row) => {
      return row.teacherId ? String(row.teacherId) : null;
    });

    // 5. teaching_scores
    await auditTable('teaching_scores', 'id', 'studentId', (row) => {
      return row.teacherId ? String(row.teacherId) : null;
    });

    // Aggregate summary
    const summary = {
      totalRecords: reportRecords.length,
      validNewCount: reportRecords.filter((r) => r.status === 'VALID_NEW').length,
      validLegacyCount: reportRecords.filter((r) => r.status === 'VALID_LEGACY').length,
      resolvableCount: reportRecords.filter((r) => r.status === 'RESOLVABLE').length,
      unresolvableCount: reportRecords.filter((r) => r.status === 'UNRESOLVABLE').length,
      nullCount: reportRecords.filter((r) => r.status === 'NULL').length,
      conflictCount: reportRecords.filter((r) => r.status === 'CONFLICT').length,
      byTable: {} as Record<string, { total: number; valid: number; needsMigration: number; invalid: number }>,
    };

    const targetTables = [
      'teaching_lesson_participants',
      'teaching_tuition_items',
      'teaching_tuition_payments',
      'teaching_learning_logs',
      'teaching_scores',
    ];

    for (const tbl of targetTables) {
      const tblRecords = reportRecords.filter((r) => r.table === tbl);
      summary.byTable[tbl] = {
        total: tblRecords.length,
        valid: tblRecords.filter((r) => r.status === 'VALID_NEW').length,
        needsMigration: tblRecords.filter((r) => r.status === 'VALID_LEGACY' || r.status === 'RESOLVABLE').length,
        invalid: tblRecords.filter((r) => r.status === 'UNRESOLVABLE' || r.status === 'CONFLICT' || r.status === 'NULL').length,
      };
    }

    return {
      timestamp: new Date().toISOString(),
      summary,
      records: reportRecords,
    };
  } finally {
    await connection.end();
  }
}

// Standalone CLI runner
if (process.argv[1] && process.argv[1].includes('audit-external-student-production')) {
  auditProductionDatabase()
    .then((report) => {
      console.log('============================================================');
      console.log('EXTERNAL STUDENT PRODUCTION AUDIT REPORT');
      console.log('Timestamp:', report.timestamp);
      console.log('============================================================');
      console.log('Summary:');
      console.table(report.summary.byTable);
      console.log('Status Totals:');
      console.log(`- VALID_NEW:      ${report.summary.validNewCount}`);
      console.log(`- VALID_LEGACY:   ${report.summary.validLegacyCount}`);
      console.log(`- RESOLVABLE:     ${report.summary.resolvableCount}`);
      console.log(`- UNRESOLVABLE:   ${report.summary.unresolvableCount}`);
      console.log(`- CONFLICT:       ${report.summary.conflictCount}`);
      console.log(`- NULL:           ${report.summary.nullCount}`);
      console.log(`- TOTAL AUDITED:  ${report.summary.totalRecords}`);

      if (report.records.length > 0) {
        console.log('\nSample Records:');
        console.table(report.records.slice(0, 20));
      }
    })
    .catch((err) => {
      console.error('Audit execution failed:', err);
      process.exit(1);
    });
}
