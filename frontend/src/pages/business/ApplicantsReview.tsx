import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Check, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MOCK_BUSINESS_APPLICANTS } from '../../lib/mockData';
import type { ApplicationStatus } from '../../types';
import { toast } from 'sonner';

export const ApplicantsReview: React.FC = () => {
  const { id: _id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'applicants' | 'registrants'>('applicants');
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState(MOCK_BUSINESS_APPLICANTS);

  const selectedApplicant = applicants.find((a) => a.id === selectedApplicantId) || null;

  const handleStatusChange = (applicantId: string, newStatus: ApplicationStatus) => {
    setApplicants((prev) =>
      prev.map((a) => (a.id === applicantId ? { ...a, status: newStatus } : a))
    );
    setActiveStatusDropdownId(null);
    toast.success(`Candidate status updated to ${newStatus.toLowerCase()}.`);
  };

  return (
    <div className="w-full text-left space-y-8 relative">
      {/* Header & Back Link */}
      <div>
        <Link
          to="/business/dashboard"
          className="inline-flex items-center text-[13px] font-medium text-[#1F5FBF] hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          My opportunities
        </Link>
        <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
          Business / My opportunities
        </p>
        <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1">
          Review applicants
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1">
          See the potential behind every application.
        </p>
      </div>

      {/* Opportunity Overview Card */}
      <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-bold text-[#1B2433]">Software Development Intern</h2>
          <p className="text-[13px] text-[#5B6475] mt-1">
            Banadir Tech Hub · Internship · Mogadishu
          </p>
          <p className="text-[13px] text-[#5B6475] mt-1">Closes 30 Oct 2026 · 24 applicants</p>
        </div>
        <div>
          <StatusBadge status="VERIFIED" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[#E2E6EE] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('applicants')}
          className={`text-[14px] pb-2 font-medium transition-colors border-b-2 -mb-2.5 ${
            activeTab === 'applicants'
              ? 'border-[#1F5FBF] text-[#1F5FBF] font-semibold'
              : 'border-transparent text-[#5B6475] hover:text-[#1B2433]'
          }`}
        >
          Applicants
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('registrants')}
          className={`text-[14px] pb-2 font-medium transition-colors border-b-2 -mb-2.5 ${
            activeTab === 'registrants'
              ? 'border-[#1F5FBF] text-[#1F5FBF] font-semibold'
              : 'border-transparent text-[#5B6475] hover:text-[#1B2433]'
          }`}
        >
          Competition registrants
        </button>
      </div>

      {/* Applicants List Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <p className="text-[13px] text-[#5B6475]">
            24 applicants · 8 new · 5 shortlisted · 1 hired
          </p>

          <div className="relative">
            <button
              type="button"
              className="px-3 py-1.5 rounded-[8px] border border-[#E2E6EE] bg-white text-[13px] font-medium text-[#1B2433] flex items-center gap-2 hover:bg-[#F7F9FC]"
            >
              <span>All statuses</span>
              <ChevronDown className="h-4 w-4 text-[#5B6475]" />
            </button>
          </div>
        </div>

        <p className="text-[12px] text-[#5B6475] mb-4">
          Select an applicant row or “Review profile” to see their shared student profile.
        </p>

        {/* Applicants Table */}
        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E2E6EE] text-[13px] font-medium text-[#5B6475]">
                <th className="py-3 px-3">Applicant</th>
                <th className="py-3 px-3">Skills</th>
                <th className="py-3 px-3">Applied</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6EE]">
              {applicants.map((cand) => (
                <tr
                  key={cand.id}
                  onClick={() => setSelectedApplicantId(cand.id)}
                  className={`text-[14px] transition-colors cursor-pointer hover:bg-[#F7F9FC] ${
                    selectedApplicantId === cand.id ? 'bg-[#E8F0FC]/40' : ''
                  }`}
                >
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {cand.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#1B2433]">{cand.name}</h4>
                        <p className="text-[12px] text-[#5B6475]">{cand.education}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-3 text-[13px] text-[#5B6475]">
                    {cand.skills.join(' · ')}
                  </td>
                  <td className="py-4 px-3 text-[13px] text-[#5B6475]">{cand.appliedDate}</td>
                  <td className="py-4 px-3">
                    <StatusBadge status={cand.status} />
                  </td>
                  <td className="py-4 px-3 text-right relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveStatusDropdownId(
                          activeStatusDropdownId === cand.id ? null : cand.id
                        );
                      }}
                      className="px-3 py-1.5 rounded-[8px] border border-[#E2E6EE] bg-white text-[13px] font-medium text-[#1B2433] hover:bg-[#F7F9FC] inline-flex items-center gap-1.5"
                    >
                      Update status <ChevronDown className="h-3.5 w-3.5 text-[#5B6475]" />
                    </button>

                    {/* Status Dropdown Popover */}
                    {activeStatusDropdownId === cand.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-3 top-12 z-20 w-44 bg-white border border-[#E2E6EE] rounded-[10px] shadow-lg py-1.5 text-left animate-in fade-in zoom-in-95 duration-100"
                      >
                        {(['SHORTLISTED', 'REJECTED', 'HIRED'] as ApplicationStatus[]).map(
                          (st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(cand.id, st)}
                              className="w-full px-3 py-2 text-[13px] text-[#1B2433] hover:bg-[#F7F9FC] flex items-center justify-between"
                            >
                              <span>{st.charAt(0) + st.slice(1).toLowerCase()}</span>
                              {cand.status === st && (
                                <Check className="h-3.5 w-3.5 text-[#1F5FBF]" />
                              )}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 pt-4 border-t border-[#E2E6EE] flex items-center justify-between text-[13px] text-[#5B6475]">
            <span>Showing 1–5 of 24 applicants</span>
            <Button variant="secondary" className="px-3 py-1 text-[13px] min-h-[36px]">
              Next →
            </Button>
          </div>
        </div>

        <p className="mt-4 text-[12px] text-[#5B6475]">
          Hired means an offer was accepted. Choose a status that reflects the outcome.
        </p>
      </div>

      {/* Shared for this opportunity notice */}
      <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[12px] p-6 shadow-xs">
        <h4 className="text-[15px] font-bold text-[#1B2433]">Shared for this opportunity only</h4>
        <p className="text-[13px] text-[#5B6475] mt-1 leading-[20px]">
          You can see student details only after they apply to or register for an opportunity hosted
          by your organization. Use their contact details only for this process.
        </p>
      </div>

      {/* Slide-Over Candidate Profile Drawer */}
      {selectedApplicant && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
          onClick={() => setSelectedApplicantId(null)}
        >
          <div
            className="w-full max-w-[440px] bg-white h-full shadow-2xl p-6 sm:p-8 overflow-y-auto space-y-6 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6EE]">
              <h3 className="text-[18px] font-bold text-[#1B2433]">Applicant profile</h3>
              <button
                type="button"
                onClick={() => setSelectedApplicantId(null)}
                className="text-[#5B6475] hover:text-[#1B2433] p-1 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Avatar Header */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center font-bold text-sm shrink-0">
                {selectedApplicant.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <h4 className="text-[16px] font-bold text-[#1B2433]">
                  {selectedApplicant.name}
                </h4>
                <p className="text-[12px] text-[#5B6475]">{selectedApplicant.education}</p>
                <p className="text-[12px] text-[#5B6475]">{selectedApplicant.city}</p>
              </div>
            </div>

            {/* Applied Role Box */}
            <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[10px] p-4 space-y-2">
              <h5 className="text-[14px] font-semibold text-[#1B2433]">
                {selectedApplicant.roleTitle}
              </h5>
              <p className="text-[12px] text-[#5B6475]">
                Banadir Tech Hub · Applied {selectedApplicant.appliedDate}
              </p>
              <div>
                <StatusBadge status={selectedApplicant.status} />
              </div>
            </div>

            {/* Contact */}
            <div className="pt-2 border-t border-[#E2E6EE] space-y-1">
              <h5 className="text-[14px] font-bold text-[#1B2433] mb-2">Contact</h5>
              <p className="text-[13px] text-[#5B6475]">{selectedApplicant.email}</p>
              <p className="text-[13px] text-[#5B6475]">{selectedApplicant.phone}</p>
              <p className="text-[13px] text-[#5B6475]">{selectedApplicant.city}</p>
            </div>

            {/* Education */}
            <div className="pt-2 border-t border-[#E2E6EE] space-y-1">
              <h5 className="text-[14px] font-bold text-[#1B2433] mb-2">Education</h5>
              <p className="text-[13px] font-medium text-[#1B2433]">
                {selectedApplicant.education}
              </p>
              <p className="text-[12px] text-[#5B6475]">Bachelor's degree · 2023–2027</p>
              <p className="text-[12px] text-[#5B6475]">Currently studying</p>
            </div>

            {/* Skills */}
            <div className="pt-2 border-t border-[#E2E6EE]">
              <h5 className="text-[14px] font-bold text-[#1B2433] mb-2">Skills</h5>
              <p className="text-[13px] text-[#5B6475]">
                {selectedApplicant.skills.join(' · ')}
              </p>
            </div>

            {/* Project links */}
            <div className="pt-2 border-t border-[#E2E6EE] space-y-1">
              <h5 className="text-[14px] font-bold text-[#1B2433] mb-2">Project links</h5>
              <p className="text-[13px] font-medium text-[#1B2433]">
                {selectedApplicant.projectTitle}
              </p>
              <a
                href={selectedApplicant.projectUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-[#1F5FBF] hover:underline break-all"
              >
                {selectedApplicant.projectUrl}
              </a>
              <p className="text-[12px] text-[#5B6475]">
                {selectedApplicant.projectContribution}
              </p>
            </div>

            {/* Status Actions */}
            <div className="pt-4 border-t border-[#E2E6EE] space-y-3">
              <h5 className="text-[14px] font-bold text-[#1B2433]">Application status</h5>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="px-3 py-1.5 text-[12px] min-h-[36px]"
                  onClick={() => handleStatusChange(selectedApplicant.id, 'SHORTLISTED')}
                >
                  Keep shortlisted
                </Button>
                <Button
                  variant="danger"
                  className="px-3 py-1.5 text-[12px] min-h-[36px]"
                  onClick={() => handleStatusChange(selectedApplicant.id, 'REJECTED')}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  className="px-3 py-1.5 text-[12px] min-h-[36px]"
                  onClick={() => handleStatusChange(selectedApplicant.id, 'HIRED')}
                >
                  Mark as hired
                </Button>
              </div>
              <p className="text-[11px] text-[#5B6475]">
                Mark as hired only after an offer has been accepted.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicantsReview;
