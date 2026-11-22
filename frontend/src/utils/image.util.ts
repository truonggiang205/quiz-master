import { getBackendOrigin } from '../config/api-url';

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
  return `${getBackendOrigin()}${url.startsWith('/') ? '' : '/'}${url}`;
};
