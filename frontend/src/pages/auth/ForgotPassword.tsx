import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../lib/api';
import { toast } from 'sonner';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/password-reset', { email });
      setIsSubmitted(true);
    } catch {
      // In offline/mock mode:
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-[460px] bg-white border border-[#E2E6EE] rounded-[16px] p-8 sm:p-10 text-left shadow-xs">
        {!isSubmitted ? (
          <div>
            <div className="h-10 w-10 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center mb-6">
              <KeyRound className="h-5 w-5" />
            </div>

            <h1 className="text-[28px] font-bold text-[#1B2433]">Forgot password?</h1>
            <p className="mt-2 text-[14px] text-[#5B6475] leading-[22px]">
              Enter your email address and we’ll send you a password reset link.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input
                id="forgot-email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full mt-2"
              >
                Send reset link
              </Button>
            </form>

            <div className="mt-6">
              <Link
                to="/login"
                className="inline-flex items-center text-[13px] font-medium text-[#1F5FBF] hover:underline"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to log in
              </Link>
            </div>

            <p className="mt-8 text-[12px] text-[#5B6475] leading-[18px]">
              For your privacy, the next message will be the same whether or not an account uses this email address.
            </p>
          </div>
        ) : (
          /* Password reset confirmation frame */
          <div>
            <div className="h-10 w-10 rounded-[8px] bg-[#E3F6EC] text-[#1E8E5A] flex items-center justify-center mb-6">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <h1 className="text-[28px] font-bold text-[#1B2433]">Password reset</h1>
            <p className="mt-2 text-[14px] text-[#5B6475] leading-[22px]">
              Your password has been updated. You can now log in with your new password.
            </p>

            <div className="mt-6">
              <Link to="/login" className="block w-full">
                <Button variant="primary" className="w-full">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
