import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import OpportunityDetails from './OpportunityDetails';
import { AuthProvider } from '../../context/AuthContext';
import { MOCK_STUDENT_USER, MOCK_OPPORTUNITIES } from '../../lib/mockData';

let activeUser: any = null;

vi.mock('../../lib/api', () => {
  return {
    default: {
      get: vi.fn((url: string) => {
        if (url === '/auth/me') {
          return Promise.resolve({ data: { user: activeUser } });
        }
        if (url.startsWith('/opportunities/')) {
          const id = url.replace('/opportunities/', '');
          const found = MOCK_OPPORTUNITIES.find((o) => o.id === id);
          if (found) {
            return Promise.resolve({ data: { opportunity: found } });
          }
          return Promise.reject(new Error('Not found'));
        }
        return Promise.resolve({ data: {} });
      }),
      post: vi.fn(() => Promise.resolve({ data: { success: true } })),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    },
  };
});

const renderWithRouter = (
  initialEntry: string,
  mockUser: any = null
) => {
  activeUser = mockUser;
  if (mockUser) {
    localStorage.setItem('furan_token', 'mock_jwt_token');
    localStorage.setItem('furan_user', JSON.stringify(mockUser));
  } else {
    localStorage.removeItem('furan_token');
    localStorage.removeItem('furan_user');
  }

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/opportunities/:id" element={<OpportunityDetails />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('OpportunityDetails Component', () => {
  beforeEach(() => {
    localStorage.clear();
    activeUser = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders opportunity details for a valid opportunity ID', async () => {
    renderWithRouter('/opportunities/opp-1');

    // Title & Organization
    expect(await screen.findByText('Software Development Intern')).toBeTruthy();
    expect(screen.getAllByText('Banadir Tech Hub').length).toBeGreaterThan(0);

    // Sections
    expect(screen.getByText('About this opportunity')).toBeTruthy();
    expect(screen.getByText('What you’ll work on')).toBeTruthy();
    expect(screen.getByText('Required skills')).toBeTruthy();
    expect(screen.getByText('Who can apply')).toBeTruthy();

    // Skills
    expect(screen.getByText('React')).toBeTruthy();
    expect(screen.getByText('Python')).toBeTruthy();
  });

  it('renders a designed not-found state for an unknown opportunity ID', async () => {
    renderWithRouter('/opportunities/unknown-9999');

    expect(await screen.findByText('Opportunity not found')).toBeTruthy();
    expect(
      screen.getByText(
        'The opportunity you are looking for does not exist, has been removed, or the link is invalid.'
      )
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Browse opportunities' })).toBeTruthy();
  });

  it('renders closed state with disabled Closed button for closed opportunity', async () => {
    renderWithRouter('/opportunities/opp-6');

    expect(await screen.findByText('Data Entry Intern')).toBeTruthy();
    expect(screen.getByText('Applications closed')).toBeTruthy();
    expect(
      screen.getByText(
        'The deadline has passed. This opportunity is no longer accepting applications.'
      )
    ).toBeTruthy();

    const closedBtn = screen.getByRole('button', { name: 'Closed' });
    expect(closedBtn).toBeTruthy();
    expect(closedBtn.hasAttribute('disabled')).toBe(true);
  });

  it('renders logged-out visitor state with Log in to apply CTA', async () => {
    renderWithRouter('/opportunities/opp-1', null);

    expect(await screen.findByText('Software Development Intern')).toBeTruthy();
    expect(
      screen.getByText('Log in with a student account to apply with your Furan profile.')
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log in to apply' })).toBeTruthy();
    expect(screen.getByText('New to Furan? Create an account')).toBeTruthy();
  });

  it('renders competition registration state for competitions', async () => {
    // opp-7 is an open competition not yet registered in mock applications
    renderWithRouter('/opportunities/opp-7', MOCK_STUDENT_USER);

    expect(await screen.findByText('Clean Energy Ideas Challenge')).toBeTruthy();
    expect(screen.getByText('About the competition')).toBeTruthy();
    expect(screen.getByText('What you’ll do')).toBeTruthy();
    expect(screen.getByText('Who can register')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Register' })).toBeTruthy();
  });

  it('renders incomplete profile state when student has no skills in profile', async () => {
    const studentNoSkills = {
      ...MOCK_STUDENT_USER,
      studentProfile: {
        ...MOCK_STUDENT_USER.studentProfile,
        skills: [],
      },
    };

    renderWithRouter('/opportunities/opp-4', studentNoSkills);

    expect(await screen.findByText('Solar Installation Trainee')).toBeTruthy();
    expect(screen.getByText('Complete your profile first')).toBeTruthy();
    expect(
      screen.getByText(
        'Add your education and skills before applying. This helps the organization understand your experience.'
      )
    ).toBeTruthy();

    const applyBtn = screen.getByRole('button', { name: 'Apply' });
    expect(applyBtn.hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Complete profile' })).toBeTruthy();
  });

  it('renders already-applied state when student has already applied', async () => {
    // opp-1 is already applied in MOCK_STUDENT_APPLICATIONS
    renderWithRouter('/opportunities/opp-1', MOCK_STUDENT_USER);

    expect(await screen.findByText('Software Development Intern')).toBeTruthy();
    expect(screen.getByText('Already applied')).toBeTruthy();
    expect(screen.getByText(/Follow updates in My applications/i)).toBeTruthy();
    expect(screen.getByText('Go to My applications →')).toBeTruthy();
  });

  it('opens application confirmation modal when Apply button is clicked', async () => {
    // opp-4 has not been applied to by MOCK_STUDENT_USER
    renderWithRouter('/opportunities/opp-4', MOCK_STUDENT_USER);

    const applyBtn = await screen.findByRole('button', { name: 'Apply' });
    fireEvent.click(applyBtn);

    expect(
      await screen.findByText('Apply for Solar Installation Trainee')
    ).toBeTruthy();
    expect(
      screen.getByText(/I confirm my student details are accurate and up to date./i)
    ).toBeTruthy();
  });

  it('submits application when modal confirmation is checked and submitted', async () => {
    renderWithRouter('/opportunities/opp-4', MOCK_STUDENT_USER);

    const applyBtn = await screen.findByRole('button', { name: 'Apply' });
    fireEvent.click(applyBtn);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const submitBtn = screen.getByRole('button', { name: 'Submit application' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Already applied')).toBeTruthy();
  });
});
