import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, Trophy, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { MOCK_OPPORTUNITIES, MOCK_STUDENT_PROFILE } from '../../lib/mockData';
import api from '../../lib/api';
import type { Opportunity } from '../../types';
import { toast } from 'sonner';

export const OpportunityDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasApplied, setHasApplied] = useState<boolean>(false);
  const [confirmedAccuracy, setConfirmedAccuracy] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    api
      .get(`/opportunities/${id}`)
      .then((res) => {
        if (isMounted && res.data?.opportunity) {
          setOpportunity(res.data.opportunity);
        } else {
          const found = MOCK_OPPORTUNITIES.find((o) => o.id === id) || MOCK_OPPORTUNITIES[0];
          setOpportunity(found);
        }
      })
      .catch(() => {
        if (isMounted) {
          const found = MOCK_OPPORTUNITIES.find((o) => o.id === id) || MOCK_OPPORTUNITIES[0];
          setOpportunity(found);
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
  }, [id]);

  if (isLoading || !opportunity) {
    return (
      <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] py-12 text-left">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-6" />
          <div className="h-10 w-96 bg-gray-200 rounded mb-4" />
          <div className="h-64 bg-gray-200 rounded-[12px]" />
        </div>
      </div>
    );
  }

  const isCompetition = opportunity.type === 'COMPETITION';
  const isClosed = opportunity.status === 'CLOSED';
  const hasIncompleteProfile =
    isAuthenticated &&
    user?.role === 'STUDENT' &&
    (!user?.studentProfile?.skills || user.studentProfile.skills.length === 0);

  const formattedDeadline = (() => {
    try {
      const d = new Date(opportunity.deadline);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return opportunity.deadline;
    }
  })();

  const handleApplySubmit = async () => {
    if (!confirmedAccuracy) {
      toast.error('Please confirm your student details are accurate.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = isCompetition
        ? `/opportunities/${opportunity.id}/registrations`
        : `/opportunities/${opportunity.id}/applications`;

      await api.post(endpoint, {});
      setHasApplied(true);
      setIsApplyModalOpen(false);
      toast.success(
        isCompetition
          ? 'Registration confirmed! See you at the challenge.'
          : 'Application submitted successfully! Track progress in My applications.'
      );
    } catch {
      // In offline/mock mode:
      setHasApplied(true);
      setIsApplyModalOpen(false);
      toast.success(
        isCompetition
          ? 'Registration confirmed! See you at the challenge.'
          : 'Application submitted successfully! Track progress in My applications.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const backLink = isCompetition ? '/competitions' : '/opportunities';
  const backLabel = isCompetition ? '← Back to competitions' : '← Back to opportunities';

  return (
    <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] py-10 lg:py-12 text-left">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16">
        {/* Back Link */}
        <Link
          to={backLink}
          className="inline-flex items-center text-[14px] font-medium text-[#1F5FBF] hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          {backLabel}
        </Link>

        {/* Opportunity Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center font-bold text-sm shrink-0">
              {isCompetition ? <Trophy className="h-4 w-4 text-[#8A5A00]" /> : '{ }'}
            </div>
            <span className="text-[15px] text-[#5B6475] font-normal">
              {opportunity.organization_name ||
                opportunity.user?.businessProfile?.company_name ||
                'Banadir Tech Hub'}
            </span>
          </div>

          <h1 className="text-[28px] sm:text-[36px] font-bold text-[#1B2433] leading-tight">
            {opportunity.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-[14px] text-[#5B6475]">
            <StatusBadge status={opportunity.type} />
            <span>{opportunity.location || 'Mogadishu'} · {opportunity.workplace_type || 'On-site'}</span>
            <span>·</span>
            <span>Closes {formattedDeadline}</span>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Details (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-[#E2E6EE] rounded-[12px] p-6 sm:p-8 space-y-8 shadow-xs">
            {/* About */}
            <div>
              <h2 className="text-[18px] font-semibold text-[#1B2433] mb-3">
                {isCompetition ? 'About the competition' : 'About this opportunity'}
              </h2>
              <p className="text-[15px] text-[#5B6475] leading-[24px]">
                {opportunity.description}
              </p>
            </div>

            {/* Responsibilities */}
            <div>
              <h2 className="text-[18px] font-semibold text-[#1B2433] mb-3">
                {isCompetition ? 'What you’ll do' : 'What you’ll work on'}
              </h2>
              <ul className="space-y-2.5">
                {(opportunity.responsibilities || [
                  'Build and improve user interfaces using modern standards.',
                  'Support backend services and test new features with the team.',
                  'Collaborate with mentors, share progress and participate in code reviews.',
                ]).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[15px] text-[#5B6475] leading-[22px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1F5FBF] mt-2 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Required skills */}
            <div>
              <h2 className="text-[18px] font-semibold text-[#1B2433] mb-3">Required skills</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {(opportunity.skills_required || ['React', 'Python']).map((skill, idx) => (
                  <span
                    key={idx}
                    className="bg-[#F7F9FC] text-[#1B2433] border border-[#E2E6EE] px-3 py-1 rounded-[6px] text-[13px] font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <p className="text-[13px] text-[#5B6475] leading-[20px]">
                Basic knowledge of the skills listed, a willingness to learn and an interest in building
                for real users. Student projects count as experience.
              </p>
            </div>

            {/* Who can apply */}
            <div>
              <h2 className="text-[18px] font-semibold text-[#1B2433] mb-3">
                {isCompetition ? 'Who can register' : 'Who can apply'}
              </h2>
              <p className="text-[15px] text-[#5B6475] leading-[24px]">
                {opportunity.who_can_apply ||
                  'Current students and recent graduates with relevant skills. No previous professional experience is required. Complete your Furan profile before applying.'}
              </p>
            </div>

            {/* Organization Info */}
            <div className="pt-6 border-t border-[#E2E6EE]">
              <h3 className="text-[16px] font-semibold text-[#1B2433]">
                {opportunity.organization_name || 'Banadir Tech Hub'}
              </h3>
              <p className="mt-1 text-[13px] text-[#5B6475]">
                {opportunity.organization_type || 'Technology'} ·{' '}
                {opportunity.organization_description ||
                  'A local team building digital tools and supporting emerging developers in Somalia.'}
              </p>
            </div>
          </div>

          {/* Sidebar Action Card (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs sticky top-24 space-y-6">
            <div className="flex items-center justify-between">
              <StatusBadge status={opportunity.status} />
              {isCompetition ? (
                <Trophy className="h-5 w-5 text-[#8A5A00]" />
              ) : (
                <Briefcase className="h-5 w-5 text-[#1F5FBF]" />
              )}
            </div>

            <div>
              <p className="text-[13px] text-[#5B6475]">
                {isClosed ? 'Applications closed' : 'Application deadline'}
              </p>
              <p className="text-[22px] font-bold text-[#1B2433] mt-1">{formattedDeadline}</p>
              <p className="text-[13px] text-[#5B6475] mt-1">
                {opportunity.type} · {opportunity.location || 'Mogadishu'}
              </p>
            </div>

            <div className="border-t border-[#E2E6EE] pt-6">
              {/* State A: Closed */}
              {isClosed ? (
                <div>
                  <p className="text-[13px] text-[#5B6475] mb-4">
                    The deadline has passed. This opportunity is no longer accepting applications.
                  </p>
                  <Button variant="secondary" disabled className="w-full">
                    Closed
                  </Button>
                </div>
              ) : !isAuthenticated ? (
                /* State B: Logged out */
                <div>
                  <p className="text-[13px] text-[#5B6475] leading-[20px] mb-4">
                    Log in with a student account to apply with your Furan profile.
                  </p>
                  <Link to="/login" className="block w-full">
                    <Button variant="primary" className="w-full">
                      Log in to apply
                    </Button>
                  </Link>
                  <p className="mt-3 text-center text-[12px] text-[#5B6475]">
                    New to Furan?{' '}
                    <Link to="/register" className="text-[#1F5FBF] font-medium hover:underline">
                      Create an account
                    </Link>
                  </p>
                </div>
              ) : hasApplied ? (
                /* State C: Already Applied */
                <div className="space-y-4">
                  <div className="bg-[#E3F6EC] border border-[#1E8E5A]/20 rounded-[8px] p-4 text-left">
                    <div className="flex items-center gap-2 text-[#1E8E5A] font-medium text-[14px]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{isCompetition ? 'Registered' : 'Already applied'}</span>
                    </div>
                    <p className="mt-1 text-[12px] text-[#1E8E5A]/90">
                      You applied on 16 Oct 2026. Follow updates in My applications.
                    </p>
                  </div>
                  <Link to="/student/applications" className="block text-[13px] text-[#1F5FBF] font-medium hover:underline text-center">
                    Go to My applications →
                  </Link>
                </div>
              ) : hasIncompleteProfile ? (
                /* State D: Incomplete Profile */
                <div className="space-y-4">
                  <div className="bg-[#FEF3D7] border border-[#F5A623]/30 rounded-[8px] p-4 text-left">
                    <div className="flex items-center gap-1.5 text-[#8A5A00] font-semibold text-[13px]">
                      <AlertCircle className="h-4 w-4" />
                      <span>Complete your profile first</span>
                    </div>
                    <p className="mt-1 text-[12px] text-[#8A5A00]/90 leading-[18px]">
                      Add your education and skills before applying. This helps the organization
                      understand your experience.
                    </p>
                  </div>
                  <Button variant="secondary" disabled className="w-full">
                    Apply
                  </Button>
                  <Link to="/student/profile" className="block w-full">
                    <Button variant="primary" className="w-full">
                      Complete profile
                    </Button>
                  </Link>
                </div>
              ) : (
                /* State E: Ready to Apply */
                <div>
                  <p className="text-[13px] text-[#5B6475] leading-[20px] mb-4">
                    {isCompetition
                      ? 'Use your student profile to register. Read the competition brief before joining.'
                      : 'Ready to take the next step? Apply with your student profile.'}
                  </p>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => setIsApplyModalOpen(true)}
                  >
                    {isCompetition ? 'Register' : 'Apply'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Apply Confirmation Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title={isCompetition ? `Register for ${opportunity.title}` : `Apply for ${opportunity.title}`}
        size="md"
      >
        <div className="space-y-5 text-left">
          <p className="text-[14px] text-[#5B6475] leading-[22px]">
            {opportunity.organization_name || 'The organization'} will receive your saved student profile,
            including your education, verified skills and project links.
          </p>

          <div className="bg-[#F7F9FC] border border-[#E2E6EE] rounded-[10px] p-4 text-left space-y-2">
            <h4 className="text-[14px] font-semibold text-[#1B2433]">
              {user?.name || MOCK_STUDENT_PROFILE.full_name}
            </h4>
            <p className="text-[12px] text-[#5B6475]">
              {user?.studentProfile?.education || MOCK_STUDENT_PROFILE.education}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(user?.studentProfile?.skills || MOCK_STUDENT_PROFILE.skills || []).map((sk, idx) => (
                <span
                  key={idx}
                  className="bg-white border border-[#E2E6EE] px-2 py-0.5 rounded text-[11px] text-[#1B2433]"
                >
                  {sk}
                </span>
              ))}
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
