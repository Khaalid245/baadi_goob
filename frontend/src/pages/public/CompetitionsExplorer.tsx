import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Bookmark, ArrowUpRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MOCK_OPPORTUNITIES } from '../../lib/mockData';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

export const CompetitionsExplorer: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  const competitions = MOCK_OPPORTUNITIES.filter((opp) => opp.type === 'COMPETITION');

  const handleBookmarkToggle = (id: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRegisterClick = (competitionId: string) => {
    if (!isAuthenticated) {
      toast.info('Please log in with a student account to register.');
      navigate(`/login?redirect=/opportunities/${competitionId}`);
      return;
    }
    navigate(`/opportunities/${competitionId}`);
  };

  return (
    <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] text-left">
      {/* 1. Amber Banner */}
      <div className="w-full bg-[#FEF3D7] border-b border-[#F5A623]/20 py-12 lg:py-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16">
          <div className="flex items-center gap-3 mb-3">
            <Trophy className="h-8 w-8 text-[#8A5A00]" />
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-bold text-[#1B2433]">Competitions</h1>
          <p className="mt-2 text-[16px] sm:text-[18px] text-[#5B6475] max-w-2xl leading-relaxed">
            Put your skills into practice. Join challenges hosted by organizations across Somalia.
          </p>
        </div>
      </div>

      {/* 2. Content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 py-12">
        <div>
          <h2 className="text-[16px] font-semibold text-[#1B2433]">
            {competitions.length} open competitions
          </h2>
          <p className="text-[13px] text-[#5B6475] mt-0.5">Registration is open · 2026</p>
        </div>

        {/* Competitions Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.map((comp) => {
            const formattedDeadline = (() => {
              try {
                const d = new Date(comp.deadline);
                return `Closes ${d.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}`;
              } catch {
                return `Closes ${comp.deadline}`;
              }
            })();

            const isBookmarked = bookmarkedIds.includes(comp.id);

            return (
              <div
                key={comp.id}
                className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 text-left flex flex-col justify-between transition-all hover:border-[#1F5FBF]/30 hover:shadow-xs"
              >
                <div>
                  {/* Top: Icon & Bookmark */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-9 w-9 rounded-[8px] bg-[#FEF3D7] flex items-center justify-center text-[#8A5A00] shrink-0">
                      <Trophy className="h-4 w-4" />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBookmarkToggle(comp.id)}
                      aria-label="Bookmark competition"
                      className="text-[#A3ABBA] hover:text-[#1F5FBF] p-1 rounded"
                    >
                      <Bookmark
                        className={`h-4 w-4 ${
                          isBookmarked ? 'fill-[#1F5FBF] text-[#1F5FBF]' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Title & Organization */}
                  <Link to={`/opportunities/${comp.id}`}>
                    <h3 className="text-[18px] font-semibold text-[#1B2433] hover:text-[#1F5FBF] transition-colors leading-[24px]">
                      {comp.title}
                    </h3>
                  </Link>
                  <p className="text-[14px] text-[#5B6475] mt-1 mb-3">
                    {comp.organization_name || comp.user?.name}
                  </p>

                  {/* Type badge & Location */}
                  <div className="flex items-center gap-2 mb-3">
                    <StatusBadge status="COMPETITION" />
                    <span className="text-[13px] text-[#5B6475]">{comp.location || 'Hargeisa'}</span>
                  </div>

                  {/* Deadline */}
                  <div className="flex items-center justify-between text-[13px] text-[#5B6475] mb-4">
                    <span>{formattedDeadline}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {(comp.skills_required || []).map((sk, idx) => (
                      <span
                        key={idx}
                        className="bg-[#F7F9FC] text-[#5B6475] border border-[#E2E6EE] px-2 py-0.5 rounded-[6px] text-[12px]"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer: Open badge & Register Button */}
                <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between mt-auto">
                  <StatusBadge status={comp.status} />
                  <Button
                    variant="primary"
                    onClick={() => handleRegisterClick(comp.id)}
                    className="px-5 py-2 text-[13px] min-h-[38px]"
                  >
                    Register
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-[13px] text-[#5B6475]">
          Choose a competition to read the brief, required skills and registration details.
        </p>
      </div>
    </div>
  );
};

export default CompetitionsExplorer;
