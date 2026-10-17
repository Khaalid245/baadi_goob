import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, helperText, error, required, id, children, disabled, options, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="block text-[14px] font-medium text-[#1B2433]">
            {label}
            {required && <span className="text-[#C0392B] ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-[44px] px-3.5 pr-10 text-[15px] text-[#1B2433] bg-white border rounded-[8px] transition-colors appearance-none cursor-pointer',
              'border-[#E2E6EE] hover:border-[#1F5FBF]/40',
              'focus:border-[#1F5FBF] focus:outline-2 focus:outline-offset-2 focus:outline-[#1F5FBF]',
              'disabled:bg-[#F7F9FC] disabled:text-[#A3ABBA] disabled:border-[#E2E6EE] disabled:cursor-not-allowed',
              error && 'border-[#C0392B] focus:border-[#C0392B] focus:outline-[#C0392B]',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3.5 flex items-center pointer-events-none text-[#5B6475]">
            <ChevronDown className="h-4 w-4" />
          </div>
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

Select.displayName = 'Select';
