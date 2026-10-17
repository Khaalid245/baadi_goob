import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { MOCK_STUDENT_USER, MOCK_BUSINESS_USER, MOCK_ADMIN_USER } from '../../lib/mockData';
import api from '../../lib/api';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorType, setErrorType] = useState<'NONE' | 'INVALID_CREDENTIALS' | 'SUSPENDED'>('NONE');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorType('NONE');

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.token && res.data?.user) {
        if (res.data.user.status === 'SUSPENDED') {
          setErrorType('SUSPENDED');
          setIsLoading(false);
          return;
        }

        login(res.data.token, res.data.user);
        toast.success('Welcome back!');

        // Redirect based on role or query param
        if (redirectPath) {
          navigate(redirectPath);
        } else if (res.data.user.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (res.data.user.role === 'BUSINESS') {
          navigate('/business/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch {
      // In offline/mock mode or fallback testing:
      const normalizedEmail = email.toLowerCase().trim();

      if (normalizedEmail.includes('suspended')) {
        setErrorType('SUSPENDED');
      } else if (normalizedEmail.includes('admin')) {
        login('mock-jwt-token-admin', MOCK_ADMIN_USER);
        toast.success('Logged in as Administrator');
        navigate(redirectPath || '/admin/dashboard');
      } else if (normalizedEmail.includes('biz') || normalizedEmail.includes('business')) {
        login('mock-jwt-token-biz', MOCK_BUSINESS_USER);
        toast.success('Logged in as Business');
        navigate(redirectPath || '/business/dashboard');
      } else if (password.length >= 6) {
        // Default student login
        const loggedStudent = {
          ...MOCK_STUDENT_USER,
          email: normalizedEmail,
        };
        login('mock-jwt-token-student', loggedStudent);
        toast.success('Welcome back, Hodan!');
        navigate(redirectPath || '/student/dashboard');
      } else {
        setErrorType('INVALID_CREDENTIALS');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-[460px] bg-white border border-[#E2E6EE] rounded-[16px] p-8 text-left shadow-xs">
        <h1 className="text-[28px] font-bold text-[#1B2433]">Welcome back</h1>
        <p className="mt-2 text-[14px] text-[#5B6475]">
          Log in to find opportunities and follow your next steps.
        </p>

        {/* Incorrect Credentials Banner */}
        {errorType === 'INVALID_CREDENTIALS' && (
          <div className="mt-6 bg-[#FDECEA] border border-[#C0392B]/20 rounded-[8px] p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#C0392B] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-[#C0392B]">
                Email or password is incorrect
              </p>
              <p className="text-[12px] text-[#C0392B]/90 mt-0.5">
                Check your details and try again.
              </p>
            </div>
          </div>
        )}

        {/* Suspended Account Banner */}
        {errorType === 'SUSPENDED' && (
          <div className="mt-6 bg-[#FDECEA] border border-[#C0392B]/20 rounded-[8px] p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#C0392B] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-[#C0392B]">Your account is suspended</p>
              <p className="text-[12px] text-[#C0392B]/90 mt-0.5">
                You cannot access your account right now. Contact the Furan support team for help.
              </p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            id="login-email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div>
            <Input
              id="login-password"
              label="Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="mt-2 text-right">
              <Link
                to="/forgot-password"
                className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={errorType === 'SUSPENDED'}
            className="w-full mt-2"
          >
            Log in
          </Button>

          {errorType === 'SUSPENDED' && (
            <div className="text-center pt-2">
              <a
                href="mailto:support@furan.example"
                className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
              >
                Contact support →
              </a>
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-[13px] text-[#5B6475]">
          New to Furan?{' '}
          <Link to="/register" className="text-[#1F5FBF] font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
