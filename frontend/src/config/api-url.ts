const DEVELOPMENT_API_URL = 'http://localhost:3000/api';

function configuredApiUrl(): string | undefined {
  const value = import.meta.env.VITE_API_URL?.trim();
  if (!value) return undefined;
  try {
    return new URL(value).toString().replace(/\/+$/, '');
  } catch {
    throw new Error('VITE_API_URL must be an absolute API URL.');
  }
}

export function getApiBaseUrl(): string {
  const apiUrl = configuredApiUrl();
  if (apiUrl) return apiUrl;
  if (import.meta.env.PROD) {
    throw new Error('Missing VITE_API_URL: production builds must configure the backend API URL.');
  }
  return DEVELOPMENT_API_URL;
}

export function getBackendOrigin(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}
