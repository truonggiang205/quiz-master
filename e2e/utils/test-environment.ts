import mysql from 'mysql2/promise';

/** Refuse to run browser/integration fixtures unless an operator explicitly targets the local test DB. */
export function assertE2eTestEnvironment(environment = process.env) {
  if (environment.E2E_TEST_MODE !== 'true') {
    throw new Error('Refusing E2E run: set E2E_TEST_MODE=true and provide the verified local test DB identity.');
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(environment.E2E_DB_HOST || '') ||
      environment.E2E_DB_PORT !== '3307' || environment.E2E_DB_DATABASE !== 'quizmaster' ||
      !environment.E2E_DB_SERVER_UUID || !environment.E2E_DB_USERNAME || !environment.E2E_DB_PASSWORD) {
    throw new Error('Refusing E2E run: require local 127.0.0.1:3307 quizmaster credentials and E2E_DB_SERVER_UUID.');
  }
}

export async function verifyE2eDatabaseIdentity(environment = process.env) {
  assertE2eTestEnvironment(environment);
  const connection = await mysql.createConnection({
    host: environment.E2E_DB_HOST, port: Number(environment.E2E_DB_PORT),
    user: environment.E2E_DB_USERNAME, password: environment.E2E_DB_PASSWORD,
    database: environment.E2E_DB_DATABASE,
  });
  try {
    const [rows] = await connection.query<any[]>('SELECT @@server_uuid AS serverUuid, DATABASE() AS databaseName');
    if (rows[0]?.serverUuid !== environment.E2E_DB_SERVER_UUID || rows[0]?.databaseName !== environment.E2E_DB_DATABASE) {
      throw new Error('Refusing E2E run: connected MySQL server does not match the verified test DB identity.');
    }
  } finally {
    await connection.end();
  }
}
