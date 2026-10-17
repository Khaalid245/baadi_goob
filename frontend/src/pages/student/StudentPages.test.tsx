import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import StudentDashboard from './StudentDashboard';
import StudentProfileWizard from './StudentProfileWizard';
import { AuthProvider } from '../../context/AuthContext';

let mockSummaryData: any = null;
let mockApplicationsData: any = null;
let mockProfileData: any = null;

vi.mock('../../lib/api', () => {
  return {
    default: {
      get: vi.fn((url: string) => {
        if (url === '/dashboard/summary') {
          return Promise.resolve({
            data: mockSummaryData || {
              role: 'STUDENT',
              applications: {
                NEW: 2,
                SHORTLISTED: 1,
                REJECTED: 1,
                HIRED: 1,
                total: 5,
              },
              total_applications: 5,
              competition_registrations: 1,
              is_profile_complete: true,
            },
          });
        }
        if (url === '/students/me/applications') {
          return Promise.resolve({
            data: mockApplicationsData || {
              applications: [
                {
                  id: 'app-1',
                  status: 'SHORTLISTED',
                  submitted_at: '15 Oct 2026',
                  opportunity: {
                    id: 'opp-1',
                    title: 'Software Development Intern',
                    organization_name: 'Banadir Tech Hub',
                  },
                },
                {
                  id: 'app-2',
                  status: 'NEW',
                  submitted_at: '13 Oct 2026',
                  opportunity: {
                    id: 'opp-2',
                    title: 'Data Entry Assistant',
                    organization_name: 'Hiiraan Health Clinic',
                  },
                },
                {
                  id: 'app-3',
                  status: 'HIRED',
                  submitted_at: '10 Oct 2026',
                  opportunity: {
                    id: 'opp-3',
                    title: 'Community Outreach Intern',
                    organization_name: 'Ministry of Youth and Sports',
                  },
                },
              ],
            },
          });
        }
        if (url === '/students/me/profile') {
          return Promise.resolve({
            data: mockProfileData || {
              profile: {
                id: 'prof-1',
                education: 'Computer Science · SIMAD University',
                skills: ['React', 'Python', 'Excel'],
                project_links: ['https://github.com/hodan-a/furan'],
              },
            },
          });
        }
        return Promise.resolve({ data: {} });
      }),
      put: vi.fn((url: string, data: any) => {
        if (url === '/students/me/profile') {
          return Promise.resolve({
            data: {
              message: 'Profile updated successfully',
              profile: {
                id: 'prof-1',
                ...data,
              },
            },
          });
        }
        return Promise.resolve({ data: {} });
      }),
      delete: vi.fn((url: string) => {
        if (url === '/users/me') {
          return Promise.resolve({ data: { message: 'Account deleted' } });
        }
        return Promise.resolve({ data: {} });
      }),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
  };
});

describe('Student Workspace — Phase 7 Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    mockSummaryData = null;
    mockApplicationsData = null;
    mockProfileData = null;
  });

  describe('Student Dashboard', () => {
    it('renders welcome header, action buttons, and metric cards', async () => {
      render(
        <AuthProvider>
          <MemoryRouter>
            <StudentDashboard />
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Welcome back/i)).toBeTruthy();
      });

      expect(screen.getByText(/Browse opportunities/i)).toBeTruthy();
      expect(screen.getAllByText(/Complete profile/i).length).toBeGreaterThanOrEqual(1);

      // Check metric cards
      expect(screen.getByText('02')).toBeTruthy();
      expect(screen.getAllByText(/Awaiting review/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Interview next/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Keep exploring/i)).toBeTruthy();
      expect(screen.getByText(/A new beginning/i)).toBeTruthy();

      // Check application updates
      expect(screen.getByText('Software Development Intern')).toBeTruthy();
      expect(screen.getByText('Data Entry Assistant')).toBeTruthy();
      expect(screen.getByText('Community Outreach Intern')).toBeTruthy();

      // Check competitions card
      expect(screen.getByText(/Competitions registered/i)).toBeTruthy();
      expect(screen.getByText('National Youth Hackathon 2026')).toBeTruthy();

      // Check profile count card
      expect(screen.getByText(/Make your profile count/i)).toBeTruthy();
    });

    it('handles empty applications gracefully', async () => {
      mockApplicationsData = { applications: [] };
      mockSummaryData = {
        role: 'STUDENT',
        applications: { NEW: 0, SHORTLISTED: 0, REJECTED: 0, HIRED: 0, total: 0 },
        total_applications: 0,
      };

      render(
        <AuthProvider>
          <MemoryRouter>
            <StudentDashboard />
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/No applications submitted yet/i)).toBeTruthy();
      });
    });
  });

  describe('Student Profile', () => {
    it('renders Profile Complete view by default with sections and badges', async () => {
      render(
        <AuthProvider>
          <MemoryRouter>
            <StudentProfileWizard />
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Your student profile')).toBeTruthy();
      });

      expect(screen.getByText('Profile complete')).toBeTruthy();
      expect(screen.getByText(/All five sections saved · 100%/i)).toBeTruthy();

      // Check sections
      expect(screen.getByText('Basic info')).toBeTruthy();
      expect(screen.getByText('Education')).toBeTruthy();
      expect(screen.getByText('Skills')).toBeTruthy();
      expect(screen.getByText('Project links')).toBeTruthy();

      // Check sidebar cards
      expect(screen.getByText(/You're ready to apply/i)).toBeTruthy();
      expect(screen.getByText(/What happens next\?/i)).toBeTruthy();
      expect(screen.getByText('Delete my account')).toBeTruthy();
    });

    it('switches to Edit mode when clicking Edit and allows cancelling', async () => {
      render(
        <AuthProvider>
          <MemoryRouter>
            <StudentProfileWizard />
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Your student profile')).toBeTruthy();
      });

      // Click Edit profile button
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editButtons[0]);

      // Should now be in Edit your profile mode
      expect(screen.getByText('Edit your profile')).toBeTruthy();
      expect(screen.getByText('Save changes')).toBeTruthy();

      // Click Cancel
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      // Should return to View Complete mode
      expect(screen.getByText('Your student profile')).toBeTruthy();
    });

    it('displays validation error banner when invalid in Edit mode', async () => {
      render(
        <AuthProvider>
          <MemoryRouter>
            <StudentProfileWizard />
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Your student profile')).toBeTruthy();
      });

      // Switch to Edit mode
      const editButton = screen.getByRole('button', { name: 'Edit profile' });
      fireEvent.click(editButton);

      expect(screen.getByText('Edit your profile')).toBeTruthy();

      // Clear full name
      const nameInput = screen.getByLabelText(/Full name/i);
      fireEvent.change(nameInput, { target: { value: '' } });

      // Clear email
      const emailInput = screen.getByLabelText(/Email address/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      // Click Save changes
      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

      // Expect validation banner to appear
      await waitFor(() => {
        expect(screen.getByText(/Check \d+ fields to continue/i)).toBeTruthy();
      });
      expect(screen.getByText(/Enter a complete email, such as hodan@example.com/i)).toBeTruthy();
    });

    it('saves changes successfully in Edit mode and updates profile', async () => {
      render(
        <AuthProvider>
          <MemoryRouter>
            <StudentProfileWizard />
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Your student profile')).toBeTruthy();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));

      const nameInput = screen.getByLabelText(/Full name/i);
      fireEvent.change(nameInput, { target: { value: 'Hodan Abdirahman Updated' } });

      fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

      await waitFor(() => {
        expect(screen.getByText('Your student profile')).toBeTruthy();
      });
      expect(screen.getAllByText('Hodan Abdirahman Updated').length).toBeGreaterThanOrEqual(1);
    });

    it('opens delete account confirmation modal', async () => {
      render(
        <AuthProvider>
          <MemoryRouter>
            <StudentProfileWizard />
          </MemoryRouter>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Delete my account')).toBeTruthy();
      });

      fireEvent.click(screen.getByText('Delete my account'));

      expect(screen.getByText('Delete student account?')).toBeTruthy();
      expect(screen.getByText('Yes, delete account')).toBeTruthy();

      // Click Cancel on modal
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Delete student account?')).toBeNull();

      // Click Delete my account again and confirm
      fireEvent.click(screen.getByText('Delete my account'));
      expect(screen.getByText('Yes, delete account')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: /Yes, delete account/i }));

      await waitFor(() => {
        expect(screen.queryByText('Delete student account?')).toBeNull();
      });
    });
  });
});
