import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SkillChipInputProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  value?: string[];
  skills?: string[];
  disabled?: boolean;
  onChange: (skills: string[]) => void;
  suggestions?: string[];
  maxSkills?: number;
  className?: string;
}

const DEFAULT_SUGGESTIONS = [
  'React',
  'Python',
  'Excel',
  'Accounting',
  'Public Speaking',
  'Graphic Design',
  'Data Entry',
  'Communication',
  'JavaScript',
];

export const SkillChipInput: React.FC<SkillChipInputProps> = ({
  label = 'Your skills',
  helperText,
  error,
  required,
  value,
  skills,
  disabled = false,
  onChange,
  suggestions = DEFAULT_SUGGESTIONS,
  maxSkills = 7,
  className,
}) => {
  const currentSkills = skills ?? value ?? [];
  const [inputValue, setInputValue] = useState('');

  const addSkill = (skill: string) => {
    if (disabled) return;
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (currentSkills.includes(trimmed)) return;
    if (currentSkills.length >= maxSkills) return;
    onChange([...currentSkills, trimmed]);
    setInputValue('');
  };

  const removeSkill = (skillToRemove: string) => {
    if (disabled) return;
    onChange(currentSkills.filter((s) => s !== skillToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeSkill(value[value.length - 1]);
    }
  };

  const availableSuggestions = suggestions.filter((s) => !currentSkills.includes(s));

  return (
    <div className={cn('w-full space-y-2 text-left', className)}>
      {label && (
        <label className="block text-[14px] font-medium text-[#1B2433]">
          {label}
          {required && <span className="text-[#C0392B] ml-1">*</span>}
        </label>
      )}

      {/* Pill Container & Input */}
      <div
        className={cn(
          'min-h-[44px] p-2 bg-white border border-[#E2E6EE] rounded-[8px] flex flex-wrap items-center gap-1.5 focus-within:border-[#1F5FBF] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1F5FBF] transition-colors',
          disabled && 'bg-[#F7F9FC] text-[#A3ABBA] border-[#E2E6EE] cursor-not-allowed',
          error && 'border-[#C0392B]'
        )}
      >
        {currentSkills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 bg-[#E8F0FC] text-[#1F5FBF] px-2.5 py-1 rounded-[6px] text-[13px] font-medium"
          >
            <span>{skill}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                aria-label={`Remove skill ${skill}`}
                className="hover:text-[#164A99] p-0.5 rounded cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}

        {!disabled && currentSkills.length < maxSkills && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentSkills.length === 0 ? 'Type a skill and press Enter' : 'Add more...'}
            className="flex-1 min-w-[120px] h-[30px] px-2 text-[14px] text-[#1B2433] placeholder:text-[#A3ABBA] outline-none bg-transparent"
          />
        )}
      </div>

      <div className="flex items-center justify-between text-[13px] text-[#5B6475]">
        <span>
          {helperText || `Choose up to ${maxSkills} skills. ${currentSkills.length} selected.`}
        </span>
        {error && <span className="text-[#C0392B]">{error}</span>}
      </div>

      {/* Suggestion Chips */}
      {!disabled && availableSuggestions.length > 0 && currentSkills.length < maxSkills && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {availableSuggestions.slice(0, 6).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addSkill(suggestion)}
              className="inline-flex items-center gap-1 bg-[#F7F9FC] text-[#5B6475] border border-[#E2E6EE] hover:border-[#1F5FBF]/40 hover:text-[#1F5FBF] px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
