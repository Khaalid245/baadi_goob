import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Building2, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { MOCK_STUDENT_USER, MOCK_BUSINESS_USER } from '../../lib/mockData';
import api from '../../lib/api';
import { toast } from 'sonner';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const { login } = useAuth();

  const [step, setStep] = useState<1 | 2>(roleParam ? 2 : 1);
  const [role, setRole] = useState<'STUDENT' | 'BUSINESS'>(
    roleParam?.toUpperCase() === 'BUSINESS' ? 'BUSINESS' : 'STUDENT'
  );

  // Form Fields
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (roleParam) {
      setRole(roleParam.toUpperCase() === 'BUSINESS' ? 'BUSINESS' : 'STUDENT');
      setStep(2);
    }
  }, [roleParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'BUSINESS' && !companyName) {
      toast.error('Please enter your company name.');
      return;
    }
    if (!name || !email || !password) {
      toast.error('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, string> = {
        name,
        email,
        password,
        role,
      };
      if (role === 'BUSINESS') {
        payload.company_name = companyName;
      }

      const res = await api.post('/auth/register', payload);
      if (res.data?.token && res.data?.user) {
        login(res.data.token, res.data.user);
        toast.success('Account created successfully!');
        if (role === 'BUSINESS') {
          navigate('/business/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }
    } catch {
      // In offline/mock fallback:
      if (role === 'BUSINESS') {
        const mockBiz = {
          ...MOCK_BUSINESS_USER,
          name,
          email,
          businessProfile: {
            ...MOCK_BUSINESS_USER.businessProfile!,
            company_name: companyName,
            verification_status: 'PENDING' as const,
          },
        };
        login('mock-token-biz-registered', mockBiz);
        toast.success('Business account created! Awaiting admin verification.');
        navigate('/business/dashboard');
      } else {
        const mockStd = {
          ...MOCK_STUDENT_USER,
          name,
          email,
        };
        login('mock-token-student-registered', mockStd);
        toast.success('Student account created! Welcome to Furan.');
        navigate('/student/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-[560px] bg-white border border-[#E2E6EE] rounded-[16px] p-8 sm:p-10 text-left shadow-xs">
        {/* Step 1: Choose Role */}
        {step === 1 && (
          <div>
            <span className="text-[12px] font-semibold tracking-wider text-[#1F5FBF] uppercase">
              Step 1 of 2 · Choose your path
            </span>
            <h1 className="mt-2 text-[28px] font-bold text-[#1B2433]">Join Furan</h1>
            <p className="mt-1 text-[14px] text-[#5B6475]">
              How would you like to use Furan? Choose the path that’s right for you.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Student Card */}
              <button
                type="button"
                onClick={() => setRole('STUDENT')}
                className={`p-6 rounded-[12px] text-left border-2 transition-all flex flex-col justify-between relative ${
                  role === 'STUDENT'
                    ? 'border-[#1F5FBF] bg-[#F7F9FC]'
                    : 'border-[#E2E6EE] hover:border-[#1F5FBF]/40 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-4">
                  <div className="h-9 w-9 rounded-full bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      role === 'STUDENT'
                        ? 'border-[#1F5FBF]'
                        : 'border-[#A3ABBA]'
                    }`}
                  >
                    {role === 'STUDENT' && (
                      <span className="h-2 w-2 rounded-full bg-[#1F5FBF]" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-[17px] font-bold text-[#1B2433]">Student</h3>
                  <p className="mt-2 text-[13px] text-[#5B6475] leading-[20px]">
                    Find internships, jobs and competitions. Build your profile and take your first step.
                  </p>
                </div>
              </button>

              {/* Business Card */}
              <button
                type="button"
                onClick={() => setRole('BUSINESS')}
                className={`p-6 rounded-[12px] text-left border-2 transition-all flex flex-col justify-between relative ${
                  role === 'BUSINESS'
                    ? 'border-[#1F5FBF] bg-[#F7F9FC]'
                    : 'border-[#E2E6EE] hover:border-[#1F5FBF]/40 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-4">
                  <div className="h-9 w-9 rounded-full bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      role === 'BUSINESS'
                        ? 'border-[#1F5FBF]'
                        : 'border-[#A3ABBA]'
                    }`}
                  >
                    {role === 'BUSINESS' && (
                      <span className="h-2 w-2 rounded-full bg-[#1F5FBF]" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-[17px] font-bold text-[#1B2433]">Business</h3>
                  <p className="mt-2 text-[13px] text-[#5B6475] leading-[20px]">
                    Post opportunities and connect with students ready to learn and contribute.
                  </p>
                </div>
              </button>
            </div>

            <Button
              variant="primary"
              onClick={() => setStep(2)}
              className="w-full mt-6"
            >
              Continue as {role === 'STUDENT' ? 'Student' : 'Business'}
            </Button>

            <p className="mt-6 text-center text-[13px] text-[#5B6475]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#1F5FBF] font-medium hover:underline">
                Log in
              </Link>
            </p>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 2 && (
          <div>
            <span className="text-[12px] font-semibold tracking-wider text-[#1F5FBF] uppercase">
              Step 2 of 2 · Your details
            </span>
            <h1 className="mt-2 text-[28px] font-bold text-[#1B2433]">
              {role === 'STUDENT' ? 'Create a student account' : 'Create a business account'}
            </h1>
            <p className="mt-1 text-[14px] text-[#5B6475]">
              {role === 'STUDENT'
                ? 'Start with the basics. Add your studies and skills after signing up.'
                : 'Connect your organization with young Somali talent.'}
            </p>

            {/* Role indicator pill */}
            <div className="mt-6 flex items-center justify-between bg-[#E8F0FC] rounded-[8px] px-4 py-2.5">
              <span className="text-[14px] font-medium text-[#0F3166]">
                {role === 'STUDENT' ? 'Student' : 'Business'}
              </span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
              >
                Change
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {role === 'BUSINESS' && (
                <Input
                  id="reg-company-name"
                  label="Company name"
                  placeholder="Your organization’s name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              )}

              <Input
                id="reg-name"
                label={role === 'BUSINESS' ? 'Contact name' : 'Name'}
                placeholder={role === 'BUSINESS' ? 'Full name of contact person' : 'Your full name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                id="reg-email"
                label="Email"
                type="email"
                placeholder={role === 'BUSINESS' ? 'you@company.com' : 'you@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                id="reg-password"
                label="Password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Use at least 8 characters."
                required
              />

              {role === 'BUSINESS' && (
                <div className="bg-[#FEF3D7] border border-[#F5A623]/20 rounded-[8px] p-4 flex items-start gap-3">
                  <Info className="h-5 w-5 text-[#8A5A00] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#8A5A00] leading-[18px]">
                    Your account will be reviewed by an administrator before you can post opportunities.
                  </p>
                </div>
              )}

              <p className="text-[12px] text-[#5B6475] leading-[18px] pt-1">
                By creating an account, you agree to Furan’s Terms and Privacy Policy.
              </p>

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full mt-2"
              >
                Create account
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] text-[#5B6475]">
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
