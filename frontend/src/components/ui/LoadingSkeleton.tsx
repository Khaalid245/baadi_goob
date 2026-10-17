import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'opportunity' | 'card' | 'text' | string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant, ...props }) => {
  if (variant === 'opportunity' || variant === 'card') {
    return (
      <div
        className={cn('bg-white border border-[#E2E6EE] rounded-[12px] p-6 space-y-4', className)}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className="h-9 w-9 bg-[#E2E6EE]/70 rounded-[8px] animate-pulse" />
          <div className="h-4 w-4 bg-[#E2E6EE]/70 rounded animate-pulse" />
        </div>
        <div className="h-5 w-3/4 bg-[#E2E6EE]/70 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-[#E2E6EE]/70 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-[#E2E6EE]/70 rounded-full animate-pulse" />
          <div className="h-5 w-16 bg-[#E2E6EE]/70 rounded-full animate-pulse" />
        </div>
        <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between">
          <div className="h-5 w-16 bg-[#E2E6EE]/70 rounded-full animate-pulse" />
          <div className="h-4 w-24 bg-[#E2E6EE]/70 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('animate-pulse bg-[#E2E6EE]/70 rounded-[6px]', className)}
      {...props}
    />
  );
};

export const LoadingSkeleton = Skeleton;

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-9 rounded-[8px]" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
