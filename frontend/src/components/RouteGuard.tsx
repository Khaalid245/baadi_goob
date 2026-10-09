import { Navigate, Outlet } from 'react-router-dom';

export default function RouteGuard({ allowedRoles }: { allowedRoles: string[] }) {
  // Fake user for now
  const user = { role: 'student' }; // Change to test

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <div>Access denied</div>;
  }

  return <Outlet />;
}
