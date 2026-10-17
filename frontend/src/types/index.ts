export type Role = 'STUDENT' | 'BUSINESS' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type OpportunityType = 'INTERNSHIP' | 'JOB' | 'COMPETITION';

export type OpportunityStatus = 'OPEN' | 'CLOSED';

export type ApplicationStatus = 'NEW' | 'SHORTLISTED' | 'REJECTED' | 'HIRED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  created_at?: string;
  studentProfile?: StudentProfile;
  businessProfile?: BusinessProfile;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  institution?: string;
  field_of_study?: string;
  qualification?: string;
  start_year?: string;
  graduation_year?: string;
  is_studying?: boolean;
  education?: string | null;
  skills?: string[] | null;
  project_links?: Array<{ title?: string; url: string; contribution?: string }> | string[] | null;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_description?: string;
  location?: string;
  website?: string;
  contact_name?: string;
  contact_email?: string;
  phone?: string;
  verification_status: VerificationStatus;
}

export interface Opportunity {
  id: string;
  posted_by: string;
  type: OpportunityType;
  title: string;
  description: string;
  skills_required?: string[] | null;
  deadline: string;
  status: OpportunityStatus;
  location?: string;
  workplace_type?: string;
  responsibilities?: string[];
  who_can_apply?: string;
  organization_name?: string;
  organization_type?: string;
  organization_description?: string;
  user?: {
    name: string;
    email: string;
    businessProfile?: BusinessProfile;
  };
  _count?: {
    applications?: number;
    registrations?: number;
  };
}

export interface Application {
  id: string;
  student_id: string;
  opportunity_id: string;
  status: ApplicationStatus;
  submitted_at: string;
  opportunity?: Opportunity;
  user?: User;
}

export interface CompetitionRegistration {
  id: string;
  student_id: string;
  opportunity_id: string;
  registered_at: string;
  opportunity?: Opportunity;
  user?: User;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface DashboardSummary {
  student?: {
    totalApplications: number;
    shortlisted: number;
    hired: number;
    registrations: number;
  };
  business?: {
    totalListings: number;
    openOpportunities: number;
    totalApplicants: number;
    isVerified: boolean;
  };
  admin?: {
    totalUsers: number;
    totalStudents: number;
    totalBusinesses: number;
    pendingVerifications: number;
    totalOpportunities: number;
  };
}
