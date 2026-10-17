import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-[8px] transition-all duration-150 cursor-pointer select-none disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F5FBF] active:scale-[0.99]';

    const sizeStyles = {
      sm: 'min-h-[36px] h-[36px] px-3.5 text-[13px] gap-1.5',
      md: 'min-h-[44px] h-[44px] px-5 text-[15px] gap-2',
      lg: 'min-h-[48px] h-[48px] px-6 text-[16px] gap-2.5',
    };

    const variantStyles = {
      primary:
        'bg-[#1F5FBF] text-white hover:bg-[#164A99] active:bg-[#0F3166] disabled:bg-[#E2E6EE] disabled:text-[#A3ABBA] shadow-xs',
      secondary:
        'bg-white text-[#1F5FBF] border border-[#E2E6EE] hover:bg-[#E8F0FC] hover:border-[#1F5FBF]/30 active:bg-[#E8F0FC] disabled:border-[#E2E6EE] disabled:text-[#A3ABBA]',
      ghost:
        'bg-transparent text-[#1F5FBF] hover:bg-[#E8F0FC] active:bg-[#E8F0FC] disabled:text-[#A3ABBA]',
      danger:
        'bg-[#C0392B] text-white hover:bg-[#A93226] active:bg-[#922B21] disabled:bg-[#E2E6EE] disabled:text-[#A3ABBA]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-current" />
            <span>Please wait</span>
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
