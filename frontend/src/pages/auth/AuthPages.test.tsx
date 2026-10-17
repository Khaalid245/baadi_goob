import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import PasswordResetConfirmation from './PasswordResetConfirmation';
import { AuthProvider } from '../../context/AuthContext';

let mockLoginResponse: any = null;
let mockRegisterResponse: any = null;
let mockResetResponse: any = null;

vi.mock('../../lib/api', () => {
  return {
    default: {
      get: vi.fn(() => Promise.resolve({ data: {} })),
      post: vi.fn((url: string, data: any) => {
        if (url === '/auth/login') {
          if (mockLoginResponse?.error) {
            return Promise.reject(mockLoginResponse.error);
          }
          return Promise.resolve({
            data: mockLoginResponse || {
              token: 'mock-jwt-token',
              user: {
                id: 'std-1',
                email: data.email,
                name: 'Test Student',
                role: 'STUDENT',
                status: 'ACTIVE',
              },
            },
          });
        }
        if (url === '/auth/register') {
          if (mockRegisterResponse?.error) {
            return Promise.reject(mockRegisterResponse.error);
          }
          return Promise.resolve({
            data: mockRegisterResponse || {
              token: 'mock-reg-token',
              user: {
                id: 'new-user-1',
                email: data.email,
                name: data.name,
                role: data.role || 'STUDENT',
                status: 'ACTIVE',
              },
            },
          });
        }
        if (url === '/auth/password-reset') {
          if (mockResetResponse?.error) {
            return Promise.reject(mockResetResponse.error);
          }
          return Promise.resolve({ data: { success: true } });
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

describe('Authentication Screens Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLoginResponse = null;
    mockRegisterResponse = null;
    mockResetResponse = null;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Login Page', () => {
    it('renders the default login form with required fields and links', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<Login />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
      expect(
        screen.getByText('Log in to find opportunities and follow your next steps.')
      ).toBeTruthy();
      expect(screen.getByLabelText(/^Email/i)).toBeTruthy();
      expect(screen.getByLabelText(/^Password/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Log in' })).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Create an account' })).toBeTruthy();
    });

    it('toggles password visibility when the eye button is clicked', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<Login />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      const passwordInput = screen.getByLabelText(/^Password/i);
      expect(passwordInput.getAttribute('type')).toBe('password');

      const toggleBtn = screen.getByRole('button', { name: 'Show password' });
      fireEvent.click(toggleBtn);

      expect(passwordInput.getAttribute('type')).toBe('text');
      expect(screen.getByRole('button', { name: 'Hide password' })).toBeTruthy();
    });

    it('displays validation errors on empty submission', async () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<Login />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      const submitBtn = screen.getByRole('button', { name: 'Log in' });
      fireEvent.click(submitBtn);

      expect(await screen.findByText('Email is required')).toBeTruthy();
      expect(await screen.findByText('Password is required')).toBeTruthy();
    });

    it('displays the incorrect credentials banner when state=invalid', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login?state=invalid']}>
            <Routes>
              <Route path="/login" element={<Login />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.getByText('Email or password is incorrect')).toBeTruthy();
      expect(screen.getByText('Check your details and try again.')).toBeTruthy();
    });

    it('displays suspended banner and disables submit button when state=suspended', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login?state=suspended']}>
            <Routes>
              <Route path="/login" element={<Login />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.getByText('Your account is suspended')).toBeTruthy();
      expect(
        screen.getByText(
          'You cannot access your account right now. Contact the Furan support team for help.'
        )
      ).toBeTruthy();

      const submitBtn = screen.getByRole('button', { name: 'Log in' });
      expect(submitBtn.hasAttribute('disabled')).toBe(true);
      expect(screen.getByRole('link', { name: 'Contact support →' })).toBeTruthy();
      expect(screen.queryByRole('link', { name: 'Create an account' })).toBeNull();
    });

    it('submits credentials successfully and logs user in', async () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/student/dashboard" element={<div>Student Workspace Dashboard</div>} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/^Email/i), {
        target: { value: 'hodan@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

      await waitFor(() => {
        expect(screen.getByText('Student Workspace Dashboard')).toBeTruthy();
      });
    });
  });

  describe('Register Page', () => {
    it('renders Step 1 with Student and Business role options', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/register']}>
            <Routes>
              <Route path="/register" element={<Register />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      expect(screen.getByText('STEP 1 OF 2 · CHOOSE YOUR PATH')).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Join Furan' })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Student Find internships/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Business Post opportunities/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Continue as Student' })).toBeTruthy();
    });

    it('allows toggling between Student and Business in Step 1', () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/register']}>
            <Routes>
              <Route path="/register" element={<Register />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      const bizOption = screen.getByRole('button', { name: /Business Post opportunities/i });
      fireEvent.click(bizOption);

      expect(screen.getByRole('button', { name: 'Continue as Business' })).toBeTruthy();
    });

    it('navigates from Step 1 to Step 2 Student form', async () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/register']}>
            <Routes>
              <Route path="/register" element={<Register />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Continue as Student' }));

      expect(await screen.findByText('STEP 2 OF 2 · YOUR DETAILS')).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Create a student account' })).toBeTruthy();
      expect(screen.getByLabelText(/^Name/i)).toBeTruthy();
      expect(screen.getByLabelText(/^Email/i)).toBeTruthy();
      expect(screen.getByLabelText(/^Password/i)).toBeTruthy();
      expect(screen.getByText('Use at least 8 characters.')).toBeTruthy();
    });

    it('allows changing role from Step 2 back to Step 1', async () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/register?role=student']}>
            <Routes>
              <Route path="/register" element={<Register />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      expect(await screen.findByRole('heading', { name: 'Create a student account' })).toBeTruthy();

      const changeBtn = screen.getByRole('button', { name: 'Change' });
      fireEvent.click(changeBtn);

      expect(await screen.findByText('STEP 1 OF 2 · CHOOSE YOUR PATH')).toBeTruthy();
    });

    it('renders Step 2 Business form with Company name and administrator review info', async () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/register?role=business']}>
            <Routes>
              <Route path="/register" element={<Register />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      expect(await screen.findByRole('heading', { name: 'Create a business account' })).toBeTruthy();
      expect(screen.getByLabelText(/^Company name/i)).toBeTruthy();
      expect(screen.getByLabelText(/^Contact name/i)).toBeTruthy();
      expect(screen.getByLabelText(/^Email/i)).toBeTruthy();
      expect(screen.getByLabelText(/^Password/i)).toBeTruthy();
      expect(
        screen.getByText(
          'Your account will be reviewed by an administrator before you can post opportunities.'
        )
      ).toBeTruthy();
    });

    it('validates password minimum length of 8 characters in student registration', async () => {
      render(
        <AuthProvider>
          <MemoryRouter initialEntries={['/register?role=student']}>
            <Routes>
              <Route path="/register" element={<Register />} />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/^Name/i), {
        target: { value: 'Hodan Ali' },
      });
      fireEvent.change(screen.getByLabelText(/^Email/i), {
        target: { value: 'hodan@example.com' },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: '123' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

      expect(await screen.findByText('Password must be at least 8 characters')).toBeTruthy();
    });
  });

  describe('Forgot Password Page', () => {
    it('renders the forgot password form and privacy notice outside the card', () => {
      render(
        <MemoryRouter initialEntries={['/forgot-password']}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: 'Forgot password?' })).toBeTruthy();
      expect(
        screen.getByText('Enter your email address and we’ll send you a password reset link.')
      ).toBeTruthy();
      expect(screen.getByLabelText(/^Email/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Send reset link' })).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Back to log in' })).toBeTruthy();
      expect(
        screen.getByText(
          'For your privacy, the next message will be the same whether or not an account uses this email address.'
        )
      ).toBeTruthy();
    });

    it('submits email and displays confirmation state when request succeeds', async () => {
      render(
        <MemoryRouter initialEntries={['/forgot-password']}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/^Email/i), {
        target: { value: 'hodan@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

      expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeTruthy();
      expect(
        screen.getByText(/we’ve sent instructions to reset your password/i)
      ).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Return to log in' })).toBeTruthy();
    });

    it('does not display success confirmation when the server request fails', async () => {
      mockResetResponse = {
        error: { response: { status: 500, data: { error: 'Internal server error' } } },
      };

      render(
        <MemoryRouter initialEntries={['/forgot-password']}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/^Email/i), {
        target: { value: 'hodan@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

      // Form remains visible and does NOT show false confirmation
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Check your email' })).toBeNull();
      });
      expect(screen.getByRole('heading', { name: 'Forgot password?' })).toBeTruthy();
    });
  });

  describe('Password Reset Confirmation Page', () => {
    it('renders the confirmation screen matching Figma specifications', () => {
      render(
        <MemoryRouter initialEntries={['/password-reset-confirmation']}>
          <Routes>
            <Route
              path="/password-reset-confirmation"
              element={<PasswordResetConfirmation />}
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: 'Password reset' })).toBeTruthy();
      expect(
        screen.getByText(
          'Your password has been updated. You can now log in with your new password.'
        )
      ).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Log in' })).toBeTruthy();
    });
  });
});
