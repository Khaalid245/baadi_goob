import React, { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, ChevronDown, Bookmark } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { OpportunityCard } from '../../components/ui/OpportunityCard';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { MOCK_OPPORTUNITIES } from '../../lib/mockData';
import api from '../../lib/api';
import type { Opportunity, OpportunityType } from '../../types';

export const OpportunitiesExplorer: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [skillFilter, setSkillFilter] = useState<string>('ALL');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'deadline'>('newest');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6;

  useEffect(() => {
    let isMounted = true;
    api
      .get('/opportunities')
      .then((res) => {
        if (isMounted) {
          if (res.data?.opportunities && res.data.opportunities.length > 0) {
            setOpportunities(res.data.opportunities);
          } else {
            setOpportunities(MOCK_OPPORTUNITIES);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setOpportunities(MOCK_OPPORTUNITIES);
        }
      })
      .finally(() => {
        if (isMounted) {
          setTimeout(() => setIsLoading(false), 200);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleBookmarkToggle = (id: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearAll = () => {
    setSearchKeyword('');
    setTypeFilter('ALL');
    setSkillFilter('ALL');
    setDeadlineFilter('ALL');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const activeFiltersCount =
    (typeFilter !== 'ALL' ? 1 : 0) +
    (skillFilter !== 'ALL' ? 1 : 0) +
    (deadlineFilter !== 'ALL' ? 1 : 0) +
    (searchKeyword.trim() ? 1 : 0);

  // Filter opportunities
  const filteredAndSortedOpportunities = useMemo(() => {
    const now = 1792230000000; // Reference epoch for stable filtering (Oct 2026)
    const filtered = opportunities.filter((opp) => {
      // Type filter
      if (typeFilter !== 'ALL' && opp.type !== typeFilter) {
        return false;
      }

      // Skill filter
      if (skillFilter !== 'ALL') {
        const skills = Array.isArray(opp.skills_required) ? opp.skills_required : [];
        if (!skills.some((s) => s.toLowerCase().includes(skillFilter.toLowerCase()))) {
          return false;
        }
      }

      // Deadline filter
      if (deadlineFilter !== 'ALL' && opp.deadline) {
        const days = parseInt(deadlineFilter, 10);
        const deadlineDate = new Date(opp.deadline).getTime();
        const maxTime = now + days * 24 * 60 * 60 * 1000;
        if (deadlineDate < now || deadlineDate > maxTime) {
          return false;
        }
      }

      // Keyword search (title, organization, skills)
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const titleMatch = opp.title.toLowerCase().includes(q);
        const orgMatch =
          opp.organization_name?.toLowerCase().includes(q) ||
          opp.user?.businessProfile?.company_name?.toLowerCase().includes(q) ||
          opp.user?.name?.toLowerCase().includes(q);
        const skillMatch = Array.isArray(opp.skills_required)
          ? opp.skills_required.some((s) => s.toLowerCase().includes(q))
          : false;

        if (!titleMatch && !orgMatch && !skillMatch) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    if (sortBy === 'deadline') {
      return filtered.sort((a, b) => {
        const timeA = new Date(a.deadline).getTime() || 0;
        const timeB = new Date(b.deadline).getTime() || 0;
        return timeA - timeB;
      });
    }

    // Default newest order: preserves initial natural catalog order
    return filtered;
  }, [opportunities, typeFilter, skillFilter, deadlineFilter, searchKeyword, sortBy]);

  const totalResults = filteredAndSortedOpportunities.length;
  const totalPages = Math.ceil(totalResults / pageSize) || 1;
  const paginatedOpportunities = filteredAndSortedOpportunities.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] py-8 lg:py-12 text-left">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16">
        {/* 1. Page Header */}
        <div>
          <h1 className="text-[30px] sm:text-[36px] font-bold text-[#1B2433] tracking-tight">
            Find opportunities
          </h1>
          <p className="mt-1.5 text-[15px] sm:text-[16px] text-[#5B6475]">
            Internships, jobs and competitions. Find a place to put your skills to work.
          </p>
        </div>

        {/* 2. Search by Keyword */}
        <div className="mt-8">
          <label
            htmlFor="search-input"
            className="block text-[14px] font-medium text-[#1B2433] mb-2"
          >
            Search by keyword
          </label>

          {/* Desktop Search Bar (sm and up) */}
          <div className="hidden sm:flex bg-white border border-[#E2E6EE] rounded-[10px] p-2 items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 flex-1 pl-2">
              <Search className="h-5 w-5 text-[#5B6475] shrink-0" />
              <input
                id="search-input"
                type="text"
                placeholder="Search by role, skill or organization"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border-none bg-transparent py-1.5 text-[15px] text-[#1B2433] placeholder:text-[#5B6475] focus:outline-none"
              />
            </div>
            <Button
              variant="primary"
              onClick={() => setCurrentPage(1)}
              className="px-6 py-2.5 text-[14px] font-medium shrink-0"
            >
              Find opportunities
            </Button>
          </div>

          {/* Mobile Search Bar (< sm) */}
          <div className="sm:hidden space-y-3">
            <div className="bg-white border border-[#E2E6EE] rounded-[10px] p-3 flex items-center gap-2.5 shadow-xs">
              <Search className="h-5 w-5 text-[#5B6475] shrink-0" />
              <input
                id="search-input-mobile"
                type="text"
                placeholder="Role, skill or organization"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full border-none bg-transparent py-0.5 text-[14px] text-[#1B2433] placeholder:text-[#5B6475] focus:outline-none"
              />
            </div>
            <Button
              variant="primary"
              onClick={() => setCurrentPage(1)}
              className="w-full py-3 text-[14px] font-medium"
            >
              Search opportunities
            </Button>
          </div>
        </div>

        {/* 3. Filters Card */}
        <div className="mt-6 bg-white border border-[#E2E6EE] rounded-[12px] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E6EE]">
            <div className="flex items-center gap-2 text-[14px] font-medium text-[#1B2433]">
              <SlidersHorizontal className="h-4 w-4 text-[#5B6475]" />
              <span>Filters {activeFiltersCount > 0 ? `· ${activeFiltersCount} active` : ''}</span>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {/* Type Filter */}
            <div>
              <label htmlFor="type-select" className="block text-[13px] font-medium text-[#1B2433] mb-1.5">
                Type
              </label>
              <div className="relative">
                <select
                  id="type-select"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none bg-white border border-[#E2E6EE] rounded-[8px] px-3.5 py-2.5 text-[14px] text-[#1B2433] focus:outline-none focus:ring-1 focus:ring-[#1F5FBF]"
                >
                  <option value="ALL">All types</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="JOB">Job</option>
                  <option value="COMPETITION">Competition</option>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 pointer-events-none text-[#5B6475]" />
              </div>
            </div>

            {/* Skill Filter */}
            <div>
              <label htmlFor="skill-select" className="block text-[13px] font-medium text-[#1B2433] mb-1.5">
                Skill
              </label>
              <div className="relative">
                <select
                  id="skill-select"
                  value={skillFilter}
                  onChange={(e) => {
                    setSkillFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none bg-white border border-[#E2E6EE] rounded-[8px] px-3.5 py-2.5 text-[14px] text-[#1B2433] focus:outline-none focus:ring-1 focus:ring-[#1F5FBF]"
                >
                  <option value="ALL">Any skill</option>
                  <option value="React">React</option>
                  <option value="Python">Python</option>
                  <option value="Excel">Excel</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Public Speaking">Public Speaking</option>
                  <option value="Graphic Design">Graphic Design</option>
                  <option value="Data Entry">Data Entry</option>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 pointer-events-none text-[#5B6475]" />
              </div>
            </div>

            {/* Deadline Filter */}
            <div>
              <label htmlFor="deadline-select" className="block text-[13px] font-medium text-[#1B2433] mb-1.5">
                Deadline
              </label>
              <div className="relative">
                <select
                  id="deadline-select"
                  value={deadlineFilter}
                  onChange={(e) => {
                    setDeadlineFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none bg-white border border-[#E2E6EE] rounded-[8px] px-3.5 py-2.5 text-[14px] text-[#1B2433] focus:outline-none focus:ring-1 focus:ring-[#1F5FBF]"
                >
                  <option value="ALL">Any deadline</option>
                  <option value="7">Next 7 days</option>
                  <option value="14">Next 14 days</option>
                  <option value="30">Next 30 days</option>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 pointer-events-none text-[#5B6475]" />
              </div>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[#E2E6EE]">
            {(['INTERNSHIP', 'JOB', 'COMPETITION'] as OpportunityType[]).map((type) => {
              const isSelected = typeFilter === type;
              const label = type.charAt(0) + type.slice(1).toLowerCase();
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setTypeFilter(isSelected ? 'ALL' : type);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors border ${
                    isSelected
                      ? 'bg-[#E8F0FC] text-[#1F5FBF] border-[#1F5FBF]'
                      : 'bg-[#F7F9FC] text-[#5B6475] border-[#E2E6EE] hover:bg-[#E8F0FC]/60'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Results Bar & Sort Control */}
        <div className="mt-8 flex items-center justify-between">
          <p className="text-[14px] font-medium text-[#1B2433]">
            {isLoading ? 'Loading opportunities...' : `${totalResults} opportunities`}
          </p>
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-[#5B6475]">Sort:</span>
            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'newest' ? 'deadline' : 'newest')}
              className="font-medium text-[#1B2433] hover:text-[#1F5FBF] transition-colors"
            >
              {sortBy === 'newest' ? 'Newest first ↓' : 'Deadline earliest ↑'}
            </button>
          </div>
        </div>

        {/* 5. Opportunities Grid / Loading Skeleton / Empty State */}
        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <LoadingSkeleton key={i} variant="opportunity" />
              ))}
            </div>
          ) : totalResults === 0 ? (
            <div className="bg-white border border-[#E2E6EE] rounded-[12px] py-16 px-6 text-center">
              <Bookmark className="h-8 w-8 text-[#1F5FBF] stroke-[1.5] mx-auto mb-4" />
              <h2 className="text-[20px] font-semibold text-[#1B2433] mb-2">
                No opportunities found
              </h2>
              <p className="text-[14px] text-[#5B6475] max-w-md mx-auto mb-6 leading-relaxed">
                Try a different keyword or remove a filter to see more opportunities.
              </p>
              <Button
                variant="primary"
                onClick={handleClearAll}
                className="px-6 py-2.5 text-[14px] font-medium"
              >
                Clear search and filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedOpportunities.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  isBookmarked={bookmarkedIds.includes(opp.id)}
                  onBookmarkToggle={handleBookmarkToggle}
                />
              ))}
            </div>
          )}
        </div>

        {/* 6. Pagination */}
        {!isLoading && totalResults > 0 && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E2E6EE] pt-6">
            <p className="text-[13px] text-[#5B6475]">
              {Math.min((currentPage - 1) * pageSize + 1, totalResults)}–
              {Math.min(currentPage * pageSize, totalResults)} of {totalResults} opportunities
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 text-[13px] min-h-[38px]"
              >
                Previous
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-9 w-9 rounded-[8px] text-[13px] font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-[#E8F0FC] text-[#1F5FBF] font-semibold'
                      : 'text-[#5B6475] hover:bg-[#E2E6EE]/50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <Button
                variant="secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-4 py-2 text-[13px] min-h-[38px]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpportunitiesExplorer;
