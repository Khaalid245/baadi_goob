import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../lib/api';
import { toast } from 'sonner';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    const emailVal = data.email.toLowerCase().trim();

    try {
      const res = await api.post('/auth/password-reset', { email: emailVal });
      setSubmittedEmail(emailVal);
      setIsSubmitted(true);
      toast.success(
        res.data?.message || 'If an account with this email exists, a reset link has been sent.'
      );
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { status?: number; data?: { error?: string; message?: string } };
      };

      // If backend responded with privacy-preserving message:
      if (axiosError.response?.data?.message) {
        setSubmittedEmail(emailVal);
        setIsSubmitted(true);
        toast.success(axiosError.response.data.message);
        return;
      }

      // If server error or client error:
      if (axiosError.response?.status) {
        toast.error(
          axiosError.response?.data?.error ||
          'Unable to process password reset. Please try again later.'
        );
        return;
      }

      // Offline demo fallback only when backend is unreachable:
      setSubmittedEmail(emailVal);
      setIsSubmitted(true);
      toast.info('Reset link simulated (Demo mode - server unreachable).');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] flex items-center justify-center py-10 sm:py-16 px-4 sm:px-6 text-left">
      <div className="w-full max-w-[460px]">
        {/* White Card Matching Figma */}
        <div className="w-full bg-white border border-[#E2E6EE] rounded-[16px] p-6 sm:p-10 shadow-xs">
          {!isSubmitted ? (
            <>
              <div className="h-10 w-10 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center mb-6">
                <KeyRound className="h-5 w-5" />
              </div>

              <h1 className="text-[26px] sm:text-[28px] font-bold text-[#1B2433] tracking-tight">
                Forgot password?
              </h1>
              <p className="mt-2 text-[14px] sm:text-[15px] text-[#5B6475] leading-[22px]">
                Enter your email address and we’ll send you a password reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
                <Input
                  id="forgot-email"
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  className="w-full h-[44px] text-[15px] font-semibold mt-2"
                >
                  Send reset link
                </Button>

                <div className="pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center text-[14px] font-medium text-[#1F5FBF] hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    Back to log in
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-[8px] bg-[#E3F6EC] text-[#1E8E5A] flex items-center justify-center mb-6">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <h1 className="text-[26px] sm:text-[28px] font-bold text-[#1B2433] tracking-tight">
                Check your email
              </h1>
              <p className="mt-2 text-[14px] sm:text-[15px] text-[#5B6475] leading-[22px]">
                If an account exists for <strong className="text-[#1B2433]">{submittedEmail}</strong>,
                we’ve sent instructions to reset your password.
              </p>

              <div className="mt-6 space-y-3">
                <Link to="/login" className="block w-full">
                  <Button variant="primary" className="w-full h-[44px] text-[15px] font-semibold">
                    Return to log in
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="w-full text-center text-[13px] font-medium text-[#1F5FBF] hover:underline"
                >
                  Try another email
                </button>
              </div>
            </>
          )}
        </div>

        {/* Privacy Note Outside Card Centered Matching Figma */}
        <p className="mt-6 text-center text-[12px] sm:text-[13px] text-[#5B6475] leading-[20px] px-2">
          For your privacy, the next message will be the same whether or not an account uses this email address.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
