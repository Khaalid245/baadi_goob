import React from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  heading?: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  heading,
  description,
  action,
  actionLabel,
  onAction,
  className,
}) => {
  const displayTitle = heading || title || 'No results found';

  return (
    <div
      className={cn(
        'w-full bg-white border border-[#E2E6EE] rounded-[12px] p-10 text-center flex flex-col items-center justify-center my-6',
        className
      )}
    >
      <div className="h-12 w-12 rounded-[10px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center mb-4">
        {icon || <Bookmark className="h-6 w-6 text-[#1F5FBF]" />}
      </div>

      <h3 className="text-[18px] leading-[24px] font-semibold text-[#1B2433] mb-2">
        {displayTitle}
      </h3>

      <p className="text-[14px] leading-[20px] text-[#5B6475] max-w-md mx-auto mb-6">
        {description}
      </p>

      {action ? (
        <div>{action}</div>
      ) : actionLabel && onAction ? (
        <div>
          <Button variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
