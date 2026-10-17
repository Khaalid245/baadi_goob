import React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      required,
      leftIcon,
      rightIcon,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[14px] font-medium text-[#1B2433]"
          >
            {label}
            {required && <span className="text-[#C0392B] ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#5B6475]">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            className={cn(
              'w-full h-[44px] px-3.5 text-[15px] text-[#1B2433] placeholder:text-[#A3ABBA] bg-white border rounded-[8px] transition-colors',
              'border-[#E2E6EE] hover:border-[#1F5FBF]/40',
              'focus:border-[#1F5FBF] focus:outline-2 focus:outline-offset-2 focus:outline-[#1F5FBF]',
              'disabled:bg-[#F7F9FC] disabled:text-[#A3ABBA] disabled:border-[#E2E6EE] disabled:cursor-not-allowed',
              error && 'border-[#C0392B] focus:border-[#C0392B] focus:outline-[#C0392B]',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />

          {rightIcon && !error && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-[#5B6475]">
              {rightIcon}
            </div>
          )}

          {error && (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-[#C0392B]">
              <AlertCircle className="h-4 w-4" />
            </div>
          )}
        </div>

        {error ? (
          <p className="text-[13px] text-[#C0392B] font-normal leading-tight">{error}</p>
        ) : helperText ? (
          <p className="text-[13px] text-[#5B6475] font-normal leading-tight">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
