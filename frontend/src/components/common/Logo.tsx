import React from 'react';

export interface LogoProps {
  className?: string;
  alt?: string;
  forceTheme?: 'light' | 'dark';
  showText?: boolean;
  textClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
}

const SIZE_MAP = {
  sm: 'h-7 w-auto',
  md: 'h-9 w-auto',
  lg: 'h-11 w-auto',
  xl: 'h-14 w-auto',
  custom: '',
};

export const Logo: React.FC<LogoProps> = ({
  className = '',
  alt = 'QuizMaster',
  forceTheme,
  showText = false,
  textClassName = 'font-bold text-lg tracking-tight text-slate-800 dark:text-white',
  size = 'custom',
}) => {
  const sizeClasses = size !== 'custom' ? SIZE_MAP[size] : '';
  const combinedClasses = `${sizeClasses} ${className}`.trim();

  const renderImages = () => {
    if (forceTheme === 'dark') {
      return (
        <img
          src="/logo-dark.svg"
          alt={alt}
          className={`object-contain ${combinedClasses}`}
          loading="eager"
        />
      );
    }

    if (forceTheme === 'light') {
      return (
        <img
          src="/logo-light.svg"
          alt={alt}
          className={`object-contain ${combinedClasses}`}
          loading="eager"
        />
      );
    }

    return (
      <>
        {/* Rendered in Light Mode */}
        <img
          src="/logo-light.svg"
          alt={alt}
          className={`block dark:hidden object-contain ${combinedClasses}`}
          loading="eager"
        />
        {/* Rendered in Dark Mode */}
        <img
          src="/logo-dark.svg"
          alt={alt}
          className={`hidden dark:block object-contain ${combinedClasses}`}
          loading="eager"
        />
      </>
    );
  };

  if (showText) {
    return (
      <div className="flex items-center gap-2.5">
        {renderImages()}
        <span className={textClassName}>QuizMaster</span>
      </div>
    );
  }

  return <>{renderImages()}</>;
};

export default Logo;
