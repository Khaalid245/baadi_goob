import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MOCK_STUDENT_APPLICATIONS } from '../../lib/mockData';
import type { ApplicationStatus } from '../../types';

export const MyApplications: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ALL' | ApplicationStatus>('ALL');
  const [applications] = useState(MOCK_STUDENT_APPLICATIONS);

  const newCount = applications.filter((a) => a.status === 'NEW').length;
  const shortlistedCount = applications.filter((a) => a.status === 'SHORTLISTED').length;
  const hiredCount = applications.filter((a) => a.status === 'HIRED').length;

  const filteredApplications = applications.filter((app) => {
    if (activeTab === 'ALL') return true;
    return app.status === activeTab;
  });

  return (
    <div className="w-full text-left space-y-8">
      {/* Header */}
      <div>
        <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
          Student / My applications
        </p>
        <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1">
          My applications
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1">
          Keep track of your applications and what comes next.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[#E2E6EE] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`text-[14px] pb-2 font-medium transition-colors border-b-2 -mb-2.5 ${
            activeTab === 'ALL'
              ? 'border-[#1F5FBF] text-[#1F5FBF] font-semibold'
              : 'border-transparent text-[#5B6475] hover:text-[#1B2433]'
          }`}
        >
          All ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('NEW')}
          className={`text-[14px] pb-2 font-medium transition-colors border-b-2 -mb-2.5 ${
            activeTab === 'NEW'
              ? 'border-[#1F5FBF] text-[#1F5FBF] font-semibold'
              : 'border-transparent text-[#5B6475] hover:text-[#1B2433]'
          }`}
        >
          New ({newCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SHORTLISTED')}
          className={`text-[14px] pb-2 font-medium transition-colors border-b-2 -mb-2.5 ${
            activeTab === 'SHORTLISTED'
              ? 'border-[#1F5FBF] text-[#1F5FBF] font-semibold'
              : 'border-transparent text-[#5B6475] hover:text-[#1B2433]'
          }`}
        >
          Shortlisted ({shortlistedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HIRED')}
          className={`text-[14px] pb-2 font-medium transition-colors border-b-2 -mb-2.5 ${
            activeTab === 'HIRED'
              ? 'border-[#1F5FBF] text-[#1F5FBF] font-semibold'
              : 'border-transparent text-[#5B6475] hover:text-[#1B2433]'
          }`}
        >
          Hired ({hiredCount})
        </button>
      </div>

      {/* Main Content Table or Empty */}
      {filteredApplications.length > 0 ? (
        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#E2E6EE]">
            <h3 className="text-[16px] font-semibold text-[#1B2433]">All applications</h3>
            <span className="text-[13px] text-[#5B6475]">
              {filteredApplications.length} applications
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left mt-2">
              <thead>
                <tr className="border-b border-[#E2E6EE] text-[13px] font-medium text-[#5B6475]">
                  <th className="py-3 px-2">Opportunity</th>
                  <th className="py-3 px-2">Company</th>
                  <th className="py-3 px-2">Date applied</th>
                  <th className="py-3 px-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6EE]">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="text-[14px] hover:bg-[#F7F9FC]/50 transition-colors">
                    <td className="py-4 px-2">
                      <Link
                        to={`/opportunities/${app.opportunity?.id || 'opp-1'}`}
                        className="font-semibold text-[#1B2433] hover:text-[#1F5FBF]"
                      >
                        {app.opportunity?.title}
                      </Link>
                      <p className="text-[12px] text-[#5B6475] mt-0.5">
                        {app.opportunity?.type ? app.opportunity.type.charAt(0) + app.opportunity.type.slice(1).toLowerCase() : 'Internship'}
                      </p>
                    </td>
                    <td className="py-4 px-2 text-[#5B6475]">
                      {app.opportunity?.organization_name ||
                        app.opportunity?.user?.businessProfile?.company_name ||
                        'Banadir Tech Hub'}
                    </td>
                    <td className="py-4 px-2 text-[#5B6475]">{app.submitted_at}</td>
                    <td className="py-4 px-2 text-right">
                      <StatusBadge status={app.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 pt-4 border-t border-[#E2E6EE] text-[13px] text-[#5B6475]">
            Showing all {filteredApplications.length} applications · Most recent updates first
          </p>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-12 text-center shadow-xs">
          <div className="h-10 w-10 rounded-full bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center mx-auto mb-4">
            <Bookmark className="h-5 w-5" />
          </div>
          <h3 className="text-[18px] font-bold text-[#1B2433]">You haven’t applied yet</h3>
          <p className="mt-1 text-[14px] text-[#5B6475] max-w-md mx-auto">
            Find an internship or job that interests you, then apply with your saved student profile.
            Your updates will appear here.
          </p>
          <div className="mt-6">
            <Link to="/opportunities">
              <Button variant="primary" className="px-6">
                Browse opportunities
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Explanatory status footnote */}
      <p className="text-[12px] text-[#5B6475] leading-normal">
        New: awaiting review. Shortlisted: next stage. Hired: offer accepted. Rejected: not selected
        for this role.
      </p>

      {/* Looking for a competition? Callout */}
      <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[12px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h4 className="text-[16px] font-bold text-[#1B2433]">Looking for a competition?</h4>
          <p className="text-[13px] text-[#5B6475] mt-1 max-w-xl">
            Your National Youth Hackathon 2026 registration is tracked separately from job and
            internship applications.
          </p>
        </div>
        <Link to="/competitions" className="shrink-0">
          <Button variant="secondary" className="bg-white text-[13px]">
            View competitions
          </Button>
        </Link>
      </div>

      <p className="text-[12px] text-[#5B6475]">
        Application updates are shown when an organization changes your status.
      </p>
    </div>
  );
};

export default MyApplications;
