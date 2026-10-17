import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserX, UserCheck, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { MOCK_OPPORTUNITIES } from '../../lib/mockData';
import api from '../../lib/api';
import type { UserStatus, Role } from '../../types';
import { toast } from 'sonner';

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  joined: string;
}

export const ManageListingsUsers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'listings'>('users');

  const [users, setUsers] = useState<PlatformUser[]>([
    {
      id: 'usr-1',
      name: 'Hodan Abdirahman',
      email: 'hodan@example.com',
      role: 'STUDENT',
      status: 'ACTIVE',
      joined: '10 Oct 2026',
    },
    {
      id: 'usr-2',
      name: 'Ahmed Hassan (Banadir Tech Hub)',
      email: 'hello@banadirtech.example',
      role: 'BUSINESS',
      status: 'ACTIVE',
      joined: '08 Oct 2026',
    },
    {
      id: 'usr-3',
      name: 'Spam Account 42',
      email: 'suspicious@unknown.example',
      role: 'STUDENT',
      status: 'SUSPENDED',
      joined: '15 Oct 2026',
    },
    {
      id: 'usr-4',
      name: 'Jazeera Logistics Admin',
      email: 'admin@jazeera.example',
      role: 'BUSINESS',
      status: 'ACTIVE',
      joined: '05 Oct 2026',
    },
  ]);

  const [listings, setListings] = useState(MOCK_OPPORTUNITIES);

  const handleToggleUserStatus = async (userId: string, currentStatus: UserStatus) => {
    const newStatus: UserStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
    } catch {
      // offline fallback
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );
    toast.success(
      `User account ${newStatus === 'ACTIVE' ? 'reactivated' : 'suspended'} successfully.`
    );
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      await api.delete(`/opportunities/${listingId}`);
    } catch {
      // offline fallback
    }
    setListings((prev) => prev.filter((l) => l.id !== listingId));
    toast.success('Listing removed from platform.');
  };

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
          Administration / Moderation
        </p>
        <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1">
          Platform moderation
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1">
          Manage member accounts, review reported items and preserve a trustworthy community.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[#E2E6EE] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`text-[14px] pb-2 font-medium transition-colors border-b-2 -mb-2.5 ${
            activeTab === 'users'
              ? 'border-[#1F5FBF] text-[#1F5FBF] font-semibold'
              : 'border-transparent text-[#5B6475] hover:text-[#1B2433]'
          }`}
        >
          User accounts ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('listings')}
          className={`text-[14px] pb-2 font-medium transition-colors border-b-2 -mb-2.5 ${
            activeTab === 'listings'
              ? 'border-[#1F5FBF] text-[#1F5FBF] font-semibold'
              : 'border-transparent text-[#5B6475] hover:text-[#1B2433]'
          }`}
        >
          Active listings ({listings.length})
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' ? (
        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E2E6EE] text-[13px] font-medium text-[#5B6475]">
                <th className="py-3 px-3">User</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Joined</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6EE]">
              {users.map((u) => (
                <tr key={u.id} className="text-[14px] hover:bg-[#F7F9FC]">
                  <td className="py-4 px-3">
                    <h4 className="font-semibold text-[#1B2433]">{u.name}</h4>
                    <span className="text-[12px] text-[#5B6475]">{u.email}</span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="text-[13px] font-medium text-[#1B2433]">
                      {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-[13px] text-[#5B6475]">{u.joined}</td>
                  <td className="py-4 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        u.status === 'ACTIVE'
                          ? 'bg-[#E3F6EC] text-[#1E8E5A]'
                          : 'bg-[#FDECEA] text-[#C0392B]'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right">
                    <Button
                      variant={u.status === 'ACTIVE' ? 'danger' : 'secondary'}
                      onClick={() => handleToggleUserStatus(u.id, u.status)}
                      className="px-3 py-1 text-[12px] min-h-[36px]"
                    >
                      {u.status === 'ACTIVE' ? (
                        <>
                          <UserX className="h-3.5 w-3.5 mr-1" />
                          Suspend
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          Reactivate
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Listings Tab */
        <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E2E6EE] text-[13px] font-medium text-[#5B6475]">
                <th className="py-3 px-3">Listing Title</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Organization</th>
                <th className="py-3 px-3">Deadline</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E6EE]">
              {listings.map((l) => (
                <tr key={l.id} className="text-[14px] hover:bg-[#F7F9FC]">
                  <td className="py-4 px-3 font-semibold text-[#1B2433]">{l.title}</td>
                  <td className="py-4 px-3">
                    <StatusBadge status={l.type} />
                  </td>
                  <td className="py-4 px-3 text-[13px] text-[#5B6475]">
                    {l.organization_name || l.user?.businessProfile?.company_name}
                  </td>
                  <td className="py-4 px-3 text-[13px] text-[#5B6475]">{l.deadline}</td>
                  <td className="py-4 px-3 text-right">
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteListing(l.id)}
                      className="px-3 py-1 text-[12px] min-h-[36px]"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageListingsUsers;
