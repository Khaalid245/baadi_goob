import React from 'react';
import { Link } from 'react-router-dom';
import { Download, Info, CheckCircle2, ShieldCheck, Briefcase } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';

export const AdminDashboard: React.FC = () => {
  const pendingQueue = [
    {
      id: 'biz-hiiraan',
      name: 'Hiiraan Health Clinic',
      category: 'Healthcare · Kismayo',
      submitted: '14 Oct 2026',
    },
    {
      id: 'biz-mic',
      name: 'Mogadishu Innovation Center',
      category: 'Technology · Mogadishu',
      submitted: '15 Oct 2026',
    },
    {
      id: 'biz-gsa',
      name: 'Garowe Skills Academy',
      category: 'Education · Garowe',
      submitted: '15 Oct 2026',
    },
  ];

  const recentActivity = [
    {
      title: 'Banadir Tech Hub verified',
      desc: 'Organization identity and contact details confirmed.',
      date: '16 Oct 2026',
      icon: ShieldCheck,
    },
    {
      title: 'Solar Installation Trainee approved',
      desc: 'Shabelle Solar · Garowe · Internship is now open.',
      date: '16 Oct 2026',
      icon: Briefcase,
    },
    {
      title: 'Junior Accountant listing updated',
      desc: 'Jazeera Logistics · Deadline confirmed for 02 Nov 2026.',
      date: '16 Oct 2026',
      icon: Briefcase,
    },
  ];

  return (
    <div className="w-full text-left space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
            Administration / Overview
          </p>
          <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1">
            Keep opportunity open. And safe.
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1">
            Your platform snapshot for 16 October 2026.
          </p>
        </div>

        <Button
          variant="secondary"
          className="shrink-0 flex items-center gap-2 px-4 text-[13px] self-start sm:self-center"
        >
          <Download className="h-4 w-4" />
          Export report
        </Button>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
          <span className="text-[13px] font-medium text-[#5B6475]">Active students</span>
          <p className="text-[36px] font-bold text-[#1B2433] mt-2 leading-none">2,480</p>
          <p className="text-[13px] text-[#1E8E5A] mt-2 font-medium">+186 this month</p>
        </div>

        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
          <span className="text-[13px] font-medium text-[#5B6475]">Verified organizations</span>
          <p className="text-[36px] font-bold text-[#1B2433] mt-2 leading-none">124</p>
          <p className="text-[13px] text-[#5B6475] mt-2">6 awaiting review</p>
        </div>

        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
          <span className="text-[13px] font-medium text-[#5B6475]">Open opportunities</span>
          <p className="text-[36px] font-bold text-[#1B2433] mt-2 leading-none">86</p>
          <p className="text-[13px] text-[#5B6475] mt-2">12 awaiting approval</p>
        </div>
      </div>

      {/* Alert Banner */}
      <div className="bg-[#E8F0FC] border border-[#1F5FBF]/20 rounded-[10px] p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-[#1F5FBF] shrink-0 mt-0.5" />
        <div>
          <p className="text-[14px] font-bold text-[#0F3166]">18 items are ready for review.</p>
          <p className="text-[13px] text-[#0F3166]/80 mt-0.5">
            6 organization verifications and 12 opportunity approvals. Start with the oldest requests.
          </p>
        </div>
      </div>

      {/* Main Grid: Review Queue & Recent Activity on Left, Moderation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Organization Review Queue Card */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6EE]">
              <h3 className="text-[16px] font-bold text-[#1B2433]">Organization review queue</h3>
              <Link
                to="/admin/businesses"
                className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
              >
                View all 6
              </Link>
            </div>

            <div className="divide-y divide-[#E2E6EE]">
              {pendingQueue.map((org) => (
                <div key={org.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center font-bold text-xs shrink-0">
                      +
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#1B2433]">{org.name}</h4>
                      <p className="text-[12px] text-[#5B6475]">{org.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[12px] text-[#5B6475]">{org.submitted}</span>
                    <StatusBadge status="PENDING" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Platform Activity */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E6EE]">
              <h3 className="text-[16px] font-bold text-[#1B2433]">Recent platform activity</h3>
              <span className="text-[13px] font-medium text-[#1F5FBF] cursor-pointer hover:underline">
                Audit log
              </span>
            </div>

            <div className="divide-y divide-[#E2E6EE]">
              {recentActivity.map((act, idx) => (
                <div key={idx} className="py-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center shrink-0 mt-0.5">
                    <act.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[14px] font-semibold text-[#1B2433]">{act.title}</h4>
                      <span className="text-[12px] text-[#5B6475]">{act.date}</span>
                    </div>
                    <p className="text-[12px] text-[#5B6475] mt-0.5">{act.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Trust & Moderation Card */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <h4 className="text-[15px] font-bold text-[#1B2433]">Trust & moderation</h4>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[32px] font-bold text-[#1B2433] leading-none">04</span>
              <StatusBadge status="PENDING" />
            </div>
            <p className="text-[13px] text-[#5B6475] mt-3 leading-[20px]">
              Flagged listings and account reports need a human review.
            </p>
            <Link to="/admin/manage" className="block mt-4">
              <Button variant="secondary" className="w-full text-[13px]">
                Review reports
              </Button>
            </Link>
          </div>

          {/* Opportunity Approvals Card */}
          <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[12px] p-6 shadow-xs space-y-4">
            <div>
              <h4 className="text-[15px] font-bold text-[#1B2433]">Opportunity approvals</h4>
              <p className="text-[13px] text-[#5B6475] mt-1 leading-[20px]">
                12 listings awaiting approval. Check clarity, eligibility and fair requirements.
              </p>
            </div>

            <div className="space-y-2 text-[13px]">
              <div className="bg-white p-2.5 rounded-[8px] border border-[#E2E6EE]">
                <p className="font-semibold text-[#1B2433]">Graphic Design Intern</p>
                <p className="text-[12px] text-[#5B6475]">Banadir Tech Hub</p>
              </div>
              <div className="bg-white p-2.5 rounded-[8px] border border-[#E2E6EE]">
                <p className="font-semibold text-[#1B2433]">Community Sports Assistant</p>
                <p className="text-[12px] text-[#5B6475]">Ministry of Youth and Sports</p>
              </div>
            </div>

            <Link to="/admin/manage" className="block">
              <Button variant="primary" className="w-full text-[13px]">
                Review opportunities
              </Button>
            </Link>
          </div>

          {/* Operational Status */}
          <div className="flex items-center gap-2 text-[12px] text-[#1E8E5A] font-medium pt-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>All services operational · 0 incidents</span>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-[#5B6475]">
        Platform overview · Updated 16 Oct 2026, 09:20 EAT
      </p>
    </div>
  );
};

export default AdminDashboard;
