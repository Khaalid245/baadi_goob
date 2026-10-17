import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  to?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className,
  showWordmark = true,
  to = '/',
}) => {
  const content = (
    <div className={cn('inline-flex items-center gap-2.5 select-none group', className)}>
      {/* Verified Furan Door/Ascending Arrow Glyph */}
      <div className="shrink-0 text-[#1F5FBF] flex items-center">
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Angled Doorway Frame */}
          <path
            d="M2 9L13.5 4.8V23.5H9.5V11.2L5.8 12.5V23.5H2V9Z"
            fill="currentColor"
          />
          {/* Ascending Arrow */}
          <path
            d="M15.5 17.5L19.2 13.8V17H22.5V8.5H14V11.8H17.2L13.5 15.5L15.5 17.5Z"
            fill="currentColor"
          />
        </svg>
      </div>

      {showWordmark && (
        <span className="text-[22px] font-bold tracking-tight text-[#1F5FBF] transition-colors">
          Furan
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
};
