import { describe, expect, it } from 'vitest';
import { createCorsOptions, parseCorsAllowedOrigins } from './cors.config.js';

function originAllowed(origin: string | undefined, options = createCorsOptions({ NODE_ENV: 'development' })) {
  return new Promise<boolean>((resolve) => {
    const check = options.origin as (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => void;
    check(origin, (error, allowed) => resolve(!error && allowed === true));
  });
}

describe('production CORS configuration', () => {
  it('allows localhost only in development', async () => {
    expect(await originAllowed('http://localhost:5173')).toBe(true);
    expect(await originAllowed('https://untrusted.example')).toBe(false);
  });

  it('requires an explicit production allowlist and permits only exact origins', async () => {
    expect(() => createCorsOptions({ NODE_ENV: 'production' })).toThrow('CORS_ALLOWED_ORIGINS is required');
    const options = createCorsOptions({ NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: 'https://app.example.test, https://admin.example.test' });
    expect(await originAllowed('https://app.example.test', options)).toBe(true);
    expect(await originAllowed('https://untrusted.example', options)).toBe(false);
  });

  it('rejects wildcard allowlists with credentialed CORS', () => {
    expect(() => parseCorsAllowedOrigins('*')).toThrow('must not contain');
  });
});
