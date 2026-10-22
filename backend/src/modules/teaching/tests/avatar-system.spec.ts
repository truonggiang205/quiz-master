import { describe, it, expect } from 'vitest';

/**
 * Common Vietnamese compound surnames (Họ kép / họ ghép cha mẹ)
 */
const COMPOUND_SURNAMES = new Set([
  'võ', 'vũ', 'lê', 'nguyễn', 'trần', 'phạm', 'hoàng', 'huỳnh',
  'phan', 'bùi', 'đặng', 'đỗ', 'hồ', 'ngô', 'dương', 'lý',
  'đinh', 'đoàn', 'lâm', 'trịnh', 'mai', 'đào', 'cao', 'hà',
]);

function resolveInitials(name?: string | null): string {
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

function resolveAvatarUrl(user?: any): string | null {
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
    user.studentAccount?.avatar ||
    user.studentAccount?.avatarUrl ||
    user.account?.avatar ||
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

describe('Standardized Avatar System & Fallback Suite', () => {
  describe('Initials Generation Specification', () => {
    it('TC-Initials-01: "Hà Trường Giang" -> "HG"', () => {
      expect(resolveInitials('Hà Trường Giang')).toBe('HG');
    });

    it('TC-Initials-02: "Hà Giang" -> "HG"', () => {
      expect(resolveInitials('Hà Giang')).toBe('HG');
    });

    it('TC-Initials-03: "Trần Võ Hải Mi" -> "TV" (Compound surname Trần Võ)', () => {
      expect(resolveInitials('Trần Võ Hải Mi')).toBe('TV');
    });

    it('TC-Initials-04: "Nguyễn Văn An" -> "NA"', () => {
      expect(resolveInitials('Nguyễn Văn An')).toBe('NA');
    });

    it('TC-Initials-05: Single word name "Giang" -> "G"', () => {
      expect(resolveInitials('Giang')).toBe('G');
    });

    it('TC-Initials-06: Empty, whitespace, or null name -> "?"', () => {
      expect(resolveInitials('')).toBe('?');
      expect(resolveInitials('   ')).toBe('?');
      expect(resolveInitials(null)).toBe('?');
      expect(resolveInitials(undefined)).toBe('?');
    });
  });

  describe('Avatar URL Resolution & Priority Specification', () => {
    it('TC-Avatar-01: Real avatar URL from user.avatar is resolved', () => {
      const student = {
        name: 'Trần Võ Hải Mi',
        avatar: 'https://res.cloudinary.com/demo/image/upload/student-haimi.jpg',
      };
      expect(resolveAvatarUrl(student)).toBe('https://res.cloudinary.com/demo/image/upload/student-haimi.jpg');
    });

    it('TC-Avatar-02: Real avatar URL from user.avatarUrl is resolved', () => {
      const student = {
        name: 'Trần Võ Hải Mi',
        avatarUrl: 'https://res.cloudinary.com/demo/image/upload/student-haimi.jpg',
      };
      expect(resolveAvatarUrl(student)).toBe('https://res.cloudinary.com/demo/image/upload/student-haimi.jpg');
    });

    it('TC-Avatar-03: Linked studentAccount avatar is resolved when profile avatar is null', () => {
      const student = {
        name: 'Trần Võ Hải Mi',
        avatar: null,
        studentAccount: {
          avatar: 'https://res.cloudinary.com/demo/image/upload/student-haimi.jpg',
        },
      };
      expect(resolveAvatarUrl(student)).toBe('https://res.cloudinary.com/demo/image/upload/student-haimi.jpg');
    });

    it('TC-Avatar-04: Resolves to null when avatar is null, empty string, or undefined', () => {
      expect(resolveAvatarUrl({ name: 'Hà Giang', avatar: null })).toBeNull();
      expect(resolveAvatarUrl({ name: 'Hà Giang', avatar: '' })).toBeNull();
      expect(resolveAvatarUrl({ name: 'Hà Giang' })).toBeNull();
      expect(resolveAvatarUrl(null)).toBeNull();
      expect(resolveAvatarUrl(undefined)).toBeNull();
    });

    it('TC-Avatar-05: Ignores invalid non-URL string strings', () => {
      expect(resolveAvatarUrl('invalid-path')).toBeNull();
      expect(resolveAvatarUrl('')).toBeNull();
    });
  });
});
