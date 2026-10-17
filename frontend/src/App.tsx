import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PublicLayout from './components/layout/PublicLayout';
import WorkspaceLayout from './components/layout/WorkspaceLayout';
import RouteGuard from './components/RouteGuard';
import { Button } from './components/ui/Button';

// Sprint 1 Pages
import Landing from './pages/public/Landing';
import OpportunitiesExplorer from './pages/public/OpportunitiesExplorer';
import OpportunityDetails from './pages/public/OpportunityDetails';
import CompetitionsExplorer from './pages/public/CompetitionsExplorer';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import PasswordResetConfirmation from './pages/auth/PasswordResetConfirmation';

// Sprint 2 Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfileWizard from './pages/student/StudentProfileWizard';
import MyApplications from './pages/student/MyApplications';

// Sprint 3 Pages
import BusinessDashboard from './pages/business/BusinessDashboard';
import CompanyProfile from './pages/business/CompanyProfile';
import PostOpportunity from './pages/business/PostOpportunity';
import ApplicantsReview from './pages/business/ApplicantsReview';

// Sprint 4 Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import VerifyBusinesses from './pages/admin/VerifyBusinesses';
import ManageListingsUsers from './pages/admin/ManageListingsUsers';

// 404 Not Found Page
const NotFound = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
    <h1 className="text-[72px] leading-none font-bold text-[#1F5FBF]">404</h1>
    <h2 className="mt-4 text-[24px] font-semibold text-[#1B2433]">Page not found</h2>
    <p className="mt-2 text-[15px] text-[#5B6475] max-w-sm">
      The page you are looking for doesn't exist or has been moved.
    </p>
    <div className="mt-6">
      <Link to="/">
        <Button variant="primary">Return home</Button>
      </Link>
    </div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Layout Routes */}
          <Route element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="opportunities" element={<OpportunitiesExplorer />} />
            <Route path="opportunities/:id" element={<OpportunityDetails />} />
            <Route path="competitions" element={<CompetitionsExplorer />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="password-reset-confirmation" element={<PasswordResetConfirmation />} />
            <Route path="reset-password-confirmation" element={<PasswordResetConfirmation />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Authenticated Student Routes with Workspace Layout */}
          <Route element={<RouteGuard allowedRoles={['student', 'STUDENT']} />}>
            <Route element={<WorkspaceLayout />}>
              <Route path="student/dashboard" element={<StudentDashboard />} />
              <Route path="student/profile" element={<StudentProfileWizard />} />
              <Route path="student/applications" element={<MyApplications />} />
            </Route>
          </Route>

          {/* Authenticated Business Routes with Workspace Layout */}
          <Route element={<RouteGuard allowedRoles={['business', 'BUSINESS']} />}>
            <Route element={<WorkspaceLayout />}>
              <Route path="business/dashboard" element={<BusinessDashboard />} />
              <Route path="business/profile" element={<CompanyProfile />} />
              <Route path="business/opportunities/new" element={<PostOpportunity />} />
              <Route path="business/opportunities/:id/edit" element={<PostOpportunity />} />
              <Route path="business/opportunities/:id/applicants" element={<ApplicantsReview />} />
            </Route>
          </Route>

          {/* Authenticated Admin Routes with Workspace Layout */}
          <Route element={<RouteGuard allowedRoles={['admin', 'ADMIN']} />}>
            <Route element={<WorkspaceLayout />}>
              <Route path="admin/dashboard" element={<AdminDashboard />} />
              <Route path="admin/businesses" element={<VerifyBusinesses />} />
              <Route path="admin/manage" element={<ManageListingsUsers />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
