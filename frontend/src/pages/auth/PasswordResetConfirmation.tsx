import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const PasswordResetConfirmation: React.FC = () => {
  return (
    <div className="w-full bg-[#F7F9FC] min-h-[calc(100vh-72px)] flex items-center justify-center py-10 sm:py-16 px-4 sm:px-6 text-left">
      <div className="w-full max-w-[460px] bg-white border border-[#E2E6EE] rounded-[16px] p-6 sm:p-10 shadow-xs">
        {/* Mint Rounded Icon Matching Figma */}
        <div className="h-10 w-10 rounded-[8px] bg-[#E3F6EC] text-[#1E8E5A] flex items-center justify-center mb-6">
          <Check className="h-5 w-5 stroke-[2.5]" />
        </div>

        <h1 className="text-[26px] sm:text-[28px] font-bold text-[#1B2433] tracking-tight">
          Password reset
        </h1>
        <p className="mt-2 text-[14px] sm:text-[15px] text-[#5B6475] leading-[22px]">
          Your password has been updated. You can now log in with your new password.
        </p>

        <div className="mt-6">
          <Link to="/login" className="block w-full">
            <Button variant="primary" className="w-full h-[44px] text-[15px] font-semibold">
              Log in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetConfirmation;
