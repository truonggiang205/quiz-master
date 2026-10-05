export const resolveImageUrl = (url?: string): string => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
  const apiBase = rawApiUrl.replace(/\/api\/?$/, '');
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
};
