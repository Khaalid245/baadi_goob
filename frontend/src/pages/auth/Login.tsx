import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { MOCK_STUDENT_USER, MOCK_BUSINESS_USER, MOCK_ADMIN_USER } from '../../lib/mockData';
import api from '../../lib/api';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const stateOverride = searchParams.get('state');
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [errorType, setErrorType] = useState<'NONE' | 'INVALID_CREDENTIALS' | 'SUSPENDED'>('NONE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle URL state overrides for visual design states & testability
  useEffect(() => {
    if (stateOverride === 'invalid') {
      setErrorType('INVALID_CREDENTIALS');
      setValue('email', 'hodan@example.com');
      setValue('password', 'password123');
    } else if (stateOverride === 'suspended') {
      setErrorType('SUSPENDED');
      setValue('email', 'hodan@example.com');
      setValue('password', 'password123');
    }
  }, [stateOverride, setValue]);

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setErrorType('NONE');

    try {
      const res = await api.post('/auth/login', {
        email: data.email.trim(),
        password: data.password,
      });

      if (res.data?.token && res.data?.user) {
        if (res.data.user.status === 'SUSPENDED') {
          setErrorType('SUSPENDED');
          toast.error('This account is currently suspended.');
          return;
        }

        login(res.data.token, res.data.user);
        toast.success('Welcome back!');

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
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { error?: string; message?: string } };
      };
      const status = axiosError.response?.status;
      const errorMsg =
        axiosError.response?.data?.error || axiosError.response?.data?.message || '';

      if (status === 403 || errorMsg.toLowerCase().includes('suspend')) {
        setErrorType('SUSPENDED');
        return;
      }

      if (status === 400 || status === 401 || errorMsg.toLowerCase().includes('credential')) {
        setErrorType('INVALID_CREDENTIALS');
        return;
      }

      // Offline / local development fallback when backend service is unavailable
      const normalizedEmail = data.email.toLowerCase().trim();

      if (normalizedEmail.includes('suspended')) {
        setErrorType('SUSPENDED');
      } else if (normalizedEmail.includes('admin')) {
        login('mock-jwt-token-admin', MOCK_ADMIN_USER);
        toast.success('Logged in as Administrator (Demo)');
        navigate(redirectPath || '/admin/dashboard');
      } else if (normalizedEmail.includes('biz') || normalizedEmail.includes('business')) {
        login('mock-jwt-token-biz', MOCK_BUSINESS_USER);
        toast.success('Logged in as Business (Demo)');
        navigate(redirectPath || '/business/dashboard');
      } else if (data.password.length >= 6) {
        const studentUser = {
          ...MOCK_STUDENT_USER,
          email: normalizedEmail,
        };
        login('mock-jwt-token-student', studentUser);
        toast.success('Welcome back, Hodan! (Demo)');
        navigate(redirectPath || '/student/dashboard');
      } else {
        setErrorType('INVALID_CREDENTIALS');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSuspended = errorType === 'SUSPENDED';

  return (
    <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] flex items-center justify-center py-10 sm:py-16 px-4 sm:px-6 text-left">
      <div className="w-full max-w-[460px] bg-white border border-[#E2E6EE] rounded-[16px] p-6 sm:p-10 shadow-xs">
        <h1 className="text-[26px] sm:text-[28px] font-bold text-[#1B2433] tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-[14px] sm:text-[15px] text-[#5B6475] leading-[22px]">
          Log in to find opportunities and follow your next steps.
        </p>

        {/* Incorrect Credentials Banner Matching Figma */}
        {errorType === 'INVALID_CREDENTIALS' && (
          <div
            role="alert"
            className="mt-6 bg-[#FDE8E8] border border-[#F8B4B4] rounded-[10px] p-4 flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-[#C0392B] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-bold text-[#C0392B]">
                Email or password is incorrect
              </p>
              <p className="text-[13px] text-[#822019] mt-0.5">
                Check your details and try again.
              </p>
            </div>
          </div>
        )}

        {/* Suspended Account Banner Matching Figma */}
        {isSuspended && (
          <div
            role="alert"
            className="mt-6 bg-[#FDE8E8] border border-[#F8B4B4] rounded-[10px] p-4 flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-[#C0392B] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-bold text-[#C0392B]">
                Your account is suspended
              </p>
              <p className="text-[13px] text-[#822019] mt-0.5">
                You cannot access your account right now. Contact the Furan support team for help.
              </p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <Input
            id="login-email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div>
            <Input
              id="login-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              error={errors.password?.message}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="p-1 text-[#5B6475] hover:text-[#1B2433] transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
              {...register('password')}
            />
            <div className="mt-2 text-right">
              <Link
                to="/forgot-password"
                className="text-[13px] sm:text-[14px] font-medium text-[#1F5FBF] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSuspended}
            className="w-full h-[44px] text-[15px] font-semibold mt-2"
          >
            Log in
          </Button>

          {isSuspended ? (
            <div className="pt-4 text-left">
              <a
                href="mailto:support@furan.example"
                className="text-[14px] font-medium text-[#1F5FBF] hover:underline inline-flex items-center"
              >
                Contact support →
              </a>
            </div>
          ) : (
            <p className="pt-4 text-center text-[13px] sm:text-[14px] text-[#5B6475]">
              New to Furan?{' '}
              <Link
                to="/register"
                className="text-[#1F5FBF] font-medium hover:underline"
              >
                Create an account
              </Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
