/**
 * Avatar Resolution & Initials Utility
 * Follows priority: Real Avatar URL -> Initials -> Default Fallback
 */

export interface AvatarSource {
  avatar?: string | null;
  avatarUrl?: string | null;
  profileImage?: string | null;
  photoUrl?: string | null;
  image?: string | null;
  studentAvatar?: string | null;
  name?: string | null;
  fullName?: string | null;
}

/**
 * Resolves the real avatar image URL from various user / student object representations.
 */
export function resolveAvatarUrl(user?: AvatarSource | string | null): string | null {
  if (!user) return null;

  if (typeof user === 'string') {
    const trimmed = user.trim();
    if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('/'))) {
      return trimmed;
    }
    return null;
  }

  const rawUrl =
    user.avatar ||
    user.avatarUrl ||
    user.studentAvatar ||
    (user as any).studentAccount?.avatar ||
    (user as any).studentAccount?.avatarUrl ||
    (user as any).account?.avatar ||
    user.profileImage ||
    user.photoUrl ||
    user.image;

  if (typeof rawUrl === 'string') {
    const trimmed = rawUrl.trim();
    if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('/'))) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Common Vietnamese compound surnames (Họ kép / họ ghép cha mẹ)
 */
const COMPOUND_SURNAMES = new Set([
  'võ', 'vũ', 'lê', 'nguyễn', 'trần', 'phạm', 'hoàng', 'huỳnh',
  'phan', 'bùi', 'đặng', 'đỗ', 'hồ', 'ngô', 'dương', 'lý',
  'đinh', 'đoàn', 'lâm', 'trịnh', 'mai', 'đào', 'cao', 'hà'
]);

/**
 * Generates clean 1 or 2 letter uppercase initials from Vietnamese or international names.
 * Examples:
 *  "Hà Trường Giang" -> "HG"
 *  "Hà Giang" -> "HG"
 *  "Trần Võ Hải Mi" -> "TV" (Họ kép Trần Võ)
 *  "Nguyễn Văn An" -> "NA"
 *  "Giang" -> "G"
 *  "" -> "?"
 */
export function resolveInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return '?';
  const clean = name.trim();
  if (!clean) return '?';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  // Handle 4-word names with compound surnames (Họ kép như Trần Võ, Nguyễn Lê...)
  if (parts.length === 4 && COMPOUND_SURNAMES.has(parts[1].toLowerCase())) {
    const firstSurname = parts[0].charAt(0).toUpperCase();
    const secondSurname = parts[1].charAt(0).toUpperCase();
    return `${firstSurname}${secondSurname}`;
  }

  const firstLetter = parts[0].charAt(0).toUpperCase();
  const lastLetter = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstLetter}${lastLetter}`;
}

/**
 * Generates harmonious, soft pastel colors for initials avatars.
 */
const AVATAR_PALETTE = [
  { bg: 'bg-blue-100 dark:bg-blue-950/80', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  { bg: 'bg-indigo-100 dark:bg-indigo-950/80', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  { bg: 'bg-sky-100 dark:bg-sky-950/80', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  { bg: 'bg-emerald-100 dark:bg-emerald-950/80', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  { bg: 'bg-teal-100 dark:bg-teal-950/80', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  { bg: 'bg-violet-100 dark:bg-violet-950/80', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
  { bg: 'bg-amber-100 dark:bg-amber-950/80', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
];

export function getAvatarColor(seed?: string | null): { bg: string; text: string; border: string } {
  if (!seed) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}
