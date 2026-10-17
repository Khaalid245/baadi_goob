import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, Building2, HeartPulse, Code2, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
  MOCK_STUDENT_USER,
  MOCK_STUDENT_APPLICATIONS,
  MOCK_OPPORTUNITIES,
  MOCK_STUDENT_PROFILE,
} from '../../lib/mockData';
import api from '../../lib/api';
import type { Application, StudentProfile } from '../../types';

interface DashboardSummaryData {
  role?: string;
  applications?: {
    NEW: number;
    SHORTLISTED: number;
    REJECTED: number;
    HIRED: number;
    total: number;
  };
  total_applications?: number;
  competition_registrations?: number;
  is_profile_complete?: boolean;
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const student = user || MOCK_STUDENT_USER;
  const firstName = student.name ? student.name.split(' ')[0] : 'Hodan';

  const [isLoading, setIsLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [applications, setApplications] = useState<Application[]>(MOCK_STUDENT_APPLICATIONS);
  const [profile, setProfile] = useState<StudentProfile | null>(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return user?.studentProfile || MOCK_STUDENT_PROFILE;
  });

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      api.get('/dashboard/summary'),
      api.get('/students/me/applications'),
      api.get('/students/me/profile'),
    ])
      .then(([summaryRes, appsRes, profileRes]) => {
        if (!isMounted) return;

        if (summaryRes.status === 'fulfilled' && summaryRes.value.data) {
          setSummary(summaryRes.value.data);
        }

        if (appsRes.status === 'fulfilled' && appsRes.value.data?.applications) {
          setApplications(appsRes.value.data.applications);
        } else {
          setApplications(MOCK_STUDENT_APPLICATIONS);
        }

        if (profileRes.status === 'fulfilled' && profileRes.value.data?.profile) {
          setProfile(profileRes.value.data.profile);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute application metrics
  const newCount =
    summary?.applications?.NEW ?? applications.filter((a) => a.status === 'NEW').length;
  const shortlistedCount =
    summary?.applications?.SHORTLISTED ??
    applications.filter((a) => a.status === 'SHORTLISTED').length;
  const rejectedCount =
    summary?.applications?.REJECTED ??
    applications.filter((a) => a.status === 'REJECTED').length;
  const hiredCount =
    summary?.applications?.HIRED ?? applications.filter((a) => a.status === 'HIRED').length;
  const totalCount =
    summary?.total_applications ?? summary?.applications?.total ?? (newCount + shortlistedCount + rejectedCount + hiredCount);

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    let score = 20; // Account created & basic name/email
    if (profile?.education || student.studentProfile?.education) score += 30;
    if (profile?.skills?.length || student.studentProfile?.skills?.length) score += 30;
    if (profile?.project_links?.length || student.studentProfile?.project_links?.length) score += 20;
    return Math.min(score, 100);
  };

  const completionPercent = calculateProfileCompletion();
  const nextProfileStep =
    completionPercent === 100
      ? 'Profile complete! Ready for applications.'
      : !profile?.education
      ? 'Next: add your education details.'
      : !profile?.skills?.length
      ? 'Next: add your verified skills.'
      : 'Next: add your project links.';

  const competitionCount = summary?.competition_registrations ?? 1;

  if (isLoading) {
    return (
      <div className="w-full text-left space-y-8 animate-pulse">
        <div className="space-y-3">
          <div className="h-4 w-36 bg-[#E2E6EE] rounded" />
          <div className="h-8 w-64 bg-[#E2E6EE] rounded" />
          <div className="h-4 w-80 bg-[#E2E6EE] rounded" />
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-36 bg-[#E2E6EE] rounded-[8px]" />
            <div className="h-10 w-40 bg-[#E2E6EE] rounded-[8px]" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-[#E2E6EE] rounded-[12px]" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 h-96 bg-white border border-[#E2E6EE] rounded-[12px]" />
          <div className="lg:col-span-4 h-64 bg-white border border-[#E2E6EE] rounded-[12px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-left space-y-8">
      {/* Breadcrumb & Welcome Header */}
      <div>
        <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
          MY WORKSPACE / DASHBOARD
        </p>
        <h1 className="text-[28px] sm:text-[36px] font-bold text-[#1B2433] mt-1 tracking-tight">
          Welcome back, {firstName}
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1 leading-[24px]">
          A little progress today can open a big door tomorrow.
        </p>

        {/* Action Buttons: Responsive order matching Desktop & Mobile Figma */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link to="/opportunities" className="w-full sm:w-auto order-1 sm:order-2">
            <Button variant="primary" className="w-full sm:w-auto px-5 h-[44px] text-[15px] font-semibold">
              Browse opportunities
            </Button>
          </Link>
          <Link to="/student/profile" className="w-full sm:w-auto order-2 sm:order-1">
            <Button variant="secondary" className="w-full sm:w-auto px-5 h-[44px] text-[15px] font-semibold">
              Complete profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-bold text-[#1B2433]">Your applications</h2>
          <span className="text-[13px] font-medium text-[#5B6475]">{totalCount} total</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: New */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
            <span className="text-[13px] font-medium text-[#5B6475]">New</span>
            <p className="text-[28px] sm:text-[32px] font-bold text-[#1B2433] mt-1 leading-none">
              {newCount < 10 ? `0${newCount}` : newCount}
            </p>
            <p className="text-[12px] text-[#5B6475] mt-2">Awaiting review</p>
          </div>

          {/* Card 2: Shortlisted */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
            <span className="text-[13px] font-medium text-[#5B6475]">Shortlisted</span>
            <p className="text-[28px] sm:text-[32px] font-bold text-[#1B2433] mt-1 leading-none">
              {shortlistedCount < 10 ? `0${shortlistedCount}` : shortlistedCount}
            </p>
            <p className="text-[12px] text-[#5B6475] mt-2">Interview next</p>
          </div>

          {/* Card 3: Rejected */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
            <span className="text-[13px] font-medium text-[#5B6475]">Rejected</span>
            <p className="text-[28px] sm:text-[32px] font-bold text-[#1B2433] mt-1 leading-none">
              {rejectedCount < 10 ? `0${rejectedCount}` : rejectedCount}
            </p>
            <p className="text-[12px] text-[#5B6475] mt-2">Keep exploring</p>
          </div>

          {/* Card 4: Hired */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-5 shadow-xs">
            <span className="text-[13px] font-medium text-[#5B6475]">Hired</span>
            <p className="text-[28px] sm:text-[32px] font-bold text-[#1B2433] mt-1 leading-none">
              {hiredCount < 10 ? `0${hiredCount}` : hiredCount}
            </p>
            <p className="text-[12px] text-[#5B6475] mt-2">A new beginning</p>
          </div>
        </div>
      </div>

      {/* Main Grid: On mobile, right column (Profile & Progress) comes first; on desktop (lg+), left column is 8 cols, right is 4 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (order-2 on mobile, order-1 on lg) */}
        <div className="order-2 lg:order-1 lg:col-span-8 space-y-6">
          {/* Recent Application Updates */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6EE]">
              <h3 className="text-[16px] font-bold text-[#1B2433]">
                Recent application updates
              </h3>
              <Link
                to="/student/applications"
                className="hidden sm:inline-flex items-center gap-1 text-[13px] font-medium text-[#1F5FBF] hover:underline"
              >
                View all <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </div>

            {applications.length > 0 ? (
              <div className="divide-y divide-[#E2E6EE]">
                {applications.slice(0, 3).map((app, index) => {
                  const getIcon = () => {
                    const title = app.opportunity?.title?.toLowerCase() || '';
                    if (title.includes('software') || title.includes('developer') || index === 0) {
                      return <Code2 className="h-4 w-4" />;
                    }
                    if (title.includes('data') || title.includes('health') || index === 1) {
                      return <HeartPulse className="h-4 w-4" />;
                    }
                    return <Building2 className="h-4 w-4" />;
                  };

                  return (
                    <div key={app.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 sm:mt-0">
                          {getIcon()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[14px] font-semibold text-[#1B2433] truncate">
                            {app.opportunity?.title || 'Internship Application'}
                          </h4>
                          <p className="text-[12px] text-[#5B6475] truncate">
                            {app.opportunity?.organization_name ||
                              app.opportunity?.user?.businessProfile?.company_name ||
                              'Banadir Tech Hub'}{' '}
                            · {app.status === 'SHORTLISTED' ? 'Updated 15 Oct 2026 · Interview next' : app.status === 'HIRED' ? 'Updated 10 Oct 2026 · Offer accepted' : 'Applied 13 Oct 2026 · Awaiting review'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 pl-12 sm:pl-0">
                        <StatusBadge status={app.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <FileText className="h-8 w-8 text-[#A3ABBA] mx-auto" />
                <p className="text-[14px] text-[#5B6475]">No applications submitted yet.</p>
                <Link to="/opportunities">
                  <Button variant="secondary" size="sm">
                    Find your first opportunity
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile View all link at bottom */}
            <div className="sm:hidden pt-4 border-t border-[#E2E6EE]">
              <Link
                to="/student/applications"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1F5FBF] hover:underline"
              >
                View all applications <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </div>
          </div>

          {/* Competitions Registered */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-[#8A5A00]" />
              <h3 className="text-[16px] font-bold text-[#1B2433]">Competitions registered</h3>
            </div>
            <p className="text-[28px] sm:text-[32px] font-bold text-[#1B2433] leading-none">
              {competitionCount < 10 ? `0${competitionCount}` : competitionCount}
            </p>

            <div className="mt-4 pt-4 border-t border-[#E2E6EE]">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3D7] text-[#8A5A00] border border-[#FCE3AA]">
                  Competition
                </span>
              </div>
              <h4 className="text-[15px] font-bold text-[#1B2433]">
                {MOCK_OPPORTUNITIES[2]?.title || 'National Youth Hackathon 2026'}
              </h4>
              <p className="text-[13px] text-[#5B6475] mt-1">
                {MOCK_OPPORTUNITIES[2]?.organization_name || 'Ministry of Youth and Sports'}
              </p>
              <p className="text-[12px] text-[#5B6475] mt-1">
                Registered 12 Oct 2026 · Hargeisa
              </p>
              <p className="text-[12px] text-[#5B6475]">Registration closes 12 Nov 2026</p>

              <div className="mt-3">
                <Link
                  to={`/opportunities/${MOCK_OPPORTUNITIES[2]?.id || 'opp-3'}`}
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

        {/* Right Column (order-1 on mobile, order-2 on lg) */}
        <div className="order-1 lg:order-2 lg:col-span-4 space-y-6">
          {/* Student Profile Preview Card Matching Figma */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center gap-3">
              {!avatarError ? (
                <img
                  src="/images/hodan-avatar.png"
                  alt={student.name || 'Student avatar'}
                  className="h-12 w-12 rounded-full object-cover border border-[#E2E6EE] shrink-0"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {student.name?.slice(0, 2).toUpperCase() || 'HA'}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-[15px] font-bold text-[#1B2433] truncate">{student.name}</h4>
                <p className="text-[12px] text-[#5B6475] truncate">
                  {profile?.education || 'Computer Science · SIMAD University'}
                </p>
                <p className="text-[12px] text-[#5B6475] truncate">
                  {profile?.city || 'Mogadishu'}
                </p>
              </div>
            </div>
          </div>

          {/* Make Your Profile Count Card Matching Figma */}
          <div className="bg-[#EBF2FC] border border-[#D5E2F5] rounded-[12px] p-6 shadow-xs">
            <h4 className="text-[16px] font-bold text-[#1B2433]">Make your profile count</h4>
            <p className="text-[13px] text-[#5B6475] mt-2 leading-[20px]">
              A recent project helps organizations see what you can bring.
            </p>

            <div className="mt-5">
              <div className="flex items-center justify-between text-[13px] font-medium mb-1.5">
                <span className="text-[#1B2433]">Profile completion</span>
                <span className="text-[#1F5FBF] font-semibold">{completionPercent}%</span>
              </div>
              <div className="w-full bg-[#E2E6EE] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#1F5FBF] h-full transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            <p className="mt-4 text-[12px] text-[#5B6475]">{nextProfileStep}</p>

            <Link to="/student/profile" className="block mt-4">
              <Button variant="secondary" className="w-full bg-white text-[13px] font-semibold">
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
