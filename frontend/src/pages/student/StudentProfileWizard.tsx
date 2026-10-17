import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, ShieldCheck, User as UserIcon, AlertTriangle } from 'lucide-react';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SkillChipInput } from '../../components/ui/SkillChipInput';
import { useAuth } from '../../context/AuthContext';
import { MOCK_STUDENT_PROFILE } from '../../lib/mockData';
import api from '../../lib/api';
import { toast } from 'sonner';

// Zod Validation Schemas
const basicInfoSchema = z.object({
  fullName: z.string().trim().min(1, 'Use the name on your student ID.'),
  email: z.string().trim().email('Enter a complete email, such as hodan@example.com.'),
  phone: z.string().trim().min(7, 'Enter your full phone number, including the country code.'),
  city: z.string().trim().min(1, 'Choose the city where you currently live.'),
});

const educationSchema = z.object({
  institution: z.string().trim().min(1, 'Enter the institution you attend or graduated from.'),
  fieldOfStudy: z.string().trim().min(1, 'Use the course name on your student record.'),
  qualification: z.string().trim().min(1, 'Select your current or most recent qualification.'),
  startYear: z.string().trim().regex(/^\d{4}$/, 'Year you started.'),
  graduationYear: z.string().trim().regex(/^\d{4}$/, 'Expected or completed.'),
  isStudying: z.boolean(),
});

const skillsSchema = z.object({
  skills: z.array(z.string()).min(1, 'Choose at least 1 skill.').max(7, 'Choose up to 7 skills.'),
});

const projectLinkSchema = z.object({
  title: z.string().trim().min(1, 'A short name that explains your work.'),
  url: z.string().trim().url('Use a public link starting with https://.'),
  contribution: z.string().optional(),
});

interface ProjectItem {
  id: string;
  title: string;
  url: string;
  contribution: string;
}

type ProfileMode = 'VIEW_COMPLETE' | 'WIZARD' | 'EDIT';

