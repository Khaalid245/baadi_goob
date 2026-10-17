import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ArrowUpRight, Landmark, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { cn } from '../../lib/utils';
import type { Opportunity } from '../../types';

export interface OpportunityCardProps {
  opportunity: Opportunity;
  isBookmarked?: boolean;
  onBookmarkToggle?: (id: string) => void;
  className?: string;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  opportunity,
  isBookmarked = false,
  onBookmarkToggle,
  className,
}) => {
  const isSoftware =
    opportunity.title.toLowerCase().includes('software') ||
    opportunity.title.toLowerCase().includes('dev');

  const getTypeIcon = () => {
    if (isSoftware) {
      return (
        <span className="font-mono font-bold text-[13px] text-[#0F8B8D] leading-none select-none">
          {'{ }'}
        </span>
      );
    }
    if (opportunity.type === 'COMPETITION') {
      return <Landmark className="h-4 w-4 text-[#8A5A00]" />;
    }
    if (opportunity.type === 'INTERNSHIP') {
      return <ArrowUpRight className="h-4 w-4 text-[#0F8B8D]" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-[#1F5FBF]" />;
  };

  const getTypeIconBg = () => {
    if (isSoftware || opportunity.type === 'INTERNSHIP') {
      return 'bg-[#E0F4F4]';
    }
    if (opportunity.type === 'COMPETITION') {
      return 'bg-[#FEF3D7]';
    }
    return 'bg-[#E8F0FC]';
  };

  const companyName =
    opportunity.organization_name ||
    opportunity.user?.businessProfile?.company_name ||
    opportunity.user?.name ||
    'Furan Partner';

  const formattedDeadline = (() => {
    try {
      const d = new Date(opportunity.deadline);
      const isClosed = opportunity.status === 'CLOSED';
      const prefix = isClosed ? 'Closed' : 'Closes';
      return `${prefix} ${d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}`;
    } catch {
      const prefix = opportunity.status === 'CLOSED' ? 'Closed' : 'Closes';
      return `${prefix} ${opportunity.deadline}`;
    }
  })();

  const skills = Array.isArray(opportunity.skills_required)
    ? (opportunity.skills_required as string[])
    : [];

  const location = opportunity.location || 'Mogadishu';

  return (
    <div
      className={cn(
        'group bg-white border border-[#E2E6EE] rounded-[12px] p-6 text-left flex flex-col justify-between transition-all hover:border-[#1F5FBF]/30 hover:shadow-xs',
        className
      )}
    >
      <div>
        {/* Top bar: Type icon & Bookmark */}
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              'h-9 w-9 rounded-[8px] flex items-center justify-center shrink-0',
              getTypeIconBg()
            )}
          >
            {getTypeIcon()}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBookmarkToggle?.(opportunity.id);
            }}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark opportunity'}
            className="text-[#A3ABBA] hover:text-[#1F5FBF] p-1 rounded transition-colors"
          >
            <Bookmark
              className={cn('h-4 w-4', isBookmarked && 'fill-[#1F5FBF] text-[#1F5FBF]')}
            />
          </button>
        </div>

        {/* Title & Company */}
        <h3 className="text-[18px] leading-[24px] font-semibold text-[#1B2433] group-hover:text-[#1F5FBF] transition-colors line-clamp-1">
          {opportunity.title}
        </h3>
        <p className="text-[14px] text-[#5B6475] mt-1 mb-3 line-clamp-1">{companyName}</p>

        {/* Type & Location badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StatusBadge status={opportunity.type} />
          <span className="text-[13px] text-[#5B6475] font-normal">{location}</span>
        </div>

        {/* Deadline text */}
        <p className="text-[13px] text-[#5B6475] font-normal mb-4 flex items-center justify-between">
          <span>{formattedDeadline}</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-[#1F5FBF]" />
        </p>

        {/* Skills tags */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {skills.slice(0, 3).map((skill, idx) => (
              <span
                key={idx}
                className="inline-block bg-[#F7F9FC] text-[#5B6475] border border-[#E2E6EE] px-2 py-0.5 rounded-[6px] text-[12px] font-normal"
              >
                {skill}
              </span>
            ))}
            {skills.length > 3 && (
              <span className="inline-block text-[#5B6475] text-[12px] py-0.5">
                +{skills.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom row: status & view link */}
      <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between mt-auto">
        <StatusBadge status={opportunity.status} />

        <Link
          to={`/opportunities/${opportunity.id}`}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1F5FBF] hover:text-[#164A99] transition-colors"
        >
          View details
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
};
