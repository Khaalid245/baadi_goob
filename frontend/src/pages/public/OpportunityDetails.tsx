import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Trophy,
  CheckCircle2,
  Landmark,
  ArrowUpRight,
  Sun,
  HeartPulse,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  MOCK_OPPORTUNITIES,
  MOCK_STUDENT_PROFILE,
  MOCK_STUDENT_APPLICATIONS,
} from '../../lib/mockData';
import api from '../../lib/api';
import type { Opportunity } from '../../types';
import { toast } from 'sonner';

export const OpportunityDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasApplied, setHasApplied] = useState<boolean>(false);
  const [appliedDate, setAppliedDate] = useState<string>('16 Oct 2026');
  const [confirmedAccuracy, setConfirmedAccuracy] = useState<boolean>(false);

  // Check state override from URL param for testing & visual verification (e.g. ?state=applied)
  const stateOverride = searchParams.get('state');

  useEffect(() => {
    let isMounted = true;

    // Check if previously applied in localStorage
    const savedApplied = localStorage.getItem(`furan_applied_${id}`);
    if (savedApplied) {
      setHasApplied(true);
      try {
        const parsed = JSON.parse(savedApplied);
        if (parsed?.date) setAppliedDate(parsed.date);
      } catch {
        // default appliedDate remains
      }
    } else if (
      (isAuthenticated || stateOverride === 'applied') &&
      MOCK_STUDENT_APPLICATIONS.some((app) => app.opportunity_id === id)
    ) {
      setHasApplied(true);
      const matched = MOCK_STUDENT_APPLICATIONS.find((app) => app.opportunity_id === id);
      if (matched?.submitted_at) {
        setAppliedDate(formatDate(matched.submitted_at));
      }
    }

    // Load opportunity
    api
      .get(`/opportunities/${id}`)
      .then((res) => {
        if (isMounted && res.data?.opportunity) {
          setOpportunity(res.data.opportunity);
        } else {
          const found = MOCK_OPPORTUNITIES.find((o) => o.id === id);
          setOpportunity(found || null);
        }
      })
      .catch(() => {
        if (isMounted) {
          const found = MOCK_OPPORTUNITIES.find((o) => o.id === id);
          setOpportunity(found || null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, isAuthenticated, stateOverride]);

  // Format date helper: "2026-10-30" -> "30 Oct 2026"
  function formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  }

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] py-8 lg:py-12 text-left">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 animate-pulse">
          <div className="h-5 w-40 bg-[#E2E6EE] rounded mb-6" />
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 bg-[#E2E6EE] rounded-[8px]" />
            <div className="h-5 w-32 bg-[#E2E6EE] rounded" />
          </div>
          <div className="h-10 w-3/4 max-w-lg bg-[#E2E6EE] rounded mb-4" />
          <div className="h-6 w-64 bg-[#E2E6EE] rounded mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 bg-white border border-[#E2E6EE] rounded-[16px] p-8 h-96" />
            <div className="lg:col-span-4 bg-white border border-[#E2E6EE] rounded-[16px] p-6 h-64" />
          </div>
        </div>
      </div>
    );
  }

  // Designed Not Found State for Unknown Opportunity IDs
  if (!opportunity) {
    return (
      <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] py-12 text-left">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16">
          <Link
            to="/opportunities"
            className="inline-flex items-center text-[14px] font-semibold text-[#1F5FBF] hover:underline mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to opportunities
          </Link>

          <div className="bg-white border border-[#E2E6EE] rounded-[16px] p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
            <div className="h-12 w-12 rounded-full bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-6 w-6" />
            </div>
            <h2 className="text-[22px] font-bold text-[#1B2433]">Opportunity not found</h2>
            <p className="text-[14px] text-[#5B6475] mt-2 mb-6 leading-[22px]">
              The opportunity you are looking for does not exist, has been removed, or the link is invalid.
            </p>
            <Link to="/opportunities">
              <Button variant="primary">Browse opportunities</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCompetition = opportunity.type === 'COMPETITION';
  const isClosed = opportunity.status === 'CLOSED' || stateOverride === 'closed';
  const isLoggedOut =
    stateOverride === 'loggedout' ||
    (!isAuthenticated &&
      stateOverride !== 'apply' &&
      stateOverride !== 'applied' &&
      stateOverride !== 'incomplete');
  const isAlreadyApplied =
    stateOverride === 'apply' || stateOverride === 'incomplete'
      ? false
      : (hasApplied || stateOverride === 'applied') && !isClosed;
  const hasIncompleteProfile =
    !isLoggedOut &&
    !isAlreadyApplied &&
    !isClosed &&
    (stateOverride === 'incomplete' ||
      (user?.role === 'STUDENT' &&
        (!user?.studentProfile?.skills || user.studentProfile.skills.length === 0)));

  const formattedDeadline = formatDate(opportunity.deadline);

  // Organization branding & identity
  const organizationName =
    opportunity.organization_name ||
    opportunity.user?.businessProfile?.company_name ||
    'Banadir Tech Hub';
  const organizationType = opportunity.organization_type || 'Technology';
  const organizationDescription =
    opportunity.organization_description ||
    opportunity.user?.businessProfile?.company_description ||
    'A local team building digital tools and supporting emerging developers in Somalia.';

  // Responsibilities & Skills
  const responsibilities =
    opportunity.responsibilities && opportunity.responsibilities.length > 0
      ? opportunity.responsibilities
      : isCompetition
      ? [
          'Develop a prototype that responds to a community need.',
          'Collaborate with a student team and refine your idea with feedback.',
          'Present your solution and explain the impact it could have.',
        ]
      : [
          'Build and improve web interfaces using React.',
          'Support simple Python services and test new features.',
          'Collaborate with the team, share progress and learn through code reviews.',
        ];

  const skills =
    opportunity.skills_required && opportunity.skills_required.length > 0
      ? opportunity.skills_required
      : ['React', 'Python'];

  const whoCanApplyText =
    opportunity.who_can_apply ||
    (isCompetition
      ? 'Somali students and recent graduates interested in using technology to solve problems. Complete your student profile before registering.'
      : 'Current students and recent graduates with relevant skills. No previous professional experience is required. Complete your Furan profile before applying.');

  // Render Org Icon matching Figma specs
  const renderOrgIcon = () => {
    const normOrg = organizationName.toLowerCase();
    const normType = organizationType.toLowerCase();

    if (isCompetition || normType.includes('gov') || normOrg.includes('ministry')) {
      return (
        <div className="h-9 w-9 rounded-[8px] bg-[#FEF3D7] text-[#8A5A00] flex items-center justify-center shrink-0">
          <Landmark className="h-4 w-4 text-[#8A5A00]" />
        </div>
      );
    }

    if (normType.includes('logistics') || normOrg.includes('jazeera')) {
      return (
        <div className="h-9 w-9 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center shrink-0">
          <ArrowUpRight className="h-5 w-5 text-[#1F5FBF]" />
        </div>
      );
    }

    if (normType.includes('solar') || normType.includes('energy') || normOrg.includes('solar')) {
      return (
        <div className="h-9 w-9 rounded-[8px] bg-[#FEF3D7] text-[#8A5A00] flex items-center justify-center shrink-0">
          <Sun className="h-4 w-4 text-[#8A5A00]" />
        </div>
      );
    }

    if (normType.includes('health') || normOrg.includes('clinic')) {
      return (
        <div className="h-9 w-9 rounded-[8px] bg-[#FDECEA] text-[#C0392B] flex items-center justify-center shrink-0">
          <HeartPulse className="h-4 w-4 text-[#C0392B]" />
        </div>
      );
    }

    return (
      <div className="h-9 w-9 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center font-mono font-bold text-sm shrink-0">
        {'{ }'}
      </div>
    );
  };

  const handleApplySubmit = async () => {
    if (!confirmedAccuracy) {
      toast.error('Please confirm your student details are accurate.');
      return;
    }

    setIsSubmitting(true);
    const currentDateFormatted = formatDate(new Date().toISOString());
    const isMockAuth = localStorage.getItem('furan_token')?.startsWith('mock_');

    if (isMockAuth) {
      // Demo / preview mode: record application locally without claiming backend sync
      localStorage.setItem(
        `furan_applied_${opportunity.id}`,
        JSON.stringify({ date: currentDateFormatted, demo: true })
      );
      setAppliedDate(currentDateFormatted);
      setHasApplied(true);
      setIsApplyModalOpen(false);
      setIsSubmitting(false);
      toast.success(
        isCompetition
          ? 'Registration confirmed! (Demo mode)'
          : 'Application submitted! (Demo mode)'
      );
      return;
    }

    try {
      const endpoint = isCompetition
        ? `/opportunities/${opportunity.id}/registrations`
        : `/opportunities/${opportunity.id}/applications`;

      await api.post(endpoint, {});
      localStorage.setItem(
        `furan_applied_${opportunity.id}`,
        JSON.stringify({ date: currentDateFormatted })
      );
      setAppliedDate(currentDateFormatted);
      setHasApplied(true);
      setIsApplyModalOpen(false);
      toast.success(
        isCompetition
          ? 'Registration confirmed! See you at the challenge.'
          : 'Application submitted successfully! Track progress in My applications.'
      );
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to submit application. Please check your connection and try again.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const backLink = isCompetition ? '/competitions' : '/opportunities';
  const backLabel = isCompetition ? 'Back to competitions' : 'Back to opportunities';

  const opportunityTypeLabel =
    opportunity.type === 'INTERNSHIP'
      ? 'Internship'
      : opportunity.type === 'JOB'
      ? 'Job'
      : 'Competition';

  return (
    <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] py-8 lg:py-12 text-left">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16">
        {/* Breadcrumb / Back Link */}
        <Link
          to={backLink}
          className="inline-flex items-center text-[14px] font-semibold text-[#1F5FBF] hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          {backLabel}
        </Link>

        {/* Opportunity Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2.5">
            {renderOrgIcon()}
            <span className="text-[15px] text-[#5B6475] font-normal">{organizationName}</span>
          </div>

          <h1 className="text-[28px] sm:text-[36px] font-bold text-[#1B2433] leading-tight tracking-tight mt-1 mb-3">
            {opportunity.title}
          </h1>

          {/* Metadata Row matching Figma Desktop & Mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[14px] text-[#5B6475]">
            <div className="flex items-center gap-3">
              <StatusBadge status={opportunity.type} />
              <span>
                {opportunity.location || 'Mogadishu'} · {opportunity.workplace_type || 'On-site'}
              </span>
            </div>
            <span className="text-[#5B6475]">
              {isClosed ? `Closed ${formattedDeadline}` : `Closes ${formattedDeadline}`}
            </span>
          </div>
        </div>

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-8">
          {/* Main Details Card (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-[#E2E6EE] rounded-[16px] p-6 sm:p-8 lg:p-10 shadow-xs text-left">
            {/* Section 1: About */}
            <div>
              <h2 className="text-[20px] font-bold text-[#1B2433] mb-3">
                {isCompetition ? 'About the competition' : 'About this opportunity'}
              </h2>
              <p className="text-[15px] text-[#5B6475] leading-[26px]">
                {opportunity.description}
              </p>
            </div>

            {/* Section 2: Responsibilities */}
            <div>
              <h2 className="text-[20px] font-bold text-[#1B2433] mb-4 mt-8">
                {isCompetition ? 'What you’ll do' : 'What you’ll work on'}
              </h2>
              <ul className="space-y-3">
                {responsibilities.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-[15px] text-[#5B6475] leading-[24px]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1F5FBF] mt-2.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 3: Required skills */}
            <div>
              <h2 className="text-[20px] font-bold text-[#1B2433] mb-3 mt-8">Required skills</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="bg-[#F7F9FC] text-[#1B2433] border border-[#E2E6EE] px-3 py-1 rounded-[6px] text-[13px] font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-[14px] text-[#5B6475] leading-[22px]">
                {isCompetition
                  ? 'Bring curiosity, teamwork and a willingness to share your ideas. Students from different fields are welcome.'
                  : `Basic knowledge of ${skills.join(
                      ' and '
                    )}, a willingness to learn and an interest in building for real users. Student projects count as experience.`}
              </p>
            </div>

            {/* Section 4: Eligibility / Who can apply */}
            <div>
              <h2 className="text-[20px] font-bold text-[#1B2433] mb-3 mt-8">
                {isCompetition ? 'Who can register' : 'Who can apply'}
              </h2>
              <p className="text-[15px] text-[#5B6475] leading-[26px]">{whoCanApplyText}</p>
            </div>

            {/* Section 5: Organization Info */}
            <div className="border-t border-[#E2E6EE] my-8" />
            <div>
              <h3 className="text-[18px] font-bold text-[#1B2433]">{organizationName}</h3>
              <p className="mt-1 text-[14px] text-[#5B6475] leading-[22px]">
                {organizationType} · {organizationDescription}
              </p>
            </div>
          </div>

          {/* Sidebar Action Card (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-[#E2E6EE] rounded-[16px] p-6 shadow-xs sticky top-24 text-left">
            {/* Card Header Row */}
            <div className="flex items-center justify-between">
              <StatusBadge status={isClosed ? 'CLOSED' : 'OPEN'} />
              {isCompetition ? (
                <Trophy className="h-5 w-5 text-[#1F5FBF]" />
              ) : (
                <Briefcase className="h-5 w-5 text-[#1F5FBF]" />
              )}
            </div>

            {/* Deadline Block */}
            <div className="mt-4">
              <p className="text-[13px] text-[#5B6475]">
                {isClosed ? 'Applications closed' : 'Application deadline'}
              </p>
              <p className="text-[26px] font-bold text-[#1B2433] mt-0.5 tracking-tight">
                {formattedDeadline}
              </p>
              <p className="text-[14px] text-[#5B6475] mt-1">
                {opportunityTypeLabel} · {opportunity.location || 'Mogadishu'}
              </p>
            </div>

            <div className="border-t border-[#E2E6EE] my-6" />

            {/* State A: Closed Opportunity */}
            {isClosed ? (
              <div>
                <p className="text-[14px] text-[#5B6475] leading-[22px] mb-6">
                  The deadline has passed. This opportunity is no longer accepting applications.
                </p>
                <Button
                  variant="secondary"
                  disabled
                  className="w-full h-[44px] bg-[#F1F3F7] text-[#8C95A6] border border-[#E2E6EE] font-semibold cursor-not-allowed"
                >
                  Closed
                </Button>
              </div>
            ) : isLoggedOut ? (
              /* State B: Logged-out Visitor */
              <div>
                <p className="text-[14px] text-[#5B6475] leading-[22px] mb-5">
                  Log in with a student account to apply with your Furan profile.
                </p>
                <Link to="/login" state={{ from: location.pathname }} className="block w-full">
                  <Button variant="primary" className="w-full h-[44px] text-[15px] font-semibold">
                    Log in to apply
                  </Button>
                </Link>
                <Link
                  to="/register"
                  className="block text-center text-[13px] text-[#1F5FBF] font-medium hover:underline mt-4"
                >
                  New to Furan? Create an account
                </Link>
              </div>
            ) : isAlreadyApplied ? (
              /* State C: Already Applied */
              <div>
                <div className="bg-[#E3F6EC] border border-[#BCEBD4] rounded-[10px] p-4 text-left">
                  <div className="flex items-center gap-2 text-[#1B2433] font-semibold text-[14px]">
                    <CheckCircle2 className="h-4 w-4 text-[#1E8E5A] shrink-0" />
                    <span>{isCompetition ? 'Registered' : 'Already applied'}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-[#5B6475] leading-[20px]">
                    {isCompetition
                      ? `You registered on ${appliedDate}. Follow updates in My applications.`
                      : `You applied on ${appliedDate}. Follow updates in My applications.`}
                  </p>
                </div>
                <Link
                  to="/student/applications"
                  className="inline-flex items-center text-[14px] font-medium text-[#1F5FBF] hover:underline mt-4"
                >
                  Go to My applications →
                </Link>
              </div>
            ) : hasIncompleteProfile ? (
              /* State D: Incomplete Profile */
              <div>
                <div className="bg-[#FEF3D7] border border-[#FCE3AA] rounded-[10px] p-4 text-left mb-4">
                  <h4 className="text-[14px] font-semibold text-[#8A5A00] mb-1.5">
                    Complete your profile first
                  </h4>
                  <p className="text-[13px] text-[#8A5A00] leading-[20px]">
                    Add your education and skills before applying. This helps the organization
                    understand your experience.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  disabled
                  className="w-full h-[44px] bg-[#F1F3F7] text-[#8C95A6] border border-[#E2E6EE] font-semibold mb-3 cursor-not-allowed"
                >
                  {isCompetition ? 'Register' : 'Apply'}
                </Button>
                <Link to="/student/profile" className="block w-full">
                  <Button variant="primary" className="w-full h-[44px] text-[15px] font-semibold">
                    Complete profile
                  </Button>
                </Link>
              </div>
            ) : isCompetition ? (
              /* State E: Competition Registration */
              <div>
                <p className="text-[14px] text-[#5B6475] leading-[22px] mb-5">
                  Use your student profile to register. Read the competition brief before joining.
                </p>
                <Button
                  variant="primary"
                  className="w-full h-[44px] text-[15px] font-semibold"
                  onClick={() => setIsApplyModalOpen(true)}
                >
                  Register
                </Button>
              </div>
            ) : (
              /* State F: Normal Open Opportunity Apply */
              <div>
                <p className="text-[14px] text-[#5B6475] leading-[22px] mb-5">
                  Ready to take the next step? Apply with your student profile.
                </p>
                <Button
                  variant="primary"
                  className="w-full h-[44px] text-[15px] font-semibold"
                  onClick={() => setIsApplyModalOpen(true)}
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Apply / Register Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title={
          isCompetition
            ? `Register for ${opportunity.title}`
            : `Apply for ${opportunity.title}`
        }
        size="md"
      >
        <div className="space-y-5 text-left">
          <p className="text-[14px] text-[#5B6475] leading-[22px]">
            {organizationName} will receive your saved student profile, including your education,
            verified skills and project links.
          </p>

          <div className="bg-[#F7F9FC] border border-[#E2E6EE] rounded-[10px] p-4 text-left space-y-2">
            <h4 className="text-[14px] font-semibold text-[#1B2433]">
              {user?.name || MOCK_STUDENT_PROFILE.full_name}
            </h4>
            <p className="text-[12px] text-[#5B6475]">
              {user?.studentProfile?.education || MOCK_STUDENT_PROFILE.education}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(user?.studentProfile?.skills || MOCK_STUDENT_PROFILE.skills || []).map(
                (sk, idx) => (
                  <span
                    key={idx}
                    className="bg-white border border-[#E2E6EE] px-2 py-0.5 rounded text-[11px] text-[#1B2433]"
                  >
                    {sk}
                  </span>
                )
              )}
            </div>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={confirmedAccuracy}
              onChange={(e) => setConfirmedAccuracy(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#E2E6EE] text-[#1F5FBF] focus:ring-[#1F5FBF]"
            />
            <span className="text-[13px] text-[#5B6475] leading-[20px]">
              I confirm my student details are accurate and up to date.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E6EE]">
            <Button
              variant="secondary"
              onClick={() => setIsApplyModalOpen(false)}
              className="px-4 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              isLoading={isSubmitting}
              onClick={handleApplySubmit}
              className="px-5 text-[13px]"
            >
              {isCompetition ? 'Confirm registration' : 'Submit application'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OpportunityDetails;
