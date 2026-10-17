import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Logo } from '../common/Logo';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export default function PublicLayout() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    const role = user.role.toUpperCase();
    if (role === 'STUDENT') return '/student/dashboard';
    if (role === 'BUSINESS') return '/business/dashboard';
    if (role === 'ADMIN') return '/admin/dashboard';
    return '/';
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FC] text-[#1B2433] font-sans antialiased selection:bg-[#1F5FBF] selection:text-white">
      {/* Public Navigation Header */}
      <header className="sticky top-0 z-50 h-[72px] bg-white border-b border-[#E2E6EE]">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-16">
          {/* Brand Logo */}
          <Logo />

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[#1B2433]">
            <Link
              to="/opportunities"
              className={`transition-colors hover:text-[#1F5FBF] ${
                isActive('/opportunities') ? 'text-[#1F5FBF] font-semibold' : 'text-[#1B2433]'
              }`}
            >
              Find opportunities
            </Link>

            <Link
              to="/competitions"
              className={`transition-colors hover:text-[#1F5FBF] ${
                isActive('/competitions') ? 'text-[#1F5FBF] font-semibold' : 'text-[#1B2433]'
              }`}
            >
              Competitions
            </Link>

            <Link
              to="/register"
              className="text-[#1B2433] hover:text-[#1F5FBF] transition-colors"
            >
              For organizations
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <Link to={getDashboardPath()}>
                <Button variant="primary" size="md">
                  Dashboard
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-[15px] font-medium text-[#1B2433] hover:text-[#1F5FBF] px-3 py-2 transition-colors"
                >
                  Log in
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="md">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            {!isAuthenticated && (
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Get started
                </Button>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#1B2433] hover:text-[#1F5FBF] rounded-[8px]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#E2E6EE] px-4 py-6 space-y-4 shadow-md animate-in slide-in-from-top-2 duration-150">
            <Link
              to="/opportunities"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-[16px] font-medium text-[#1B2433] hover:text-[#1F5FBF] py-1"
            >
              Find opportunities
            </Link>
            <Link
              to="/competitions"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-[16px] font-medium text-[#1B2433] hover:text-[#1F5FBF] py-1"
            >
              Competitions
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-[16px] font-medium text-[#1B2433] hover:text-[#1F5FBF] py-1"
            >
              For organizations
            </Link>

            <div className="pt-4 border-t border-[#E2E6EE] flex flex-col gap-2.5">
              {isAuthenticated ? (
                <Link to={getDashboardPath()} onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="secondary" className="w-full">
                      Log in
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" className="w-full">
                      Get started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Page Content Body */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Verified Minimalist Figma Footer */}
      <footer className="mt-auto bg-white border-t border-[#E2E6EE] py-12">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 text-left">
            <Logo />
            <p className="text-[14px] text-[#5B6475] leading-normal">
              Your first opportunity starts here.
            </p>
            <p className="hidden md:block text-[13px] text-[#A3ABBA] pt-2">
              © 2026 Furan. Built for the next generation of Somali talent.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[14px] font-normal text-[#5B6475]">
            <a href="#about" className="hover:text-[#1F5FBF] transition-colors">
              About Furan
            </a>
            <a href="#help" className="hover:text-[#1F5FBF] transition-colors">
              Help center
            </a>
            <a href="#privacy" className="hover:text-[#1F5FBF] transition-colors">
              Privacy
            </a>
            <a href="#terms" className="hover:text-[#1F5FBF] transition-colors">
              Terms
            </a>
          </div>

          <p className="block md:hidden text-[13px] text-[#A3ABBA] pt-2 text-left">
            © 2026 Furan. Built for the next generation of Somali talent.
          </p>
        </div>
      </footer>
    </div>
  );
}
