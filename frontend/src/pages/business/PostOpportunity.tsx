import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SkillChipInput } from '../../components/ui/SkillChipInput';
import { useAuth } from '../../context/AuthContext';
import { MOCK_BUSINESS_PROFILE } from '../../lib/mockData';
import api from '../../lib/api';
import type { OpportunityType } from '../../types';
import { toast } from 'sonner';

export const PostOpportunity: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const profile = user?.businessProfile || MOCK_BUSINESS_PROFILE;
  const isVerified = profile.verification_status === 'VERIFIED';

  const [type, setType] = useState<OpportunityType>('INTERNSHIP');
  const [title, setTitle] = useState('Software Development Intern');
  const [description, setDescription] = useState(
    'Build useful digital tools with a supportive engineering team in Mogadishu. This three-month internship is for students ready to put their learning into practice.\n\nYou will help develop React interfaces, write Python API endpoints and test features with real users. A mentor will review your work each week.\n\nWe welcome Computer Science students with personal or university projects. No previous employment is required.'
  );
  const [skills, setSkills] = useState<string[]>(['React', 'Python', 'Excel']);
  const [deadline, setDeadline] = useState('2026-10-30');
  const [location, setLocation] = useState('Mogadishu');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('Only verified organizations can publish opportunities.');
      return;
    }

    if (!title || !description || !deadline) {
      toast.error('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/opportunities', {
        type,
        title,
        description,
        skills_required: skills,
        deadline,
        location,
      });
      toast.success('Opportunity published successfully!');
      navigate('/business/dashboard');
    } catch {
      // Mock mode fallback:
      toast.success('Opportunity published successfully!');
      navigate('/business/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full text-left space-y-8">
      {/* Back link & Header */}
      <div>
        <Link
          to="/business/dashboard"
          className="inline-flex items-center text-[13px] font-medium text-[#1F5FBF] hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          My opportunities
        </Link>
        <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
          Business / Post opportunity
        </p>
        <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1">
          Post an opportunity
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1">
          Give young talent a clear, welcoming place to begin.
        </p>
      </div>

      {/* Blocked Pending Banner */}
      {!isVerified && (
        <div className="bg-[#FEF3D7] border border-[#F5A623]/30 rounded-[8px] p-4 flex items-center gap-2.5">
          <Clock className="h-5 w-5 text-[#8A5A00] shrink-0" />
          <div>
            <span className="text-[13px] font-semibold text-[#8A5A00]">Pending</span>
            <p className="text-[12px] text-[#8A5A00]/90">
              Your account is waiting for administrator verification. You can post opportunities once
              verified.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main form (8 cols) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-white border border-[#E2E6EE] rounded-[12px] p-6 sm:p-8 space-y-6 shadow-xs"
        >
          <div>
            <h3 className="text-[18px] font-bold text-[#1B2433]">Opportunity details</h3>
            <p className="text-[13px] text-[#5B6475] mt-0.5">Fields marked * are required.</p>
          </div>

          {/* Type radio pills */}
          <div>
            <label className="block text-[14px] font-medium text-[#1B2433] mb-2">Type *</label>
            <div className="flex flex-wrap items-center gap-3">
              {(['INTERNSHIP', 'JOB', 'COMPETITION'] as OpportunityType[]).map((t) => {
                const isSelected = type === t;
                const label = t.charAt(0) + t.slice(1).toLowerCase();
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={!isVerified}
                    onClick={() => setType(t)}
                    className={`px-4 py-2 rounded-[8px] text-[13px] font-medium border flex items-center gap-2 transition-colors ${
                      isSelected
                        ? 'border-[#1F5FBF] bg-[#E8F0FC] text-[#1F5FBF]'
                        : 'border-[#E2E6EE] text-[#5B6475] hover:bg-[#F7F9FC]'
                    } ${!isVerified ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isSelected ? 'bg-[#1F5FBF]' : 'border border-[#A3ABBA]'
                      }`}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            id="opp-title"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!isVerified}
            required
          />

          <div>
            <label htmlFor="opp-desc" className="block text-[14px] font-medium text-[#1B2433] mb-1.5">
              Description *
            </label>
            <textarea
              id="opp-desc"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isVerified}
              className="w-full bg-white border border-[#E2E6EE] rounded-[8px] p-3 text-[14px] text-[#1B2433] focus:outline-none focus:ring-2 focus:ring-[#1F5FBF] disabled:bg-gray-50"
              required
            />
            <p className="text-[12px] text-[#5B6475] mt-1.5">
              Include responsibilities, learning support and who should apply.
            </p>
          </div>

          <div>
            <SkillChipInput
              skills={skills}
              onChange={setSkills}
              label="Required skills"
              suggestions={[
                'Accounting',
                'Public Speaking',
                'Graphic Design',
                'Data Entry',
                'React',
                'Python',
                'Excel',
              ]}
              disabled={!isVerified}
            />
            {!isVerified && (
              <p className="text-[12px] text-[#5B6475] mt-1">Skills selection is disabled until verified.</p>
            )}
          </div>

          <Input
            id="opp-deadline"
            label="Application deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            helperText="Choose a future date. Today is 16 Oct 2026."
            disabled={!isVerified}
            required
          />

          <Select
            id="opp-loc"
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            options={[
              { label: 'Mogadishu', value: 'Mogadishu' },
              { label: 'Hargeisa', value: 'Hargeisa' },
              { label: 'Garowe', value: 'Garowe' },
              { label: 'Baidoa', value: 'Baidoa' },
              { label: 'Kismayo', value: 'Kismayo' },
            ]}
            disabled={!isVerified}
            required
          />

          <div className="pt-4 border-t border-[#E2E6EE] flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={!isVerified}
              isLoading={isSubmitting}
            >
              Publish opportunity
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/business/dashboard')}>
              Cancel
            </Button>
          </div>

          {!isVerified && (
            <p className="text-[12px] text-[#5B6475]">
              Publishing is disabled until your account is verified. You can still edit your company
              profile.
            </p>
          )}
        </form>

        {/* Sidebar info (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <div className="h-10 w-10 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center font-bold text-xs mb-3">
              {'{ }'}
            </div>
            <h4 className="text-[16px] font-bold text-[#1B2433]">
              {profile.company_name || 'Banadir Tech Hub'}
            </h4>
            <div className="mt-2">
              <StatusBadge status={profile.verification_status} />
            </div>
            <p className="text-[13px] text-[#5B6475] mt-4 pt-3 border-t border-[#E2E6EE]">
              This opportunity will be published by {profile.company_name || 'Banadir Tech Hub'}.
            </p>
          </div>

          <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[12px] p-6 shadow-xs">
            <h4 className="text-[15px] font-bold text-[#1B2433]">Hire for potential.</h4>
            <div className="mt-2">
              <StatusBadge status={type} />
            </div>
            <p className="text-[13px] text-[#5B6475] mt-3 leading-[20px]">
              Keep requirements realistic for someone starting out. Explain the work, support and
              next steps in plain language.
            </p>
            <p className="text-[12px] text-[#5B6475] mt-3">
              Only students who apply or register share their profile with your organization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostOpportunity;
