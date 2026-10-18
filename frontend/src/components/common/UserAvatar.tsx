import React, { useState, useEffect } from 'react';
import { resolveAvatarUrl, resolveInitials, getAvatarColor, AvatarSource } from '../../utils/avatar.util';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'header' | 'lg' | 'xl' | number;

export interface UserAvatarProps {
  user?: AvatarSource | null;
  src?: string | null;
  name?: string | null;
  size?: UserAvatarSize;
  className?: string;
  alt?: string;
  ring?: boolean;
  ringColor?: string;
}

const SIZE_MAP: Record<string, { container: string; text: string; px: number }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', px: 24 },
  sm: { container: 'w-8 h-8', text: 'text-xs', px: 32 },
  md: { container: 'w-9 h-9', text: 'text-xs', px: 36 },
  header: { container: 'w-10 h-10', text: 'text-sm', px: 40 },
  lg: { container: 'w-12 h-12', text: 'text-sm', px: 48 },
  xl: { container: 'w-16 h-16', text: 'text-base', px: 64 },
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  src,
  name,
  size = 'md',
  className = '',
  alt,
  ring = false,
  ringColor = 'ring-blue-100 dark:ring-blue-900',
}) => {
  const resolvedUrl = src || resolveAvatarUrl(user);
  const displayName = name || user?.name || '';
  const initials = resolveInitials(displayName);
  const colorScheme = getAvatarColor(displayName || initials);

  const [hasError, setHasError] = useState(false);

  // Reset error state when avatar url changes
  useEffect(() => {
    setHasError(false);
  }, [resolvedUrl]);

  let sizeClasses = '';
  let customStyle: React.CSSProperties | undefined;

  if (typeof size === 'number') {
    customStyle = { width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, Math.floor(size * 0.38))}px` };
  } else {
    const config = SIZE_MAP[size] || SIZE_MAP.md;
    sizeClasses = `${config.container} ${config.text}`;
  }

  const ringClasses = ring ? `ring-2 ${ringColor}` : '';
  const accessibilityAlt = alt || (displayName ? `Ảnh đại diện của ${displayName}` : 'Ảnh đại diện người dùng');

  // Priority 1: Real avatar URL exists and hasn't failed loading
  if (resolvedUrl && !hasError) {
    return (
      <img
        src={resolvedUrl}
        alt={accessibilityAlt}
        onError={() => setHasError(true)}
        style={customStyle}
        className={`rounded-full object-cover shrink-0 select-none ${sizeClasses} ${ringClasses} ${className}`}
        crossOrigin="anonymous"
        loading="lazy"
      />
    );
  }

  // Priority 2: Fallback to initials with soft pastel background
  return (
    <div
      style={customStyle}
      aria-label={accessibilityAlt}
      className={`rounded-full shrink-0 select-none font-bold flex items-center justify-center border ${sizeClasses} ${colorScheme.bg} ${colorScheme.text} ${colorScheme.border} ${ringClasses} ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
};
