import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth,
  size,
  className,
}) => {
  const activeSize = size || maxWidth || 'md';
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] transition-opacity"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full bg-white border border-[#E2E6EE] rounded-[12px] p-6 text-left shadow-lg relative animate-in fade-in zoom-in-95 duration-150',
          maxWidthStyles[activeSize],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 text-[#5B6475] hover:text-[#1B2433] p-1 rounded transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {title && (
          <h2 className="text-[20px] leading-[28px] font-semibold text-[#1B2433] pr-8 mb-2">
            {title}
          </h2>
        )}

        {description && (
          <p className="text-[14px] leading-[20px] text-[#5B6475] mb-5">
            {description}
          </p>
        )}

        {children && <div className="mb-6">{children}</div>}

        {footer && <div className="flex items-center justify-end gap-3 pt-2">{footer}</div>}
      </div>
    </div>
  );
};
