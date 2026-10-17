import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeStatus =
  | 'NEW'
  | 'SHORTLISTED'
  | 'REJECTED'
  | 'HIRED'
  | 'PENDING'
  | 'VERIFIED'
  | 'OPEN'
  | 'CLOSED'
  | 'SUSPENDED'
  | 'ACTIVE'
  | 'INTERNSHIP'
  | 'JOB'
  | 'COMPETITION'
  | string;

export interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className,
  showDot = true,
}) => {
  const norm = status.toUpperCase();

  // Swatches from Foundations.png
  const configs: Record<
    string,
    { bg: string; text: string; dot: string; defaultLabel: string }
  > = {
    NEW: { bg: 'bg-[#E8F0FC]', text: 'text-[#1F5FBF]', dot: 'bg-[#1F5FBF]', defaultLabel: 'New' },
    SHORTLISTED: {
      bg: 'bg-[#FEF3D7]',
      text: 'text-[#8A5A00]',
      dot: 'bg-[#B7791F]',
      defaultLabel: 'Shortlisted',
    },
    REJECTED: {
      bg: 'bg-[#FDECEA]',
      text: 'text-[#C0392B]',
      dot: 'bg-[#C0392B]',
      defaultLabel: 'Rejected',
    },
    HIRED: {
      bg: 'bg-[#E3F6EC]',
      text: 'text-[#1E8E5A]',
      dot: 'bg-[#1E8E5A]',
      defaultLabel: 'Hired',
    },
    VERIFIED: {
      bg: 'bg-[#E3F6EC]',
      text: 'text-[#1B2433]',
      dot: 'bg-[#1E8E5A]',
      defaultLabel: 'Verified',
    },
    PENDING: {
      bg: 'bg-[#FEF3D7]',
      text: 'text-[#8A5A00]',
      dot: 'bg-[#B7791F]',
      defaultLabel: 'Pending',
    },
    OPEN: {
      bg: 'bg-[#E3F6EC]',
      text: 'text-[#1B2433]',
      dot: 'bg-[#1E8E5A]',
      defaultLabel: 'Open',
    },
    CLOSED: {
      bg: 'bg-[#E2E6EE]',
      text: 'text-[#5B6475]',
      dot: 'bg-[#5B6475]',
      defaultLabel: 'Closed',
    },
    SUSPENDED: {
      bg: 'bg-[#FDECEA]',
      text: 'text-[#C0392B]',
      dot: 'bg-[#C0392B]',
      defaultLabel: 'Suspended',
    },
    ACTIVE: {
      bg: 'bg-[#E3F6EC]',
      text: 'text-[#1E8E5A]',
      dot: 'bg-[#1E8E5A]',
      defaultLabel: 'Active',
    },
    // Opportunity types
    INTERNSHIP: {
      bg: 'bg-[#E0F4F4]',
      text: 'text-[#0F3166]',
      dot: 'bg-[#0F8B8D]',
      defaultLabel: 'Internship',
    },
    JOB: {
      bg: 'bg-[#E8F0FC]',
      text: 'text-[#1B2433]',
      dot: 'bg-[#1F5FBF]',
      defaultLabel: 'Job',
    },
    COMPETITION: {
      bg: 'bg-[#FEF3D7]',
      text: 'text-[#8A5A00]',
      dot: 'bg-[#8A5A00]',
      defaultLabel: 'Competition',
    },
  };

  const current = configs[norm] || {
    bg: 'bg-[#E2E6EE]',
    text: 'text-[#1B2433]',
    dot: 'bg-[#5B6475]',
    defaultLabel: status,
  };

  const displayText = label || current.defaultLabel;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium tracking-normal select-none',
        current.bg,
        current.text,
        className
      )}
    >
      {showDot && (
        <span
          className={cn('inline-block h-1.5 w-1.5 rounded-full shrink-0', current.dot)}
          aria-hidden="true"
        />
      )}
      <span>{displayText}</span>
    </span>
  );
};
