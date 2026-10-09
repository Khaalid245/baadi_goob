import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RouteGuard from './components/RouteGuard';

// Public Pages
const Landing = () => <div>Landing Page</div>;
const OpportunitiesList = () => <div>Opportunities List</div>;
const OpportunityDetails = () => <div>Opportunity Details</div>;
const CompetitionsList = () => <div>Competitions List</div>;
const Login = () => <div>Login</div>;
const Register = () => <div>Register</div>;

// Student Pages
const StudentDashboard = () => <div>Student Dashboard</div>;
const StudentProfile = () => <div>Student Profile</div>;
const MyApplications = () => <div>My Applications</div>;

// Business Pages
const BusinessDashboard = () => <div>Business Dashboard</div>;
const CompanyProfile = () => <div>Company Profile</div>;
const PostOpportunity = () => <div>Post/Edit Opportunity</div>;
const ApplicantsList = () => <div>Applicants List</div>;

// Admin Pages
const AdminDashboard = () => <div>Admin Dashboard</div>;
const VerifyBusinesses = () => <div>Verify Businesses</div>;
const ManageListingsUsers = () => <div>Manage Listings and Users</div>;

// 404
const NotFound = () => <div>404 Not Found - <a href="/">Go Home</a></div>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public Routes */}
          <Route index element={<Landing />} />
          <Route path="opportunities" element={<OpportunitiesList />} />
          <Route path="opportunities/:id" element={<OpportunityDetails />} />
          <Route path="competitions" element={<CompetitionsList />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          {/* Student Routes */}
          <Route element={<RouteGuard allowedRoles={['student']} />}>
            <Route path="student/dashboard" element={<StudentDashboard />} />
            <Route path="student/profile" element={<StudentProfile />} />
            <Route path="student/applications" element={<MyApplications />} />
          </Route>

          {/* Business Routes */}
          <Route element={<RouteGuard allowedRoles={['business']} />}>
            <Route path="business/dashboard" element={<BusinessDashboard />} />
            <Route path="business/profile" element={<CompanyProfile />} />
            <Route path="business/opportunities/new" element={<PostOpportunity />} />
            <Route path="business/opportunities/:id/edit" element={<PostOpportunity />} />
            <Route path="business/opportunities/:id/applicants" element={<ApplicantsList />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<RouteGuard allowedRoles={['admin']} />}>
            <Route path="admin/dashboard" element={<AdminDashboard />} />
            <Route path="admin/businesses" element={<VerifyBusinesses />} />
            <Route path="admin/manage" element={<ManageListingsUsers />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
