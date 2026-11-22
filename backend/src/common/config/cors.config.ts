import type { CorsOptions } from 'cors';

const LOCAL_DEVELOPMENT_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

export function parseCorsAllowedOrigins(value = process.env.CORS_ALLOWED_ORIGINS): Set<string> {
  const origins = new Set((value || '').split(',').map(origin => origin.trim()).filter(Boolean));
  if (origins.has('*')) {
    throw new Error('CORS_ALLOWED_ORIGINS must not contain "*" when credentials are enabled.');
  }
  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }
    if (parsed.origin !== origin) throw new Error(`CORS origin must be an exact origin: ${origin}`);
  }
  return origins;
}

/** Builds a strict allowlist for credentialed browser requests. */
export function createCorsOptions(environment = process.env): CorsOptions {
  const production = environment.NODE_ENV === 'production';
  const configured = parseCorsAllowedOrigins(environment.CORS_ALLOWED_ORIGINS);
  if (production && configured.size === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS is required in production.');
  }
  const allowed = production ? configured : new Set([...LOCAL_DEVELOPMENT_ORIGINS, ...configured]);

  return {
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    origin(origin, callback) {
      // Non-browser clients (health probes, server-to-server) do not send Origin.
      if (!origin || allowed.has(origin)) return callback(null, true);
      return callback(new Error('CORS origin is not allowed'), false);
    },
  };
}
