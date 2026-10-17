import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { AlertCircle } from 'lucide-react';

export default function RouteGuard({ allowedRoles }: { allowedRoles: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#1F5FBF] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());
  const userRole = user.role.toUpperCase();

  if (!normalizedAllowed.includes(userRole)) {
    return (
      <div className="mx-auto my-16 max-w-md bg-white border border-[#E2E6EE] rounded-[12px] p-8 text-center shadow-xs">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#FDECEA] text-[#C0392B]">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-[20px] font-semibold text-[#1B2433]">Access denied</h2>
        <p className="mt-2 text-[14px] text-[#5B6475]">
          Your account role (<span className="font-semibold text-[#1B2433]">{user.role}</span>) does not have permission to view this section.
        </p>
        <div className="mt-6">
          <a href="/">
            <Button variant="primary">
              Return to home
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
