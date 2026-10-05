import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

export async function seedTestAccounts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'csm-db-truonggiang-205.l.aivencloud.com',
    port: Number(process.env.DB_PORT) || 25532,
    user: process.env.DB_USERNAME || 'avnadmin',
    password: process.env.DB_PASSWORD || 'AVNS__ZUD3CAQkiIrycmV2VH',
    database: process.env.DB_DATABASE || 'quizmaster',
    ssl: { rejectUnauthorized: false },
  });

  try {
    const accounts = [
      {
        email: process.env.E2E_ADMIN_EMAIL || 'admin@quizmaster.com',
        password: process.env.E2E_ADMIN_PASSWORD || 'Password@123',
        name: 'Quản Trị Viên Hệ Thống',
        role: 'ADMIN',
      },
      {
        email: process.env.E2E_TEACHER_EMAIL || 'teacher@quizmaster.com',
        password: process.env.E2E_TEACHER_PASSWORD || 'Password@123',
        name: 'Giáo Viên Kiểm Thử E2E',
        role: 'TEACHER',
      },
      {
        email: process.env.E2E_STUDENT_EMAIL || 'student@quizmaster.com',
        password: process.env.E2E_STUDENT_PASSWORD || 'Password@123',
        name: 'Học Sinh Kiểm Thử E2E',
        role: 'STUDENT',
      },
    ];

    for (const acc of accounts) {
      const [rows]: any = await connection.execute(
        'SELECT id, role FROM users WHERE email = ?',
        [acc.email]
      );

      if (rows.length > 0) {
        console.log(`[db-seed] User ${acc.email} (${acc.role}) exists.`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(acc.password, 10);
      const userId = `${acc.role.toLowerCase()}-${Date.now()}`;
      const now = new Date();

      await connection.execute(
        `INSERT INTO users (id, name, email, password, role, isVerified, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, acc.name, acc.email, hashedPassword, acc.role, 1, 1, now, now]
      );
      console.log(`[db-seed] Seeded ${acc.role} account: ${acc.email}`);
    }
  } catch (err) {
    console.error('[db-seed] Error seeding accounts:', err);
    throw err;
  } finally {
    await connection.end();
  }
}

// Direct execution
if (process.argv[1]?.includes('db-seed')) {
  seedTestAccounts()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