export const StudentProfileWizard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Mode: 'VIEW_COMPLETE', 'WIZARD', or 'EDIT'
  const [mode, setMode] = useState<ProfileMode>('VIEW_COMPLETE');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form State initialized with user, localStorage or Figma defaults
  const [fullName, setFullName] = useState(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved).fullName || user?.name || MOCK_STUDENT_PROFILE.full_name || 'Hodan Abdirahman';
    } catch {
      // ignore
    }
    return user?.name || MOCK_STUDENT_PROFILE.full_name || 'Hodan Abdirahman';
  });

  const [email, setEmail] = useState(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved).email || user?.email || MOCK_STUDENT_PROFILE.email || 'hodan.abdi@example.com';
    } catch {
      // ignore
    }
    return user?.email || MOCK_STUDENT_PROFILE.email || 'hodan.abdi@example.com';
  });

  const [phone, setPhone] = useState(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved).phone || MOCK_STUDENT_PROFILE.phone || '+252 61 234 5678';
    } catch {
      // ignore
    }
    return MOCK_STUDENT_PROFILE.phone || '+252 61 234 5678';
  });

  const [city, setCity] = useState(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved).city || MOCK_STUDENT_PROFILE.city || 'Mogadishu';
    } catch {
      // ignore
    }
    return MOCK_STUDENT_PROFILE.city || 'Mogadishu';
  });

  const [institution, setInstitution] = useState(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved).institution || MOCK_STUDENT_PROFILE.institution || 'SIMAD University';
    } catch {
      // ignore
    }
    return MOCK_STUDENT_PROFILE.institution || 'SIMAD University';
  });

  const [fieldOfStudy, setFieldOfStudy] = useState(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved).fieldOfStudy || MOCK_STUDENT_PROFILE.field_of_study || 'Computer Science';
    } catch {
      // ignore
    }
    return MOCK_STUDENT_PROFILE.field_of_study || 'Computer Science';
  });

  const [qualification, setQualification] = useState(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved).qualification || MOCK_STUDENT_PROFILE.qualification || "Bachelor's degree";
    } catch {
      // ignore
    }
    return MOCK_STUDENT_PROFILE.qualification || "Bachelor's degree";
  });

  const [startYear, setStartYear] = useState(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved).startYear || MOCK_STUDENT_PROFILE.start_year || '2023';
    } catch {
      // ignore
    }
    return MOCK_STUDENT_PROFILE.start_year || '2023';
  });

  const [graduationYear, setGraduationYear] = useState(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved).graduationYear || MOCK_STUDENT_PROFILE.graduation_year || '2027';
    } catch {
      // ignore
    }
    return MOCK_STUDENT_PROFILE.graduation_year || '2027';
  });

  const [isStudying, setIsStudying] = useState(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved).isStudying ?? MOCK_STUDENT_PROFILE.is_studying ?? true;
    } catch {
      // ignore
    }
    return MOCK_STUDENT_PROFILE.is_studying ?? true;
  });

  const [skills, setSkills] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved) return JSON.parse(saved).skills || user?.studentProfile?.skills || MOCK_STUDENT_PROFILE.skills || ['React', 'Python', 'Excel'];
    } catch {
      // ignore
    }
    return user?.studentProfile?.skills || MOCK_STUDENT_PROFILE.skills || ['React', 'Python', 'Excel'];
  });

  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    try {
      const saved = localStorage.getItem('furan_student_profile');
      if (saved && JSON.parse(saved).projects) return JSON.parse(saved).projects;
    } catch {
      // ignore
    }
    return [
      {
        id: '1',
        title: 'Student resource hub',
        url: 'https://github.com/hodan-a/furan',
        contribution: 'Built the React interface and Python API.',
      },
    ];
  });

  // Validation Errors state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Sync with API on mount
  useEffect(() => {
    let isMounted = true;
    api.get('/students/me/profile')
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.profile) {
          const p = res.data.profile;
          if (p.skills && Array.isArray(p.skills) && p.skills.length > 0) {
            setSkills(p.skills);
          }
          if (p.project_links && Array.isArray(p.project_links) && p.project_links.length > 0) {
            setProjects((prev) => [
              {
                id: prev[0]?.id || '1',
                title: prev[0]?.title || 'Student resource hub',
                url: p.project_links[0],
                contribution: prev[0]?.contribution || 'Built the React interface and Python API.',
              },
            ]);
          }
        }
      })
      .catch(() => {
        // Fallback to local storage or defaults
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const steps = [
    { num: 1, label: 'Basic info' },
    { num: 2, label: 'Education' },
    { num: 3, label: 'Skills' },
    { num: 4, label: 'Project links' },
    { num: 5, label: 'Review' },
  ];

  // Validate step in wizard mode
  const validateStep = (stepNumber: number): boolean => {
    const errors: Record<string, string> = {};

    if (stepNumber === 1) {
      const result = basicInfoSchema.safeParse({ fullName, email, phone, city });
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          errors[field] = issue.message;
        });
      }
    } else if (stepNumber === 2) {
      const result = educationSchema.safeParse({
        institution,
        fieldOfStudy,
        qualification,
        startYear,
        graduationYear,
        isStudying,
      });
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          errors[field] = issue.message;
        });
      }
    } else if (stepNumber === 3) {
      const result = skillsSchema.safeParse({ skills });
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          errors[field] = issue.message;
        });
      }
    } else if (stepNumber === 4) {
      // Validate all projects
      projects.forEach((proj, idx) => {
        const result = projectLinkSchema.safeParse(proj);
        if (!result.success) {
          result.error.issues.forEach((issue) => {
            const field = issue.path[0] as string;
            errors[`proj_${idx}_${field}`] = issue.message;
          });
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate all fields for consolidated Edit or Step 5
  const validateAll = (): boolean => {
    const errors: Record<string, string> = {};

    const basicResult = basicInfoSchema.safeParse({ fullName, email, phone, city });
    if (!basicResult.success) {
      basicResult.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      });
    }

    const eduResult = educationSchema.safeParse({
      institution,
      fieldOfStudy,
      qualification,
      startYear,
      graduationYear,
      isStudying,
    });
    if (!eduResult.success) {
      eduResult.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      });
    }

    const skillsResult = skillsSchema.safeParse({ skills });
    if (!skillsResult.success) {
      skillsResult.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      });
    }

    projects.forEach((proj, idx) => {
      const result = projectLinkSchema.safeParse(proj);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          errors[`proj_${idx}_${field}`] = issue.message;
        });
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Generate readable summary text for validation banner
  const getValidationBannerText = () => {
    const errorKeys = Object.keys(formErrors);
    const count = errorKeys.length;
    if (count === 0) return null;

    const friendlyNames: string[] = [];
    if (formErrors.fullName) friendlyNames.push('full name');
    if (formErrors.email) friendlyNames.push('email address');
    if (formErrors.phone) friendlyNames.push('phone number');
    if (formErrors.city) friendlyNames.push('city');
    if (formErrors.institution) friendlyNames.push('institution');
    if (formErrors.fieldOfStudy) friendlyNames.push('field of study');
    if (formErrors.startYear || formErrors.graduationYear) friendlyNames.push('academic years');
    if (formErrors.skills) friendlyNames.push('skills');
    if (errorKeys.some((k) => k.startsWith('proj_'))) friendlyNames.push('project links');

    let formattedList = friendlyNames.join(', ');
    if (friendlyNames.length === 2) {
      formattedList = `${friendlyNames[0]} and ${friendlyNames[1]}`;
    } else if (friendlyNames.length > 2) {
      formattedList = `${friendlyNames.slice(0, -1).join(', ')} and ${friendlyNames[friendlyNames.length - 1]}`;
    }

    return {
      count,
      title: `Check ${count} ${count === 1 ? 'field' : 'fields'} to continue`,
      subtitle: `Your ${formattedList || 'highlighted fields'} need a little attention. Your other details are kept.`,
    };
  };

  // Save profile to API and localStorage
  const handleSaveProfile = async () => {
    if (!validateAll()) {
      toast.error('Please check the required fields before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const educationSummary = `${fieldOfStudy} · ${qualification}\n${institution} · ${startYear}–${graduationYear}\n${isStudying ? 'Currently studying' : 'Graduated'}`.slice(0, 191);
      
      const validProjectUrls = projects
        .map((p) => p.url.trim())
        .filter((u) => u.startsWith('http://') || u.startsWith('https://'));

      const payload = {
        education: educationSummary,
        skills: skills.slice(0, 7),
        project_links: validProjectUrls.slice(0, 10),
      };

      await api.put('/students/me/profile', payload);

      // Persist full structured profile locally
      const structuredProfile = {
        fullName,
        email,
        phone,
        city,
        institution,
        fieldOfStudy,
        qualification,
        startYear,
        graduationYear,
        isStudying,
        skills,
        projects,
      };
      localStorage.setItem('furan_student_profile', JSON.stringify(structuredProfile));

      toast.success('Profile saved successfully!');
      setFormErrors({});
      setMode('VIEW_COMPLETE');
    } catch {
      // Offline fallback: save locally and clearly inform the user
      const structuredProfile = {
        fullName,
        email,
        phone,
        city,
        institution,
        fieldOfStudy,
        qualification,
        startYear,
        graduationYear,
        isStudying,
        skills,
        projects,
      };
      localStorage.setItem('furan_student_profile', JSON.stringify(structuredProfile));

      toast.info('Saved locally (offline mode). Server could not be reached.');
      setFormErrors({});
      setMode('VIEW_COMPLETE');
    } finally {
      setIsSaving(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.delete('/users/me');
      localStorage.removeItem('furan_student_profile');
      setShowDeleteModal(false);
      toast.success('Your account has been deleted.');
      logout();
      navigate('/');
    } catch {
      setShowDeleteModal(false);
      toast.error('Unable to delete account at this time. Please check your connection.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setFormErrors({});
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const jumpToStep = (stepNumber: number) => {
    setFormErrors({});
    setMode('WIZARD');
    setCurrentStep(stepNumber);
  };

  const banner = getValidationBannerText();

  // -------------------------------------------------------------
  // VIEW COMPLETE MODE (Figma: docs/figma/Student/profile/Profile complete/Desktop.png)
  // -------------------------------------------------------------
  if (mode === 'VIEW_COMPLETE') {
    return (
      <div className="w-full text-left space-y-8">
        <div>
          <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
            STUDENT / PROFILE
          </p>
          <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1 tracking-tight">
            Your student profile
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1 leading-[24px]">
            Your details are saved and ready for your next opportunity.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main profile card (8 cols on lg) */}
          <div className="lg:col-span-8 bg-white border border-[#E2E6EE] rounded-[12px] p-6 sm:p-8 space-y-6 shadow-xs">
            {/* User Header */}
            <div className="flex items-center gap-3.5">
              {!avatarError ? (
                <img
                  src="/images/hodan-avatar.png"
                  alt={fullName}
                  className="h-12 w-12 rounded-full object-cover border border-[#E2E6EE] shrink-0"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {fullName ? fullName.slice(0, 2).toUpperCase() : 'HA'}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-[#1B2433] truncate">{fullName}</h3>
                <p className="text-[13px] text-[#5B6475] truncate">
                  {fieldOfStudy} · {institution}
                </p>
                <p className="text-[13px] text-[#5B6475] truncate">{city}</p>
              </div>
            </div>

            {/* Profile complete banner matching Figma */}
            <div className="bg-[#E3F6EC] border border-[#1E8E5A]/20 rounded-[8px] p-4 flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-[#1E8E5A] shrink-0" />
              <div>
                <span className="text-[13px] font-semibold text-[#1E8E5A]">Profile complete</span>
                <p className="text-[12px] text-[#1E8E5A]/90">All five sections saved · 100%</p>
              </div>
            </div>

            {/* Section 1: Basic info */}
            <div className="pt-4 border-t border-[#E2E6EE]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[15px] font-semibold text-[#1B2433]">Basic info</h4>
                <button
                  type="button"
                  onClick={() => setMode('EDIT')}
                  className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
                >
                  Edit
                </button>
              </div>
              <p className="text-[14px] text-[#5B6475]">{email}</p>
              <p className="text-[14px] text-[#5B6475] mt-0.5">{phone}</p>
              <p className="text-[14px] text-[#5B6475] mt-0.5">{city}</p>
            </div>

            {/* Section 2: Education */}
            <div className="pt-4 border-t border-[#E2E6EE]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[15px] font-semibold text-[#1B2433]">Education</h4>
                <button
                  type="button"
                  onClick={() => setMode('EDIT')}
                  className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
                >
                  Edit
                </button>
              </div>
              <p className="text-[14px] text-[#5B6475] font-medium">
                {fieldOfStudy} · {qualification}
              </p>
              <p className="text-[14px] text-[#5B6475] mt-0.5">
                {institution} · {startYear}–{graduationYear}
              </p>
              <p className="text-[13px] text-[#5B6475] mt-0.5">
                {isStudying ? 'Currently studying' : 'Graduated'}
              </p>
            </div>

            {/* Section 3: Skills */}
            <div className="pt-4 border-t border-[#E2E6EE]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[15px] font-semibold text-[#1B2433]">Skills</h4>
                <button
                  type="button"
                  onClick={() => setMode('EDIT')}
                  className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
                >
                  Edit
                </button>
              </div>
              <p className="text-[14px] text-[#5B6475]">{skills.join(' · ')}</p>
            </div>

            {/* Section 4: Project links */}
            <div className="pt-4 border-t border-[#E2E6EE]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[15px] font-semibold text-[#1B2433]">Project links</h4>
                <button
                  type="button"
                  onClick={() => setMode('EDIT')}
                  className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
                >
                  Edit
                </button>
              </div>
              {projects.map((proj) => (
                <div key={proj.id} className="space-y-1 mb-3 last:mb-0">
                  <p className="text-[14px] font-medium text-[#1B2433]">{proj.title}</p>
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] text-[#1F5FBF] hover:underline break-all block"
                  >
                    {proj.url}
                  </a>
                  {proj.contribution && (
                    <p className="text-[13px] text-[#5B6475]">{proj.contribution}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Edit profile button */}
            <div className="pt-4 border-t border-[#E2E6EE]">
              <Button
                variant="secondary"
                onClick={() => setMode('EDIT')}
                className="px-5 text-[13px] font-semibold"
              >
                Edit profile
              </Button>
            </div>
          </div>

          {/* Right Sidebar cards (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Account Card */}
            <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs space-y-4">
              <div>
                <h4 className="text-[15px] font-bold text-[#1B2433]">{fullName}</h4>
                <p className="text-[12px] text-[#5B6475]">Student account</p>
              </div>
              <Button variant="secondary" onClick={logout} className="w-full text-[13px] font-semibold">
                Log out
              </Button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-2.5 px-4 rounded-[8px] bg-[#C81E1E] text-white text-[13px] font-semibold hover:bg-[#9B1C1C] transition-colors"
              >
                Delete my account
              </button>
            </div>

            {/* Ready to apply card */}
            <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[12px] p-6 shadow-xs">
              <div className="h-8 w-8 rounded-full bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center mb-3">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h4 className="text-[15px] font-bold text-[#1B2433]">You're ready to apply</h4>
              <p className="text-[13px] text-[#5B6475] mt-2 leading-[20px]">
                Your saved profile is used when you confirm an application. You can review it before
                you send.
              </p>
              <div className="flex items-center gap-1.5 pt-4 text-[12px] text-[#5B6475]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1F5FBF] shrink-0" />
                <span>Businesses only see your details after you apply.</span>
              </div>
            </div>

            {/* What happens next card */}
            <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
              <h4 className="text-[15px] font-bold text-[#1B2433]">What happens next?</h4>
              <p className="text-[13px] text-[#5B6475] mt-2 leading-[20px]">
                Browse internships and jobs, then apply with your saved details. Competition
                registrations are separate.
              </p>
              <Link to="/opportunities" className="block mt-4">
                <Button variant="primary" className="w-full text-[13px] font-semibold">
                  Browse opportunities
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom privacy note */}
        <div className="flex items-center gap-2 pt-2 text-[12px] text-[#5B6475]">
          <ShieldCheck className="h-4 w-4 text-[#1F5FBF] shrink-0" />
          <span>Businesses only see your details after you apply.</span>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-[12px] p-6 max-w-md w-full shadow-lg space-y-4">
              <div className="flex items-center gap-3 text-[#C81E1E]">
                <AlertTriangle className="h-6 w-6" />
                <h3 className="text-[18px] font-bold text-[#1B2433]">Delete student account?</h3>
              </div>
              <p className="text-[14px] text-[#5B6475] leading-relaxed">
                Are you sure you want to delete your student account? This will permanently remove your profile, skills, and saved applications. This action cannot be undone.
              </p>
              <div className="pt-2 flex items-center justify-end gap-3">
                <Button variant="secondary" disabled={isDeleting} onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteAccount}
                  className="py-2.5 px-4 rounded-[8px] bg-[#C81E1E] text-white text-[13px] font-semibold hover:bg-[#9B1C1C] transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting account...' : 'Yes, delete account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // EDIT MODE (Figma: docs/figma/Student/profile/Edit/Desktop.png)
  // -------------------------------------------------------------
  if (mode === 'EDIT') {
    return (
      <div className="w-full text-left space-y-8">
        <div>
          <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
            STUDENT / PROFILE
          </p>
          <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1 tracking-tight">
            Edit your profile
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1 leading-[24px]">
            Keep your details, skills and project links up to date.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Edit Form (8 cols on lg) */}
          <div className="lg:col-span-8 bg-white border border-[#E2E6EE] rounded-[12px] p-6 sm:p-8 space-y-8 shadow-xs">
            {/* Validation Error Banner (Figma: docs/figma/Student/profile/Validation/Desktop.png) */}
            {banner && (
              <div className="bg-[#FDE8E8] border border-[#F8B4B4] rounded-[8px] p-4 text-left">
                <h4 className="text-[14px] font-bold text-[#9B1C1C]">{banner.title}</h4>
                <p className="text-[13px] text-[#C81E1E] mt-1">{banner.subtitle}</p>
              </div>
            )}

            {/* BASIC INFO */}
            <div className="space-y-6">
              <h3 className="text-[18px] font-semibold text-[#1B2433]">Basic info</h3>

              {/* User preview header */}
              <div className="flex items-center gap-3.5">
                {!avatarError ? (
                  <img
                    src="/images/hodan-avatar.png"
                    alt={fullName}
                    className="h-12 w-12 rounded-full object-cover border border-[#E2E6EE] shrink-0"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {fullName ? fullName.slice(0, 2).toUpperCase() : 'HA'}
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-[15px] font-bold text-[#1B2433] truncate">{fullName}</h4>
                  <p className="text-[12px] text-[#5B6475] truncate">
                    {fieldOfStudy} · {institution}
                  </p>
                  <p className="text-[12px] text-[#5B6475] truncate">{city}</p>
                </div>
              </div>

              <Input
                id="edit-name"
                label="Full name"
                value={fullName}
                error={formErrors.fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                helperText="Use the name on your student ID."
                required
              />

              <Input
                id="edit-email"
                label="Email address"
                type="email"
                value={email}
                error={formErrors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                }}
                helperText="We’ll send application updates to this email."
                required
              />

              <Input
                id="edit-phone"
                label="Phone number"
                value={phone}
                error={formErrors.phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
                }}
                helperText="Include your country code so organizations can reach you."
                required
              />

              <Select
                id="edit-city"
                label="City"
                value={city}
                error={formErrors.city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (formErrors.city) setFormErrors((prev) => ({ ...prev, city: '' }));
                }}
                options={[
                  { label: 'Mogadishu', value: 'Mogadishu' },
                  { label: 'Hargeisa', value: 'Hargeisa' },
                  { label: 'Garowe', value: 'Garowe' },
                  { label: 'Baidoa', value: 'Baidoa' },
                  { label: 'Kismayo', value: 'Kismayo' },
                ]}
                helperText="Choose the city where you currently live."
                required
              />
            </div>

            {/* EDUCATION */}
            <div className="pt-6 border-t border-[#E2E6EE] space-y-6">
              <h3 className="text-[18px] font-semibold text-[#1B2433]">Education</h3>

              <Input
                id="edit-institution"
                label="University or college"
                value={institution}
                error={formErrors.institution}
                onChange={(e) => {
                  setInstitution(e.target.value);
                  if (formErrors.institution) setFormErrors((prev) => ({ ...prev, institution: '' }));
                }}
                helperText="Enter the institution you attend or graduated from."
                required
              />

              <Input
                id="edit-field"
                label="Field of study"
                value={fieldOfStudy}
                error={formErrors.fieldOfStudy}
                onChange={(e) => {
                  setFieldOfStudy(e.target.value);
                  if (formErrors.fieldOfStudy) setFormErrors((prev) => ({ ...prev, fieldOfStudy: '' }));
                }}
                helperText="Use the course name on your student record."
                required
              />

              <Select
                id="edit-qual"
                label="Qualification"
                value={qualification}
                error={formErrors.qualification}
                onChange={(e) => {
                  setQualification(e.target.value);
                  if (formErrors.qualification) setFormErrors((prev) => ({ ...prev, qualification: '' }));
                }}
                options={[
                  { label: "Bachelor's degree", value: "Bachelor's degree" },
                  { label: 'Diploma', value: 'Diploma' },
                  { label: 'Certificate', value: 'Certificate' },
                  { label: "Master's degree", value: "Master's degree" },
                ]}
                helperText="Select your current or most recent qualification."
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="edit-start"
                  label="Start year"
                  value={startYear}
                  error={formErrors.startYear}
                  onChange={(e) => {
                    setStartYear(e.target.value);
                    if (formErrors.startYear) setFormErrors((prev) => ({ ...prev, startYear: '' }));
                  }}
                  helperText="Year you started."
                  required
                />
                <Input
                  id="edit-grad"
                  label="Graduation year"
                  value={graduationYear}
                  error={formErrors.graduationYear}
                  onChange={(e) => {
                    setGraduationYear(e.target.value);
                    if (formErrors.graduationYear) setFormErrors((prev) => ({ ...prev, graduationYear: '' }));
                  }}
                  helperText="Expected or completed."
                  required
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStudying}
                  onChange={(e) => setIsStudying(e.target.checked)}
                  className="h-4 w-4 rounded border-[#E2E6EE] text-[#1F5FBF] focus:ring-[#1F5FBF]"
                />
                <span className="text-[13px] text-[#1B2433]">I’m currently studying here.</span>
              </label>
            </div>

            {/* SKILLS */}
            <div className="pt-6 border-t border-[#E2E6EE] space-y-6">
              <h3 className="text-[18px] font-semibold text-[#1B2433]">Skills</h3>

              <SkillChipInput
                skills={skills}
                onChange={(newSkills) => {
                  setSkills(newSkills);
                  if (formErrors.skills) setFormErrors((prev) => ({ ...prev, skills: '' }));
                }}
                label="Your skills"
                error={formErrors.skills}
                helperText={`Choose up to 7 skills. ${skills.length} selected.`}
                maxSkills={7}
                suggestions={[
                  'Accounting',
                  'Public Speaking',
                  'Graphic Design',
                  'Data Entry',
                  'React',
                  'Python',
                  'Excel',
                ]}
              />

              <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[8px] p-4 text-[13px] text-[#0F3166] leading-[20px]">
                <p className="font-semibold mb-1">Student experience counts.</p>
                Choose skills you can talk about through coursework, volunteering or a project. You can update these later.
              </div>
            </div>

            {/* PROJECT LINKS */}
            <div className="pt-6 border-t border-[#E2E6EE] space-y-6">
              <div>
                <h3 className="text-[18px] font-semibold text-[#1B2433]">Project links</h3>
                <p className="text-[13px] text-[#5B6475] mt-1">
                  Add a project, portfolio or GitHub link. Make sure anyone with the link can open it.
                </p>
              </div>

              {projects.map((proj, idx) => (
                <div key={proj.id} className="border border-[#E2E6EE] rounded-[10px] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[14px] font-semibold text-[#1B2433]">
                      {proj.title || `Project #${idx + 1}`}
                    </h4>
                    {projects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setProjects((prev) => prev.filter((p) => p.id !== proj.id));
                        }}
                        className="text-[12px] font-medium text-[#C0392B] hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <Input
                    id={`edit-proj-title-${idx}`}
                    label="Project title"
                    value={proj.title}
                    error={formErrors[`proj_${idx}_title`]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProjects((prev) =>
                        prev.map((p) => (p.id === proj.id ? { ...p, title: val } : p))
                      );
                    }}
                    helperText="A short name that explains your work."
                    required
                  />

                  <Input
                    id={`edit-proj-url-${idx}`}
                    label="Project URL"
                    value={proj.url}
                    error={formErrors[`proj_${idx}_url`]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProjects((prev) =>
                        prev.map((p) => (p.id === proj.id ? { ...p, url: val } : p))
                      );
                    }}
                    helperText="Use a public link starting with https://."
                    required
                  />

                  <Input
                    id={`edit-proj-contrib-${idx}`}
                    label="Your contribution"
                    value={proj.contribution}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProjects((prev) =>
                        prev.map((p) => (p.id === proj.id ? { ...p, contribution: val } : p))
                      );
                    }}
                    helperText="Tell organizations what you worked on."
                  />
                </div>
              ))}

              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setProjects((prev) => [
                    ...prev,
                    {
                      id: String(Date.now()),
                      title: '',
                      url: '',
                      contribution: '',
                    },
                  ]);
                }}
                className="text-[13px] font-semibold"
              >
                + Add another link
              </Button>

              <p className="text-[12px] text-[#5B6475]">
                {projects.length} project{projects.length === 1 ? '' : 's'} added · You can edit or remove links anytime.
              </p>
            </div>

            {/* Bottom Actions matching Figma */}
            <div className="pt-6 border-t border-[#E2E6EE]">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setFormErrors({});
                    setMode('VIEW_COMPLETE');
                  }}
                  className="px-5 text-[14px] font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  isLoading={isSaving}
                  onClick={handleSaveProfile}
                  className="px-6 text-[14px] font-semibold"
                >
                  Save changes
                </Button>
              </div>
              <p className="text-[12px] text-[#5B6475] mt-3">
                Changes are only saved when you choose Save changes.
              </p>
            </div>
          </div>

          {/* Right Sidebar cards (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[12px] p-6 shadow-xs">
              <div className="h-8 w-8 rounded-full bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center mb-3">
                <UserIcon className="h-4 w-4" />
              </div>
              <h4 className="text-[15px] font-bold text-[#1B2433]">Your potential, clearly shown</h4>
              <p className="text-[13px] text-[#5B6475] mt-2 leading-[20px]">
                Coursework, student projects and volunteer experience all count. Start with what you know today.
              </p>
              <div className="flex items-center gap-1.5 pt-4 text-[12px] text-[#5B6475]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1F5FBF] shrink-0" />
                <span>Businesses only see your details after you apply.</span>
              </div>
            </div>

            <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
              <h4 className="text-[15px] font-bold text-[#1B2433]">A profile that grows with you</h4>
              <p className="text-[13px] text-[#5B6475] mt-2 leading-[20px]">
                You can return to any step before saving. After setup, use Edit profile to make changes.
              </p>
              <p className="text-[12px] text-[#1F5FBF] font-medium mt-3 cursor-pointer hover:underline">
                Need a hand? Visit the help center →
              </p>
            </div>
          </div>
        </div>

        {/* Bottom privacy note */}
        <div className="flex items-center gap-2 pt-2 text-[12px] text-[#5B6475]">
          <ShieldCheck className="h-4 w-4 text-[#1F5FBF] shrink-0" />
          <span>Businesses only see your details after you apply.</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // WIZARD SETUP MODE (Figma: docs/figma/Student/profile/Create/...)
  // -------------------------------------------------------------
  return (
    <div className="w-full text-left space-y-8">
      <div>
        <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
          STUDENT / PROFILE / FIRST-TIME SETUP
        </p>
        <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1 tracking-tight">
          Create your student profile
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1 leading-[24px]">
          Five simple steps. Build a profile you can use for every application.
        </p>
      </div>

      {/* Stepper Bar */}
      <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto pb-2 border-b border-[#E2E6EE]">
        {steps.map((st) => {
          const isDone = currentStep > st.num;
          const isCurrent = currentStep === st.num;
          return (
            <div key={st.num} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFormErrors({});
                  setCurrentStep(st.num);
                }}
                className={`h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                  isDone
                    ? 'bg-[#1F5FBF] text-white'
                    : isCurrent
                    ? 'bg-[#1F5FBF] text-white'
                    : 'bg-[#F7F9FC] text-[#5B6475] border border-[#E2E6EE]'
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : st.num}
              </button>
              <span
                className={`text-[13px] font-medium ${
                  isCurrent ? 'text-[#1F5FBF] font-semibold' : 'text-[#5B6475]'
                }`}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Step Form Container (8 cols on lg) */}
        <div className="lg:col-span-8 bg-white border border-[#E2E6EE] rounded-[12px] p-6 sm:p-8 shadow-xs">
          {/* Validation Banner (Figma: docs/figma/Student/profile/Validation/Desktop.png) */}
          {banner && (
            <div className="bg-[#FDE8E8] border border-[#F8B4B4] rounded-[8px] p-4 text-left mb-6">
              <h4 className="text-[14px] font-bold text-[#9B1C1C]">{banner.title}</h4>
              <p className="text-[13px] text-[#C81E1E] mt-1">{banner.subtitle}</p>
            </div>
          )}

          {/* STEP 1: BASIC INFO */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[18px] font-semibold text-[#1B2433]">Basic info</h3>
                <p className="text-[13px] text-[#5B6475] mt-1">
                  Start with the details organizations need to contact you.
                </p>
              </div>

              {/* User preview header */}
              <div className="flex items-center gap-3.5">
                {!avatarError ? (
                  <img
                    src="/images/hodan-avatar.png"
                    alt={fullName}
                    className="h-12 w-12 rounded-full object-cover border border-[#E2E6EE] shrink-0"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {fullName ? fullName.slice(0, 2).toUpperCase() : 'HA'}
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-[14px] font-semibold text-[#1B2433] truncate">{fullName}</h4>
                  <p className="text-[12px] text-[#5B6475] truncate">
                    {fieldOfStudy} · {institution}
                  </p>
                  <p className="text-[12px] text-[#5B6475] truncate">{city}</p>
                </div>
              </div>

              <Input
                id="st-name"
                label="Full name"
                value={fullName}
                error={formErrors.fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                helperText="Use the name on your student ID."
                required
              />

              <Input
                id="st-email"
                label="Email address"
                type="email"
                value={email}
                error={formErrors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                }}
                helperText="We’ll send application updates to this email."
                required
              />

              <Input
                id="st-phone"
                label="Phone number"
                value={phone}
                error={formErrors.phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
                }}
                helperText="Include your country code so organizations can reach you."
                required
              />

              <Select
                id="st-city"
                label="City"
                value={city}
                error={formErrors.city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (formErrors.city) setFormErrors((prev) => ({ ...prev, city: '' }));
                }}
                options={[
                  { label: 'Mogadishu', value: 'Mogadishu' },
                  { label: 'Hargeisa', value: 'Hargeisa' },
                  { label: 'Garowe', value: 'Garowe' },
                  { label: 'Baidoa', value: 'Baidoa' },
                  { label: 'Kismayo', value: 'Kismayo' },
                ]}
                helperText="Choose the city where you currently live."
                required
              />

              <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between">
                <Button variant="secondary" onClick={() => setMode('VIEW_COMPLETE')}>
                  Back to dashboard
                </Button>
                <Button variant="primary" onClick={handleNextStep}>
                  Continue
                </Button>
              </div>

              <p className="text-[12px] text-[#5B6475]">
                Your progress is kept as you move between steps.
              </p>
            </div>
          )}

          {/* STEP 2: EDUCATION */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[18px] font-semibold text-[#1B2433]">Education</h3>
                <p className="text-[13px] text-[#5B6475] mt-1">
                  Tell us where you’re building your knowledge.
                </p>
              </div>

              <Input
                id="st-institution"
                label="University or college"
                value={institution}
                error={formErrors.institution}
                onChange={(e) => {
                  setInstitution(e.target.value);
                  if (formErrors.institution) setFormErrors((prev) => ({ ...prev, institution: '' }));
                }}
                helperText="Enter the institution you attend or graduated from."
                required
              />

              <Input
                id="st-field"
                label="Field of study"
                value={fieldOfStudy}
                error={formErrors.fieldOfStudy}
                onChange={(e) => {
                  setFieldOfStudy(e.target.value);
                  if (formErrors.fieldOfStudy) setFormErrors((prev) => ({ ...prev, fieldOfStudy: '' }));
                }}
                helperText="Use the course name on your student record."
                required
              />

              <Select
                id="st-qual"
                label="Qualification"
                value={qualification}
                error={formErrors.qualification}
                onChange={(e) => {
                  setQualification(e.target.value);
                  if (formErrors.qualification) setFormErrors((prev) => ({ ...prev, qualification: '' }));
                }}
                options={[
                  { label: "Bachelor's degree", value: "Bachelor's degree" },
                  { label: 'Diploma', value: 'Diploma' },
                  { label: 'Certificate', value: 'Certificate' },
                  { label: "Master's degree", value: "Master's degree" },
                ]}
                helperText="Select your current or most recent qualification."
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="st-start"
                  label="Start year"
                  value={startYear}
                  error={formErrors.startYear}
                  onChange={(e) => {
                    setStartYear(e.target.value);
                    if (formErrors.startYear) setFormErrors((prev) => ({ ...prev, startYear: '' }));
                  }}
                  helperText="Year you started."
                  required
                />
                <Input
                  id="st-grad"
                  label="Graduation year"
                  value={graduationYear}
                  error={formErrors.graduationYear}
                  onChange={(e) => {
                    setGraduationYear(e.target.value);
                    if (formErrors.graduationYear) setFormErrors((prev) => ({ ...prev, graduationYear: '' }));
                  }}
                  helperText="Expected or completed."
                  required
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStudying}
                  onChange={(e) => setIsStudying(e.target.checked)}
                  className="h-4 w-4 rounded border-[#E2E6EE] text-[#1F5FBF] focus:ring-[#1F5FBF]"
                />
                <span className="text-[13px] text-[#1B2433]">I’m currently studying here.</span>
              </label>

              <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button variant="primary" onClick={handleNextStep}>
                  Continue
                </Button>
              </div>

              <p className="text-[12px] text-[#5B6475]">
                Your progress is kept as you move between steps.
              </p>
            </div>
          )}

          {/* STEP 3: SKILLS */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[18px] font-semibold text-[#1B2433]">Skills</h3>
                <p className="text-[13px] text-[#5B6475] mt-1">
                  Choose the skills you’d like to put to work.
                </p>
              </div>

              <SkillChipInput
                skills={skills}
                onChange={(newSkills) => {
                  setSkills(newSkills);
                  if (formErrors.skills) setFormErrors((prev) => ({ ...prev, skills: '' }));
                }}
                label="Your skills"
                error={formErrors.skills}
                helperText={`Choose up to 7 skills. ${skills.length} selected.`}
                maxSkills={7}
                suggestions={[
                  'Accounting',
                  'Public Speaking',
                  'Graphic Design',
                  'Data Entry',
                  'React',
                  'Python',
                  'Excel',
                ]}
              />

              <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[8px] p-4 text-[13px] text-[#0F3166] leading-[20px]">
                <p className="font-semibold mb-1">Student experience counts.</p>
                Choose skills you can talk about through coursework, volunteering or a project. You can update these later.
              </div>

              <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button variant="primary" onClick={handleNextStep}>
                  Continue
                </Button>
              </div>

              <p className="text-[12px] text-[#5B6475]">
                Your progress is kept as you move between steps.
              </p>
            </div>
          )}

          {/* STEP 4: PROJECT LINKS */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[18px] font-semibold text-[#1B2433]">Project links</h3>
                <p className="text-[13px] text-[#5B6475] mt-1">
                  Show what you’ve made, not just what you know. Add a project, portfolio or GitHub link. Make sure anyone with the link can open it.
                </p>
              </div>

              {projects.map((proj, idx) => (
                <div key={proj.id} className="border border-[#E2E6EE] rounded-[10px] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[14px] font-semibold text-[#1B2433]">
                      {proj.title || `Project #${idx + 1}`}
                    </h4>
                    {projects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setProjects((prev) => prev.filter((p) => p.id !== proj.id));
                        }}
                        className="text-[12px] font-medium text-[#C0392B] hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <Input
                    id={`wiz-proj-title-${idx}`}
                    label="Project title"
                    value={proj.title}
                    error={formErrors[`proj_${idx}_title`]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProjects((prev) =>
                        prev.map((p) => (p.id === proj.id ? { ...p, title: val } : p))
                      );
                    }}
                    helperText="A short name that explains your work."
                    required
                  />

                  <Input
                    id={`wiz-proj-url-${idx}`}
                    label="Project URL"
                    value={proj.url}
                    error={formErrors[`proj_${idx}_url`]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProjects((prev) =>
                        prev.map((p) => (p.id === proj.id ? { ...p, url: val } : p))
                      );
                    }}
                    helperText="Use a public link starting with https://."
                    required
                  />

                  <Input
                    id={`wiz-proj-contrib-${idx}`}
                    label="Your contribution"
                    value={proj.contribution}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProjects((prev) =>
                        prev.map((p) => (p.id === proj.id ? { ...p, contribution: val } : p))
                      );
                    }}
                    helperText="Tell organizations what you worked on."
                  />
                </div>
              ))}

              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setProjects((prev) => [
                    ...prev,
                    {
                      id: String(Date.now()),
                      title: '',
                      url: '',
                      contribution: '',
                    },
                  ]);
                }}
                className="text-[13px] font-semibold"
              >
                + Add another link
              </Button>

              <p className="text-[12px] text-[#5B6475]">
                {projects.length} project{projects.length === 1 ? '' : 's'} added · You can edit or remove links anytime.
              </p>

              <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <Button variant="primary" onClick={handleNextStep}>
                  Continue
                </Button>
              </div>

              <p className="text-[12px] text-[#5B6475]">
                Your progress is kept as you move between steps.
              </p>
            </div>
          )}

          {/* STEP 5: REVIEW */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[18px] font-semibold text-[#1B2433]">Review</h3>
                <p className="text-[13px] text-[#5B6475] mt-1">
                  Check your details before saving your profile.
                </p>
              </div>

              {/* User preview header */}
              <div className="flex items-center gap-3.5 p-3 bg-[#F7F9FC] border border-[#E2E6EE] rounded-[10px]">
                {!avatarError ? (
                  <img
                    src="/images/hodan-avatar.png"
                    alt={fullName}
                    className="h-10 w-10 rounded-full object-cover border border-[#E2E6EE] shrink-0"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {fullName ? fullName.slice(0, 2).toUpperCase() : 'HA'}
                  </div>
                )}
                <div>
                  <h4 className="text-[14px] font-semibold text-[#1B2433]">{fullName}</h4>
                  <p className="text-[12px] text-[#5B6475]">
                    {fieldOfStudy} · {institution}
                  </p>
                  <p className="text-[12px] text-[#5B6475]">{city}</p>
                </div>
              </div>

              {/* Basic info */}
              <div className="pt-4 border-t border-[#E2E6EE]">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[14px] font-semibold text-[#1B2433]">Basic info</h4>
                  <button
                    type="button"
                    onClick={() => jumpToStep(1)}
                    className="text-[12px] font-medium text-[#1F5FBF] hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-[13px] text-[#5B6475]">{email}</p>
                <p className="text-[13px] text-[#5B6475]">{phone}</p>
                <p className="text-[13px] text-[#5B6475]">{city}</p>
              </div>

              {/* Education */}
              <div className="pt-4 border-t border-[#E2E6EE]">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[14px] font-semibold text-[#1B2433]">Education</h4>
                  <button
                    type="button"
                    onClick={() => jumpToStep(2)}
                    className="text-[12px] font-medium text-[#1F5FBF] hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-[13px] text-[#5B6475] font-medium">
                  {fieldOfStudy} · {qualification}
                </p>
                <p className="text-[13px] text-[#5B6475]">
                  {institution} · {startYear}–{graduationYear}
                </p>
                <p className="text-[12px] text-[#5B6475]">
                  {isStudying ? 'Currently studying' : 'Graduated'}
                </p>
              </div>

              {/* Skills */}
              <div className="pt-4 border-t border-[#E2E6EE]">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[14px] font-semibold text-[#1B2433]">Skills</h4>
                  <button
                    type="button"
                    onClick={() => jumpToStep(3)}
                    className="text-[12px] font-medium text-[#1F5FBF] hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-[13px] text-[#5B6475]">{skills.join(' · ')}</p>
              </div>

              {/* Project links */}
              <div className="pt-4 border-t border-[#E2E6EE]">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[14px] font-semibold text-[#1B2433]">Project links</h4>
                  <button
                    type="button"
                    onClick={() => jumpToStep(4)}
                    className="text-[12px] font-medium text-[#1F5FBF] hover:underline"
                  >
                    Edit
                  </button>
                </div>
                {projects.map((proj) => (
                  <div key={proj.id} className="space-y-0.5 mb-2 last:mb-0">
                    <p className="text-[13px] font-medium text-[#1B2433]">{proj.title}</p>
                    <p className="text-[12px] text-[#1F5FBF]">{proj.url}</p>
                    {proj.contribution && (
                      <p className="text-[12px] text-[#5B6475]">{proj.contribution}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(4)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  isLoading={isSaving}
                  onClick={handleSaveProfile}
                  className="px-6 font-semibold"
                >
                  Save profile
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2 text-[12px] text-[#5B6475]">
            <ShieldCheck className="h-4 w-4 text-[#1F5FBF] shrink-0" />
            <span>Businesses only see your details after you apply.</span>
          </div>
        </div>

        {/* Sidebar Info Cards (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[12px] p-6 shadow-xs">
            <h4 className="text-[15px] font-bold text-[#1B2433]">Your potential, clearly shown</h4>
            <p className="text-[13px] text-[#5B6475] mt-2 leading-[20px]">
              Coursework, student projects and volunteer experience all count. Start with what you know today.
            </p>
            <div className="flex items-center gap-1.5 pt-3 text-[12px] text-[#5B6475]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#1F5FBF] shrink-0" />
              <span>Businesses only see your details after you apply.</span>
            </div>
          </div>

          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <h4 className="text-[15px] font-bold text-[#1B2433]">A profile that grows with you</h4>
            <p className="text-[13px] text-[#5B6475] mt-2 leading-[20px]">
              You can return to any step before saving. After setup, use Edit profile to make changes.
            </p>
            <p className="text-[12px] text-[#1F5FBF] font-medium mt-3 cursor-pointer hover:underline">
              Need a hand? Visit the help center →
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfileWizard;
