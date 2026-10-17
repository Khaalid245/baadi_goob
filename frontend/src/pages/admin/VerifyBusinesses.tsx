import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import api from '../../lib/api';
import type { VerificationStatus } from '../../types';
import { toast } from 'sonner';

interface BusinessItem {
  id: string;
  name: string;
  category: string;
  location: string;
  contactName: string;
  contactEmail: string;
  status: VerificationStatus;
  date: string;
}

export const VerifyBusinesses: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | VerificationStatus>('PENDING');
  const [businesses, setBusinesses] = useState<BusinessItem[]>([
    {
      id: 'biz-1',
      name: 'Hiiraan Health Clinic',
      category: 'Healthcare',
      location: 'Kismayo',
      contactName: 'Dr. Ali Warsame',
      contactEmail: 'ali@hiiraanhealth.example',
      status: 'PENDING',
      date: '14 Oct 2026',
    },
    {
      id: 'biz-2',
      name: 'Mogadishu Innovation Center',
      category: 'Technology',
      location: 'Mogadishu',
      contactName: 'Fatima Nur',
      contactEmail: 'fatima@mic.example',
      status: 'PENDING',
      date: '15 Oct 2026',
    },
    {
      id: 'biz-3',
      name: 'Garowe Skills Academy',
      category: 'Education',
      location: 'Garowe',
      contactName: 'Yusuf Barre',
      contactEmail: 'yusuf@gsa.example',
      status: 'PENDING',
      date: '15 Oct 2026',
    },
    {
      id: 'biz-4',
      name: 'Banadir Tech Hub',
      category: 'Technology',
      location: 'Mogadishu',
      contactName: 'Ahmed Hassan',
      contactEmail: 'hello@banadirtech.example',
      status: 'VERIFIED',
      date: '08 Oct 2026',
    },
    {
      id: 'biz-5',
      name: 'Jazeera Logistics',
      category: 'Logistics',
      location: 'Mogadishu',
      contactName: 'Khadija Osman',
      contactEmail: 'careers@jazeera.example',
      status: 'VERIFIED',
      date: '05 Oct 2026',
    },
    {
      id: 'biz-6',
      name: 'Shabelle Solar',
      category: 'Renewable Energy',
      location: 'Garowe',
      contactName: 'Liban Duale',
      contactEmail: 'jobs@shabellesolar.example',
      status: 'VERIFIED',
      date: '02 Oct 2026',
    },
  ]);

  const handleUpdateStatus = async (id: string, newStatus: VerificationStatus) => {
    try {
      await api.patch(`/admin/businesses/${id}/verification`, { status: newStatus });
    } catch {
      // offline fallback
    }
    setBusinesses((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
    toast.success(
      `Organization ${newStatus === 'VERIFIED' ? 'approved' : 'declined'} successfully.`
    );
  };

  const filtered = businesses.filter((b) => {
    if (filter === 'ALL') return true;
    return b.status === filter;
  });

  return (
    <div className="w-full text-left space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center text-[13px] font-medium text-[#1F5FBF] hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Platform overview
        </Link>
        <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
          Administration / Businesses
        </p>
        <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1">
          Verify organizations
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1">
          Review credentials and approve organizations before they can publish listings.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[#E2E6EE] pb-2">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`text-[14px] pb-2 font-medium transition-colors border-b-2 -mb-2.5 ${
            filter === 'ALL'
              ? 'border-[#1F5FBF] text-[#1F5FBF] font-semibold'
              : 'border-transparent text-[#5B6475] hover:text-[#1B2433]'
          }`}
        >
          All ({businesses.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('PENDING')}
          className={`text-[14px] pb-2 font-medium transition-colors border-b-2 -mb-2.5 ${
            filter === 'PENDING'
              ? 'border-[#1F5FBF] text-[#1F5FBF] font-semibold'
              : 'border-transparent text-[#5B6475] hover:text-[#1B2433]'
          }`}
        >
          Pending review ({businesses.filter((b) => b.status === 'PENDING').length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('VERIFIED')}
          className={`text-[14px] pb-2 font-medium transition-colors border-b-2 -mb-2.5 ${
            filter === 'VERIFIED'
              ? 'border-[#1F5FBF] text-[#1F5FBF] font-semibold'
              : 'border-transparent text-[#5B6475] hover:text-[#1B2433]'
          }`}
        >
          Verified ({businesses.filter((b) => b.status === 'VERIFIED').length})
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#E2E6EE] text-[13px] font-medium text-[#5B6475]">
              <th className="py-3 px-3">Organization</th>
              <th className="py-3 px-3">Industry & Location</th>
              <th className="py-3 px-3">Contact</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E6EE]">
            {filtered.map((biz) => (
              <tr key={biz.id} className="text-[14px] hover:bg-[#F7F9FC]">
                <td className="py-4 px-3">
                  <h4 className="font-semibold text-[#1B2433]">{biz.name}</h4>
                  <span className="text-[12px] text-[#5B6475]">Submitted {biz.date}</span>
                </td>
                <td className="py-4 px-3 text-[#5B6475]">
                  {biz.category} · {biz.location}
                </td>
                <td className="py-4 px-3">
                  <p className="text-[13px] font-medium text-[#1B2433]">{biz.contactName}</p>
                  <p className="text-[12px] text-[#5B6475]">{biz.contactEmail}</p>
                </td>
                <td className="py-4 px-3">
                  <StatusBadge status={biz.status} />
                </td>
                <td className="py-4 px-3 text-right">
                  {biz.status === 'PENDING' ? (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="primary"
                        onClick={() => handleUpdateStatus(biz.id, 'VERIFIED')}
                        className="px-3 py-1 text-[12px] min-h-[36px] bg-[#1E8E5A] hover:bg-[#1E8E5A]/90"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleUpdateStatus(biz.id, 'REJECTED')}
                        className="px-3 py-1 text-[12px] min-h-[36px]"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Decline
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[12px] text-[#5B6475] italic">Processed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VerifyBusinesses;
