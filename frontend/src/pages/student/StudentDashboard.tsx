import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { MOCK_STUDENT_USER, MOCK_STUDENT_APPLICATIONS, MOCK_OPPORTUNITIES } from '../../lib/mockData';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const student = user || MOCK_STUDENT_USER;
  const firstName = student.name ? student.name.split(' ')[0] : 'Student';

  const applications = MOCK_STUDENT_APPLICATIONS;
  const newCount = applications.filter((a) => a.status === 'NEW').length;
  const shortlistedCount = applications.filter((a) => a.status === 'SHORTLISTED').length;
  const hiredCount = applications.filter((a) => a.status === 'HIRED').length;
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;

  return (
    <div className="w-full text-left space-y-8">
      {/* Breadcrumb & Welcome Header */}
      <div>
        <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
          My Workspace / Dashboard
        </p>
        <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1">
          Welcome back, {firstName}
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1">
          A little progress today can open a big door tomorrow.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/student/profile">
            <Button variant="secondary" className="px-5 text-[14px]">
              Complete profile
            </Button>
          </Link>
          <Link to="/opportunities">
            <Button variant="primary" className="px-5 text-[14px]">
              Browse opportunities
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-[#1B2433]">Your applications</h2>
          <span className="text-[13px] text-[#5B6475]">{applications.length} total</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
            <span className="text-[13px] font-medium text-[#5B6475]">New</span>
            <p className="text-[32px] font-bold text-[#1B2433] mt-1">
              {newCount < 10 ? `0${newCount}` : newCount}
            </p>
            <p className="text-[12px] text-[#5B6475] mt-1">Awaiting review</p>
          </div>

          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
            <span className="text-[13px] font-medium text-[#5B6475]">Shortlisted</span>
            <p className="text-[32px] font-bold text-[#1B2433] mt-1">
              {shortlistedCount < 10 ? `0${shortlistedCount}` : shortlistedCount}
            </p>
            <p className="text-[12px] text-[#5B6475] mt-1">Interview next</p>
          </div>

          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
            <span className="text-[13px] font-medium text-[#5B6475]">Rejected</span>
            <p className="text-[32px] font-bold text-[#1B2433] mt-1">
              {rejectedCount < 10 ? `0${rejectedCount}` : rejectedCount}
            </p>
            <p className="text-[12px] text-[#5B6475] mt-1">Keep exploring</p>
          </div>

          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
            <span className="text-[13px] font-medium text-[#5B6475]">Hired</span>
            <p className="text-[32px] font-bold text-[#1B2433] mt-1">
              {hiredCount < 10 ? `0${hiredCount}` : hiredCount}
            </p>
            <p className="text-[12px] text-[#5B6475] mt-1">A new beginning</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Updates on Left, Profile Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Recent application updates card */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6EE]">
              <h3 className="text-[16px] font-semibold text-[#1B2433]">
                Recent application updates
              </h3>
              <Link
                to="/student/applications"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1F5FBF] hover:underline"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#E2E6EE]">
              {applications.slice(0, 3).map((app) => (
                <div key={app.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center font-bold text-xs shrink-0">
                      {'{ }'}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#1B2433]">
                        {app.opportunity?.title}
                      </h4>
                      <p className="text-[12px] text-[#5B6475]">
                        {app.opportunity?.organization_name ||
                          app.opportunity?.user?.businessProfile?.company_name ||
                          'Banadir Tech Hub'}{' '}
                        · Updated {app.submitted_at}
                      </p>
                    </div>
                  </div>

                  <StatusBadge status={app.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Competitions registered card */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2 text-[#1F5FBF]">
              <Trophy className="h-5 w-5 text-[#8A5A00]" />
              <h3 className="text-[16px] font-semibold text-[#1B2433]">Competitions registered</h3>
            </div>
            <p className="text-[32px] font-bold text-[#1B2433]">01</p>

            <div className="mt-4 pt-4 border-t border-[#E2E6EE]">
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status="COMPETITION" />
              </div>
              <h4 className="text-[15px] font-semibold text-[#1B2433]">
                {MOCK_OPPORTUNITIES[2].title}
              </h4>
              <p className="text-[13px] text-[#5B6475] mt-1">
                {MOCK_OPPORTUNITIES[2].organization_name}
              </p>
              <p className="text-[12px] text-[#5B6475] mt-1">
                Registered 12 Oct 2026 · Hargeisa
              </p>
              <p className="text-[12px] text-[#5B6475]">Registration closes 12 Nov 2026</p>

              <div className="mt-3">
                <Link
                  to={`/opportunities/${MOCK_OPPORTUNITIES[2].id}`}
                  className="inline-flex items-center text-[13px] font-medium text-[#1F5FBF] hover:underline"
                >
                  View registration →
                </Link>
              </div>
            </div>
          </div>

          <p className="text-[12px] text-[#5B6475]">
            Updated 16 Oct 2026 · Competition registrations are tracked separately.
          </p>
        </div>

        {/* Right column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Student Profile Summary Card */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center font-bold text-sm shrink-0">
                HA
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-[#1B2433]">{student.name}</h4>
                <p className="text-[12px] text-[#5B6475]">Computer Science · SIMAD University</p>
                <p className="text-[12px] text-[#5B6475]">Mogadishu</p>
              </div>
            </div>
          </div>

          {/* Make your profile count Card */}
          <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[12px] p-6 shadow-xs">
            <h4 className="text-[16px] font-bold text-[#1B2433]">Make your profile count</h4>
            <p className="text-[13px] text-[#5B6475] mt-2 leading-[20px]">
              A recent project helps organizations see what you can bring.
            </p>

            <div className="mt-5">
              <div className="flex items-center justify-between text-[13px] font-medium mb-1.5">
                <span className="text-[#1B2433]">Profile completion</span>
                <span className="text-[#1F5FBF]">80%</span>
              </div>
              <div className="w-full bg-[#E2E6EE] h-2 rounded-full overflow-hidden">
                <div className="bg-[#1F5FBF] h-full w-[80%]" />
              </div>
            </div>

            <p className="mt-4 text-[12px] text-[#5B6475]">Next: add your project links.</p>

            <Link to="/student/profile" className="block mt-4">
              <Button variant="secondary" className="w-full bg-white text-[13px]">
                Complete profile
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
