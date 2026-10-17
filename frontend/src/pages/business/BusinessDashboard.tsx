import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2, Clock, AlertCircle, Bookmark } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { MOCK_BUSINESS_USER } from '../../lib/mockData';
import type { VerificationStatus } from '../../types';

export const BusinessDashboard: React.FC = () => {
  const { user } = useAuth();
  const business = user || MOCK_BUSINESS_USER;
  const companyName =
    business.businessProfile?.company_name || business.name || 'Banadir Tech Hub';

  // Allow switching verification state for testing/demoing all 3 Figma screens:
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(
    business.businessProfile?.verification_status || 'VERIFIED'
  );

  const isVerified = verificationStatus === 'VERIFIED';
  const isPending = verificationStatus === 'PENDING';
  const isRejected = verificationStatus === 'REJECTED';

  const postings = [
    {
      id: 'opp-1',
      title: 'Software Development Intern',
      type: 'INTERNSHIP' as const,
      company: companyName,
      location: 'Mogadishu',
      skills: ['React', 'Python'],
      closes: '30 Oct 2026',
      status: 'OPEN' as const,
      applicantsCount: 24,
    },
    {
      id: 'opp-7',
      title: 'Community Programs Intern',
      type: 'INTERNSHIP' as const,
      company: companyName,
      location: 'Mogadishu',
      skills: ['Public Speaking', 'Excel'],
      closes: '05 Nov 2026',
      status: 'OPEN' as const,
      applicantsCount: 16,
    },
    {
      id: 'opp-2',
      title: 'Junior Research Assistant',
      type: 'JOB' as const,
      company: companyName,
      location: 'Mogadishu',
      skills: ['Excel', 'Data Entry'],
      closes: '10 Nov 2026',
      status: 'OPEN' as const,
      applicantsCount: 8,
    },
  ];

  return (
    <div className="w-full text-left space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
            Business / Dashboard
          </p>

          {/* Status switcher for testing all Figma frames */}
          <div className="flex items-center gap-1.5 text-[11px] bg-[#F7F9FC] border border-[#E2E6EE] p-1 rounded-[8px]">
            <span className="text-[#5B6475] px-1">View state:</span>
            {(['VERIFIED', 'PENDING', 'REJECTED'] as VerificationStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setVerificationStatus(st)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  verificationStatus === st
                    ? 'bg-[#1F5FBF] text-white'
                    : 'text-[#5B6475] hover:bg-[#E2E6EE]'
                }`}
              >
                {st.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-2">
          Good talent starts here.
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1">
          Here’s what’s happening at {companyName}.
        </p>
      </div>

      {/* Verification Status Banner */}
      {isVerified && (
        <div className="bg-[#E3F6EC] border border-[#1E8E5A]/20 rounded-[8px] p-4 flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-[#1E8E5A] shrink-0" />
          <div>
            <span className="text-[13px] font-semibold text-[#1E8E5A]">Verified</span>
            <p className="text-[12px] text-[#1E8E5A]/90">
              Your company is verified. You can publish opportunities and review your applicants.
            </p>
          </div>
        </div>
      )}

      {isPending && (
        <div className="bg-[#FEF3D7] border border-[#F5A623]/30 rounded-[8px] p-4 flex items-center gap-2.5">
          <Clock className="h-5 w-5 text-[#8A5A00] shrink-0" />
          <div>
            <span className="text-[13px] font-semibold text-[#8A5A00]">Pending</span>
            <p className="text-[12px] text-[#8A5A00]/90">
              Your account is waiting for administrator verification. You can post opportunities
              once verified.
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="bg-[#FDECEA] border border-[#C0392B]/20 rounded-[8px] p-4 flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-[#C0392B] shrink-0" />
          <div>
            <span className="text-[13px] font-semibold text-[#C0392B]">Verification declined</span>
            <p className="text-[12px] text-[#C0392B]/90">
              Your organization could not be verified. Review administrator feedback or update your
              company details.
            </p>
          </div>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
          <span className="text-[13px] font-medium text-[#5B6475]">Active opportunities</span>
          <p className="text-[32px] font-bold text-[#1B2433] mt-1">
            {isVerified ? '03' : '00'}
          </p>
          <p className="text-[12px] text-[#5B6475] mt-1">
            {isVerified ? 'Open for applications' : 'None published'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
          <span className="text-[13px] font-medium text-[#5B6475]">New applicants</span>
          <p className="text-[32px] font-bold text-[#1B2433] mt-1">
            {isVerified ? '12' : '00'}
          </p>
          <p className="text-[12px] text-[#5B6475] mt-1">
            {isVerified ? 'Awaiting first review' : 'No applications yet'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
          <span className="text-[13px] font-medium text-[#5B6475]">Shortlisted count</span>
          <p className="text-[32px] font-bold text-[#1B2433] mt-1">
            {isVerified ? '09' : '00'}
          </p>
          <p className="text-[12px] text-[#5B6475] mt-1">
            {isVerified ? 'Across your listings' : 'No candidates yet'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
          <span className="text-[13px] font-medium text-[#5B6475]">Hired count</span>
          <p className="text-[32px] font-bold text-[#1B2433] mt-1">
            {isVerified ? '04' : '00'}
          </p>
          <p className="text-[12px] text-[#5B6475] mt-1">
            {isVerified ? 'Offers accepted' : 'No hires yet'}
          </p>
        </div>
      </div>

      {/* Your next step Section */}
      <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[12px] p-6 shadow-xs">
        <h3 className="text-[16px] font-bold text-[#1B2433]">Your next step</h3>
        <p className="text-[13px] text-[#5B6475] mt-1 max-w-2xl leading-[20px]">
          {isVerified
            ? 'A timely reply makes a real difference to someone starting out. Review new applications or make room for another first opportunity.'
            : 'You can keep your company details up to date while the administrator reviews your account.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isVerified ? (
            <>
              <Link to="/business/opportunities/new">
                <Button variant="primary" className="px-5 text-[13px]">
                  Post opportunity
                </Button>
              </Link>
              <Link to="/business/opportunities/opp-1/applicants">
                <Button variant="secondary" className="bg-white px-5 text-[13px]">
                  Review applicants
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Button variant="secondary" disabled className="px-5 text-[13px] flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Post opportunity
              </Button>
              <Button variant="secondary" disabled className="px-5 text-[13px]">
                Review applicants
              </Button>
              <Link to="/business/profile">
                <Button variant="secondary" className="bg-white px-5 text-[13px]">
                  Edit company profile
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Active postings Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-[#1B2433]">Active postings</h2>
          <span className="text-[13px] text-[#5B6475]">
            {isVerified ? `${postings.length} listings` : '0 listings'}
          </span>
        </div>

        {isVerified ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postings.map((post) => (
              <div
                key={post.id}
                className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 flex flex-col justify-between shadow-xs transition-all hover:border-[#1F5FBF]/30"
              >
                <div>
                  <div className="h-9 w-9 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center font-bold text-xs mb-4">
                    {'{ }'}
                  </div>
                  <h3 className="text-[17px] font-bold text-[#1B2433] leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-[13px] text-[#5B6475] mt-1">{post.company}</p>

                  <div className="flex items-center gap-2 mt-3">
                    <StatusBadge status={post.type} />
                    <span className="text-[13px] text-[#5B6475]">{post.location}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {post.skills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="bg-[#F7F9FC] text-[#5B6475] border border-[#E2E6EE] px-2 py-0.5 rounded-[6px] text-[12px]"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>

                  <p className="text-[13px] text-[#5B6475] mt-3">Closes {post.closes}</p>
                </div>

                <div className="pt-4 border-t border-[#E2E6EE] mt-6 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#1B2433]">
                    {post.applicantsCount} applicants
                  </span>
                  <Link
                    to={`/business/opportunities/${post.id}/applicants`}
                    className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1F5FBF] hover:underline"
                  >
                    Review applicants <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-12 text-center shadow-xs">
            <div className="h-10 w-10 rounded-full bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center mx-auto mb-3">
              <Bookmark className="h-5 w-5" />
            </div>
            <h3 className="text-[18px] font-bold text-[#1B2433]">Your first listing starts here.</h3>
            <p className="mt-1 text-[14px] text-[#5B6475] max-w-md mx-auto">
              You have no active postings. Opportunities can be published once your business is verified.
            </p>
          </div>
        )}
      </div>

      {/* Organization footer card */}
      <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-[10px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center font-bold text-sm shrink-0">
            {'{ }'}
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[#1B2433]">{companyName}</h4>
            <p className="text-[13px] text-[#5B6475]">Technology · Mogadishu</p>
            <div className="mt-2">
              <StatusBadge status={verificationStatus} />
            </div>
          </div>
        </div>

        <p className="text-[13px] text-[#5B6475] max-w-sm">
          Hire for potential. Clear requirements and fair feedback help young talent thrive.
        </p>
      </div>

      <p className="text-[12px] text-[#5B6475]">
        Updated 16 Oct 2026 · {companyName} workspace
      </p>
    </div>
  );
};

export default BusinessDashboard;
