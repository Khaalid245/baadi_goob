import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Trophy,
  FileText,
  User,
  Building2,
  Plus,
  Lock,
  GraduationCap,
  Flag,
  HelpCircle,
  Bell,
  ChevronDown,
  LogOut,
  Home,
  Compass,
  FileCheck,
  Building,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export default function WorkspaceLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const role = user?.role?.toUpperCase() || 'STUDENT';
  const isBusiness = role === 'BUSINESS';
  const isAdmin = role === 'ADMIN';
  const isStudent = role === 'STUDENT';

  // Check if business is verified
  const isVerifiedBusiness =
    user?.businessProfile?.verification_status === 'VERIFIED';

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Header Title
  const getHeaderContextTitle = () => {
    if (isAdmin) return 'Platform administration';
    if (isBusiness) return 'Organization workspace';
    return 'Student workspace';
  };

  // Sidebar section title
  const getSidebarHeader = () => {
    if (isAdmin) return 'ADMINISTRATOR WORKSPACE';
    if (isBusiness) return 'BUSINESS WORKSPACE';
    return 'STUDENT WORKSPACE';
  };

  // Role-specific navigation items
  const getNavItems = () => {
    if (isAdmin) {
      return [
        { label: 'Overview', path: '/admin/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
        { label: 'Organizations', path: '/admin/businesses', icon: <Building2 className="h-4 w-4" /> },
        { label: 'Opportunities', path: '/admin/manage', icon: <Briefcase className="h-4 w-4" /> },
        { label: 'Students', path: '/admin/manage', icon: <GraduationCap className="h-4 w-4" /> },
        { label: 'Reports & moderation', path: '/admin/manage', icon: <Flag className="h-4 w-4" /> },
      ];
    }
    if (isBusiness) {
      return [
        { label: 'Dashboard', path: '/business/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
        { label: 'Company profile', path: '/business/profile', icon: <Building2 className="h-4 w-4" /> },
        { label: 'My opportunities', path: '/business/dashboard', icon: <Briefcase className="h-4 w-4" /> },
        {
          label: 'Post opportunity',
          path: '/business/opportunities/new',
          icon: <Plus className="h-4 w-4" />,
          isLocked: !isVerifiedBusiness,
        },
      ];
    }
    // Default Student
    return [
      { label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Opportunities', path: '/opportunities', icon: <Briefcase className="h-4 w-4" /> },
      { label: 'Competitions', path: '/competitions', icon: <Trophy className="h-4 w-4" /> },
      { label: 'My applications', path: '/student/applications', icon: <FileText className="h-4 w-4" /> },
      { label: 'Profile', path: '/student/profile', icon: <User className="h-4 w-4" /> },
    ];
  };

  // Mobile Bottom Navigation 4 Items (matching Figma Mobile exports)
  const getMobileBottomNav = () => {
    if (isAdmin) {
      return [
        { label: 'Home', path: '/admin/dashboard', icon: <Home className="h-5 w-5" /> },
        { label: 'Review', path: '/admin/businesses', icon: <Building className="h-5 w-5" /> },
        { label: 'Reports', path: '/admin/manage', icon: <FileCheck className="h-5 w-5" /> },
        { label: 'Settings', path: '/admin/dashboard', icon: <User className="h-5 w-5" /> },
      ];
    }
    if (isBusiness) {
      return [
        { label: 'Home', path: '/business/dashboard', icon: <Home className="h-5 w-5" /> },
        { label: 'Listings', path: '/business/dashboard', icon: <Briefcase className="h-5 w-5" /> },
        { label: 'Applicants', path: '/business/dashboard', icon: <FileText className="h-5 w-5" /> },
        { label: 'Profile', path: '/business/profile', icon: <Building2 className="h-5 w-5" /> },
      ];
    }
    // Student
    return [
      { label: 'Home', path: '/student/dashboard', icon: <Home className="h-5 w-5" /> },
      { label: 'Explore', path: '/opportunities', icon: <Compass className="h-5 w-5" /> },
      { label: 'Applications', path: '/student/applications', icon: <FileText className="h-5 w-5" /> },
      { label: 'Profile', path: '/student/profile', icon: <User className="h-5 w-5" /> },
    ];
  };

  const navItems = getNavItems();
  const mobileNav = getMobileBottomNav();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] text-[#1B2433] font-sans antialiased">
      {/* Top Workspace Header */}
      <header className="sticky top-0 z-40 h-[72px] bg-white border-b border-[#E2E6EE] px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo />
          <div className="hidden sm:block h-5 w-[1px] bg-[#E2E6EE]" />
          <span className="hidden sm:block text-[14px] font-medium text-[#5B6475]">
            {getHeaderContextTitle()}
          </span>
        </div>

        {/* Right header tools */}
        <div className="flex items-center gap-5">
          <a
            href="#help"
            className="hidden md:inline-block text-[14px] font-medium text-[#5B6475] hover:text-[#1F5FBF] transition-colors"
          >
            Help center
          </a>

          <button
            type="button"
            title="Notifications"
            className="p-2 text-[#5B6475] hover:text-[#1B2433] rounded-[8px] hover:bg-[#F7F9FC] transition-colors"
          >
            <Bell className="h-5 w-5" />
          </button>

          {/* User profile dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-[8px] hover:bg-[#F7F9FC] transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center text-[13px] font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline-block text-[14px] font-medium text-[#1B2433]">
                {user?.name || 'User'}
              </span>
              <ChevronDown className="h-4 w-4 text-[#5B6475]" />
            </button>

            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white border border-[#E2E6EE] rounded-[8px] shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setUserDropdownOpen(false)}
              >
                <div className="px-4 py-2 border-b border-[#E2E6EE] text-left">
                  <p className="text-[14px] font-medium text-[#1B2433] truncate">{user?.name}</p>
                  <p className="text-[12px] text-[#5B6475] truncate">{user?.email}</p>
                </div>

                <Link
                  to={isStudent ? '/student/profile' : isBusiness ? '/business/profile' : '/admin/dashboard'}
                  className="block px-4 py-2 text-[14px] text-[#1B2433] hover:bg-[#F7F9FC] text-left"
                >
                  Account Profile
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-[14px] text-[#C0392B] hover:bg-[#FDECEA] text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout Body: 232px Sidebar + Main Content */}
      <div className="flex-grow flex max-w-[1440px] w-full mx-auto">
        {/* Fixed Desktop Sidebar (232px) */}
        <aside className="hidden md:flex w-[232px] shrink-0 border-r border-[#E2E6EE] bg-white flex-col justify-between p-4 sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto">
          <div className="space-y-6 text-left">
            {/* Workspace Heading */}
            <p className="text-[11px] font-semibold tracking-wider text-[#A3ABBA] px-3 pt-2">
              {getSidebarHeader()}
            </p>

            {/* Nav Links */}
            <nav className="space-y-1">
              {navItems.map((item, index) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={index}
                    to={item.path}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-[8px] text-[14px] font-medium transition-colors',
                      active
                        ? 'bg-[#E8F0FC] text-[#1F5FBF] font-semibold'
                        : 'text-[#5B6475] hover:bg-[#F7F9FC] hover:text-[#1B2433]'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={active ? 'text-[#1F5FBF]' : 'text-[#5B6475]'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {'isLocked' in item && item.isLocked && (
                      <Lock className="h-3.5 w-3.5 text-[#A3ABBA]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Persistent Help & Guidance Card */}
          <div className="pt-6 space-y-3 text-left">
            <div className="bg-[#F7F9FC] border border-[#E2E6EE] rounded-[10px] p-3.5 space-y-2">
              <div className="h-6 w-6 rounded-full bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center">
                <HelpCircle className="h-3.5 w-3.5" />
              </div>
              <p className="text-[13px] font-semibold text-[#1B2433]">A little help goes far.</p>
              <p className="text-[12px] text-[#5B6475] leading-snug">
                {isBusiness
                  ? 'Make your next entry-level hire with confidence.'
                  : 'Get help with your profile or first application.'}
              </p>
              <a
                href="#help"
                className="inline-block text-[12px] font-semibold text-[#1F5FBF] hover:text-[#164A99] pt-1"
              >
                Visit help center →
              </a>
            </div>

            <p className="text-[11px] text-[#A3ABBA] px-2 text-left">
              Furan · Web workspace
            </p>
          </div>
        </aside>

        {/* Workspace Main Content Area (40px desktop inset, 24px panel gaps) */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-10 pb-24 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile Fixed 4-Item Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white border-t border-[#E2E6EE] flex items-center justify-around px-2 shadow-sm"
        aria-label="Mobile workspace navigation"
      >
        {mobileNav.map((item, idx) => {
          const active = isActive(item.path);
          return (
            <Link
              key={idx}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors',
                active ? 'text-[#1F5FBF] font-semibold' : 'text-[#5B6475] hover:text-[#1B2433]'
              )}
            >
              <div className={cn('mb-0.5', active ? 'text-[#1F5FBF]' : 'text-[#5B6475]')}>
                {item.icon}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
