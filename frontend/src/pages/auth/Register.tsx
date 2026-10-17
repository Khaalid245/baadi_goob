import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Building2, Info, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { MOCK_STUDENT_USER, MOCK_BUSINESS_USER } from '../../lib/mockData';
import api from '../../lib/api';
import { toast } from 'sonner';

const registerStudentSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const registerBusinessSchema = z.object({
  companyName: z.string().trim().min(2, 'Company name is required'),
  name: z.string().trim().min(2, 'Contact name is required'),
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterStudentFormData = z.infer<typeof registerStudentSchema>;
type RegisterBusinessFormData = z.infer<typeof registerBusinessSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const stepParam = searchParams.get('step');
  const { login } = useAuth();

  const [step, setStep] = useState<1 | 2>(() => {
    if (stepParam === '1') return 1;
    if (roleParam) return 2;
    return 1;
  });

  const [role, setRole] = useState<'STUDENT' | 'BUSINESS'>(() => {
    return roleParam?.toUpperCase() === 'BUSINESS' ? 'BUSINESS' : 'STUDENT';
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (roleParam) {
      setRole(roleParam.toUpperCase() === 'BUSINESS' ? 'BUSINESS' : 'STUDENT');
      if (stepParam !== '1') {
        setStep(2);
      }
    }
  }, [roleParam, stepParam]);

  // Student Form
  const studentForm = useForm<RegisterStudentFormData>({
    resolver: zodResolver(registerStudentSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  // Business Form
  const businessForm = useForm<RegisterBusinessFormData>({
    resolver: zodResolver(registerBusinessSchema),
    defaultValues: {
      companyName: '',
      name: '',
      email: '',
      password: '',
    },
  });

  const handleStudentSubmit = async (data: RegisterStudentFormData) => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/register', {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: data.password,
        role: 'STUDENT',
      });

      if (res.data?.token && res.data?.user) {
        login(res.data.token, res.data.user);
        toast.success('Account created successfully! Welcome to Furan.');
        navigate('/student/dashboard');
        return;
      }
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { error?: string; message?: string } };
      };
      const errorMessage =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        '';

      if (errorMessage.toLowerCase().includes('already') || axiosError.response?.status === 400) {
        studentForm.setError('email', {
          type: 'manual',
          message: errorMessage || 'An account with this email already exists.',
        });
        toast.error(errorMessage || 'An account with this email already exists.');
        setIsSubmitting(false);
        return;
      }

      // Offline / demo fallback mode
      const mockStudent = {
        ...MOCK_STUDENT_USER,
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
      };
      login('mock-token-student-registered', mockStudent);
      toast.success('Student account created (Demo mode). Welcome to Furan!');
      navigate('/student/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBusinessSubmit = async (data: RegisterBusinessFormData) => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/register', {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: data.password,
        role: 'BUSINESS',
        company_name: data.companyName.trim(),
      });

      if (res.data?.token && res.data?.user) {
        login(res.data.token, res.data.user);
        toast.success('Business account created! Awaiting admin review.');
        navigate('/business/dashboard');
        return;
      }
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { error?: string; message?: string } };
      };
      const errorMessage =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.message ||
        '';

      if (errorMessage.toLowerCase().includes('already') || axiosError.response?.status === 400) {
        businessForm.setError('email', {
          type: 'manual',
          message: errorMessage || 'An account with this email already exists.',
        });
        toast.error(errorMessage || 'An account with this email already exists.');
        setIsSubmitting(false);
        return;
      }

      // Offline / demo fallback mode
      const mockBiz = {
        ...MOCK_BUSINESS_USER,
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        businessProfile: {
          ...MOCK_BUSINESS_USER.businessProfile!,
          company_name: data.companyName.trim(),
          verification_status: 'PENDING' as const,
        },
      };
      login('mock-token-biz-registered', mockBiz);
      toast.success('Business account created (Demo mode). Awaiting admin review.');
      navigate('/business/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] flex items-center justify-center py-10 sm:py-16 px-4 sm:px-6 text-left">
      <div className="w-full max-w-[560px] bg-white border border-[#E2E6EE] rounded-[16px] p-6 sm:p-10 shadow-xs">
        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div>
            <span className="text-[12px] font-semibold tracking-wider text-[#1F5FBF] uppercase">
              STEP 1 OF 2 · CHOOSE YOUR PATH
            </span>
            <h1 className="mt-2 text-[26px] sm:text-[28px] font-bold text-[#1B2433] tracking-tight">
              Join Furan
            </h1>
            <p className="mt-1 text-[14px] sm:text-[15px] text-[#5B6475] leading-[22px]">
              How would you like to use Furan? Choose the path that’s right for you.
            </p>

            {/* Role Options */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Student Role Card */}
              <button
                type="button"
                onClick={() => setRole('STUDENT')}
                className={`p-5 sm:p-6 rounded-[12px] text-left border-2 transition-all flex flex-col justify-between cursor-pointer ${
                  role === 'STUDENT'
                    ? 'border-[#1F5FBF] bg-[#F7F9FC]'
                    : 'border-[#E2E6EE] hover:border-[#1F5FBF]/40 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="h-9 w-9 rounded-full bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      role === 'STUDENT' ? 'border-[#1F5FBF]' : 'border-[#A3ABBA]'
                    }`}
                  >
                    {role === 'STUDENT' && (
                      <span className="h-2 w-2 rounded-full bg-[#1F5FBF]" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-[17px] font-bold text-[#1B2433]">Student</h3>
                  <p className="mt-1.5 text-[13px] text-[#5B6475] leading-[20px]">
                    Find internships, jobs and competitions. Build your profile and take your first step.
                  </p>
                </div>
              </button>

              {/* Business Role Card */}
              <button
                type="button"
                onClick={() => setRole('BUSINESS')}
                className={`p-5 sm:p-6 rounded-[12px] text-left border-2 transition-all flex flex-col justify-between cursor-pointer ${
                  role === 'BUSINESS'
                    ? 'border-[#1F5FBF] bg-[#F7F9FC]'
                    : 'border-[#E2E6EE] hover:border-[#1F5FBF]/40 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="h-9 w-9 rounded-full bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      role === 'BUSINESS' ? 'border-[#1F5FBF]' : 'border-[#A3ABBA]'
                    }`}
                  >
                    {role === 'BUSINESS' && (
                      <span className="h-2 w-2 rounded-full bg-[#1F5FBF]" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-[17px] font-bold text-[#1B2433]">Business</h3>
                  <p className="mt-1.5 text-[13px] text-[#5B6475] leading-[20px]">
                    Post opportunities and connect with students ready to learn and contribute.
                  </p>
                </div>
              </button>
            </div>

            <Button
              variant="primary"
              onClick={() => setStep(2)}
              className="w-full h-[44px] text-[15px] font-semibold mt-6"
            >
              Continue as {role === 'STUDENT' ? 'Student' : 'Business'}
            </Button>

            <p className="mt-6 text-center text-[13px] sm:text-[14px] text-[#5B6475]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#1F5FBF] font-medium hover:underline">
                Log in
              </Link>
            </p>
          </div>
        )}

        {/* Step 2: Student Details Form */}
        {step === 2 && role === 'STUDENT' && (
          <div>
            <span className="text-[12px] font-semibold tracking-wider text-[#1F5FBF] uppercase">
              STEP 2 OF 2 · YOUR DETAILS
            </span>
            <h1 className="mt-2 text-[26px] sm:text-[28px] font-bold text-[#1B2433] tracking-tight">
              Create a student account
            </h1>
            <p className="mt-1 text-[14px] sm:text-[15px] text-[#5B6475] leading-[22px]">
              Start with the basics. Add your studies and skills after signing up.
            </p>

            {/* Selected Role Banner */}
            <div className="mt-6 flex items-center justify-between bg-[#E8F0FC] rounded-[8px] px-4 py-2.5">
              <span className="text-[14px] font-medium text-[#0F3166]">Student</span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[13px] font-medium text-[#1F5FBF] hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>

            <form
              onSubmit={studentForm.handleSubmit(handleStudentSubmit)}
              className="mt-6 space-y-4"
              noValidate
            >
              <Input
                id="reg-student-name"
                label="Name"
                placeholder="Your full name"
                error={studentForm.formState.errors.name?.message}
                {...studentForm.register('name')}
              />

              <Input
                id="reg-student-email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={studentForm.formState.errors.email?.message}
                {...studentForm.register('email')}
              />

              <Input
                id="reg-student-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                helperText="Use at least 8 characters."
                error={studentForm.formState.errors.password?.message}
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
                {...studentForm.register('password')}
              />

              <p className="text-[12px] text-[#5B6475] leading-[18px] pt-1">
                By creating an account, you agree to Furan’s Terms and Privacy Policy.
              </p>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="w-full h-[44px] text-[15px] font-semibold mt-2"
              >
                Create account
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] sm:text-[14px] text-[#5B6475]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#1F5FBF] font-medium hover:underline">
                Log in
              </Link>
            </p>
          </div>
        )}

        {/* Step 2: Business Details Form */}
        {step === 2 && role === 'BUSINESS' && (
          <div>
            <span className="text-[12px] font-semibold tracking-wider text-[#1F5FBF] uppercase">
              STEP 2 OF 2 · YOUR DETAILS
            </span>
            <h1 className="mt-2 text-[26px] sm:text-[28px] font-bold text-[#1B2433] tracking-tight">
              Create a business account
            </h1>
            <p className="mt-1 text-[14px] sm:text-[15px] text-[#5B6475] leading-[22px]">
              Connect your organization with young Somali talent.
            </p>

            {/* Selected Role Banner */}
            <div className="mt-6 flex items-center justify-between bg-[#E8F0FC] rounded-[8px] px-4 py-2.5">
              <span className="text-[14px] font-medium text-[#0F3166]">Business</span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[13px] font-medium text-[#1F5FBF] hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>

            <form
              onSubmit={businessForm.handleSubmit(handleBusinessSubmit)}
              className="mt-6 space-y-4"
              noValidate
            >
              <Input
                id="reg-business-company"
                label="Company name"
                placeholder="Your organization’s name"
                error={businessForm.formState.errors.companyName?.message}
                {...businessForm.register('companyName')}
              />

              <Input
                id="reg-business-contact"
                label="Contact name"
                placeholder="Full name of contact person"
                error={businessForm.formState.errors.name?.message}
                {...businessForm.register('name')}
              />

              <Input
                id="reg-business-email"
                label="Email"
                type="email"
                placeholder="you@company.com"
                error={businessForm.formState.errors.email?.message}
                {...businessForm.register('email')}
              />

              <Input
                id="reg-business-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                helperText="Use at least 8 characters."
                error={businessForm.formState.errors.password?.message}
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
                {...businessForm.register('password')}
              />

              {/* Administrator Review Info Callout Matching Figma */}
              <div className="bg-[#FEF3D7] border border-[#FCE3AA] rounded-[8px] p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-[#8A5A00] shrink-0 mt-0.5" />
                <p className="text-[13px] text-[#8A5A00] leading-[20px]">
                  Your account will be reviewed by an administrator before you can post opportunities.
                </p>
              </div>

              <p className="text-[12px] text-[#5B6475] leading-[18px] pt-1">
                By creating an account, you agree to Furan’s Terms and Privacy Policy.
              </p>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="w-full h-[44px] text-[15px] font-semibold mt-2"
              >
                Create account
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] sm:text-[14px] text-[#5B6475]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#1F5FBF] font-medium hover:underline">
                Log in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
