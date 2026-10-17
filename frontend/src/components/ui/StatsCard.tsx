import React from 'react';
import { cn } from '../../lib/utils';

export interface StatsCardProps {
  label: string;
  value: string | number;
  supportingText?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  supportingText,
  icon,
  badge,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-[#E2E6EE] rounded-[12px] p-6 text-left transition-colors',
        className
      )}
    >
      <div className="flex items-center justify-between text-[#5B6475] mb-2">
        <span className="text-[14px] font-normal text-[#5B6475]">{label}</span>
        {icon && <span className="text-[#5B6475]">{icon}</span>}
        {badge}
      </div>

      <div className="text-[36px] leading-[44px] font-bold text-[#1B2433] tracking-tight">
        {value}
      </div>

      {supportingText && (
        <p className="text-[13px] text-[#5B6475] mt-1.5 font-normal leading-normal">
          {supportingText}
        </p>
      )}
    </div>
  );
};
