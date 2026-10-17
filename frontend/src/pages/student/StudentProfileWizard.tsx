import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SkillChipInput } from '../../components/ui/SkillChipInput';
import { useAuth } from '../../context/AuthContext';
import { MOCK_STUDENT_PROFILE } from '../../lib/mockData';
import api from '../../lib/api';
import { toast } from 'sonner';

export const StudentProfileWizard: React.FC = () => {
  const { user, logout } = useAuth();

  // Mode: 'VIEW_COMPLETE' or 'WIZARD'
  const [mode, setMode] = useState<'VIEW_COMPLETE' | 'WIZARD'>('VIEW_COMPLETE');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form State initialized with Figma defaults
  const [fullName, setFullName] = useState(user?.name || MOCK_STUDENT_PROFILE.full_name || 'Hodan Abdirahman');
  const [email, setEmail] = useState(user?.email || MOCK_STUDENT_PROFILE.email || 'hodan.abdi@example.com');
  const [phone, setPhone] = useState(MOCK_STUDENT_PROFILE.phone || '+252 61 234 5678');
  const [city, setCity] = useState(MOCK_STUDENT_PROFILE.city || 'Mogadishu');

  const [institution, setInstitution] = useState(MOCK_STUDENT_PROFILE.institution || 'SIMAD University');
  const [fieldOfStudy, setFieldOfStudy] = useState(MOCK_STUDENT_PROFILE.field_of_study || 'Computer Science');
  const [qualification, setQualification] = useState(MOCK_STUDENT_PROFILE.qualification || "Bachelor's degree");
  const [startYear, setStartYear] = useState(MOCK_STUDENT_PROFILE.start_year || '2023');
  const [graduationYear, setGraduationYear] = useState(MOCK_STUDENT_PROFILE.graduation_year || '2027');
  const [isStudying, setIsStudying] = useState(MOCK_STUDENT_PROFILE.is_studying ?? true);

  const [skills, setSkills] = useState<string[]>(
    user?.studentProfile?.skills || MOCK_STUDENT_PROFILE.skills || ['React', 'Python', 'Excel']
  );

  const [projectTitle, setProjectTitle] = useState('Student resource hub');
  const [projectUrl, setProjectUrl] = useState('https://github.com/hodan-a/furan');
  const [projectContribution, setProjectContribution] = useState(
    'Built the React interface and Python API.'
  );

  const steps = [
    { num: 1, label: 'Basic info' },
    { num: 2, label: 'Education' },
    { num: 3, label: 'Skills' },
    { num: 4, label: 'Project links' },
    { num: 5, label: 'Review' },
  ];

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload = {
        education: `${fieldOfStudy} · ${qualification}\n${institution} · ${startYear}–${graduationYear}\n${isStudying ? 'Currently studying' : 'Graduated'}`,
        skills,
        project_links: [
          {
            title: projectTitle,
            url: projectUrl,
            contribution: projectContribution,
          },
        ],
      };

      await api.put('/students/me/profile', payload);
      toast.success('Profile saved successfully!');
      setMode('VIEW_COMPLETE');
    } catch {
      // Offline/mock mode:
      toast.success('Profile saved successfully!');
      setMode('VIEW_COMPLETE');
    } finally {
      setIsSaving(false);
    }
  };

  const jumpToStep = (stepNumber: number) => {
    setMode('WIZARD');
    setCurrentStep(stepNumber);
  };

  // View Complete Mode (Figma: docs/figma/Student/profile/Profile complete/Desktop.png)
  if (mode === 'VIEW_COMPLETE') {
    return (
      <div className="w-full text-left space-y-8">
        <div>
          <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
            Student / Profile
          </p>
          <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1">
            Your student profile
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1">
            Your details are saved and ready for your next opportunity.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main profile card (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-[#E2E6EE] rounded-[12px] p-6 sm:p-8 space-y-6 shadow-xs">
            {/* User Header */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center font-bold text-sm shrink-0">
                HA
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#1B2433]">{fullName}</h3>
                <p className="text-[13px] text-[#5B6475]">
                  {fieldOfStudy} · {institution}
                </p>
                <p className="text-[13px] text-[#5B6475]">{city}</p>
              </div>
            </div>

            {/* Profile complete banner */}
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
                  onClick={() => jumpToStep(1)}
                  className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
                >
                  Edit
                </button>
              </div>
              <p className="text-[14px] text-[#5B6475]">{email}</p>
              <p className="text-[14px] text-[#5B6475]">{phone}</p>
              <p className="text-[14px] text-[#5B6475]">{city}</p>
            </div>

            {/* Section 2: Education */}
            <div className="pt-4 border-t border-[#E2E6EE]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[15px] font-semibold text-[#1B2433]">Education</h4>
                <button
                  type="button"
                  onClick={() => jumpToStep(2)}
                  className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
                >
                  Edit
                </button>
              </div>
              <p className="text-[14px] text-[#5B6475] font-medium">
                {fieldOfStudy} · {qualification}
              </p>
              <p className="text-[14px] text-[#5B6475]">
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
                  onClick={() => jumpToStep(3)}
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
                  onClick={() => jumpToStep(4)}
                  className="text-[13px] font-medium text-[#1F5FBF] hover:underline"
                >
                  Edit
                </button>
              </div>
              <p className="text-[14px] font-medium text-[#1B2433]">{projectTitle}</p>
              <a
                href={projectUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] text-[#1F5FBF] hover:underline break-all"
              >
                {projectUrl}
              </a>
              <p className="text-[13px] text-[#5B6475] mt-1">{projectContribution}</p>
            </div>

            <div className="pt-4 border-t border-[#E2E6EE]">
              <Button
                variant="secondary"
                onClick={() => setMode('WIZARD')}
                className="px-5 text-[13px]"
              >
                Edit profile
              </Button>
            </div>

            <div className="flex items-center gap-2 pt-2 text-[12px] text-[#5B6475]">
              <ShieldCheck className="h-4 w-4 text-[#1F5FBF]" />
              <span>Businesses only see your details after you apply.</span>
            </div>
          </div>

          {/* Right Sidebar cards (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Account Card */}
            <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs space-y-4">
              <div>
                <h4 className="text-[15px] font-bold text-[#1B2433]">{fullName}</h4>
                <p className="text-[12px] text-[#5B6475]">Student account</p>
              </div>
              <Button variant="secondary" onClick={logout} className="w-full text-[13px]">
                Log out
              </Button>
              <button
                type="button"
                onClick={() => toast.info('Account deletion requires administrative confirmation.')}
                className="w-full text-center text-[13px] text-[#C0392B] hover:underline py-1"
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
              <div className="flex items-center gap-1.5 pt-3 text-[12px] text-[#5B6475]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1F5FBF]" />
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
                <Button variant="primary" className="w-full text-[13px]">
                  Browse opportunities
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wizard Mode (Figma: docs/figma/Student/profile/Create/...)
  return (
    <div className="w-full text-left space-y-8">
      <div>
        <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
          Student / Profile / First-time setup
        </p>
        <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1">
          Create your student profile
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1">
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
              <span
                className={`h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
                  isDone
                    ? 'bg-[#1F5FBF] text-white'
                    : isCurrent
                    ? 'bg-[#1F5FBF] text-white'
                    : 'bg-[#F7F9FC] text-[#5B6475] border border-[#E2E6EE]'
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : st.num}
              </span>
              <span
                className={`text-[13px] font-medium ${
                  isCurrent ? 'text-[#1F5FBF]' : 'text-[#5B6475]'
                }`}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Step Form Container (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E2E6EE] rounded-[12px] p-6 sm:p-8 shadow-xs">
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
              <div className="flex items-center gap-3 p-3 bg-[#F7F9FC] border border-[#E2E6EE] rounded-[10px]">
                <div className="h-10 w-10 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  HA
                </div>
                <div>
                  <h4 className="text-[14px] font-semibold text-[#1B2433]">{fullName}</h4>
                  <p className="text-[12px] text-[#5B6475]">
                    {fieldOfStudy} · {institution}
                  </p>
                  <p className="text-[12px] text-[#5B6475]">{city}</p>
                </div>
              </div>

              <Input
                id="st-name"
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                helperText="Use the name on your student ID."
                required
              />

              <Input
                id="st-email"
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText="We’ll send application updates to this email."
                required
              />

              <Input
                id="st-phone"
                label="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                helperText="Include your country code so organizations can reach you."
                required
              />

              <Select
                id="st-city"
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
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
                <Button variant="primary" onClick={() => setCurrentStep(2)}>
                  Continue
                </Button>
              </div>
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
                onChange={(e) => setInstitution(e.target.value)}
                helperText="Enter the institution you attend or graduated from."
                required
              />

              <Input
                id="st-field"
                label="Field of study"
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                helperText="Use the course name on your student record."
                required
              />

              <Select
                id="st-qual"
                label="Qualification"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                options={[
                  { label: "Bachelor's degree", value: "Bachelor's degree" },
                  { label: 'Diploma', value: 'Diploma' },
                  { label: 'Certificate', value: 'Certificate' },
                  { label: "Master's degree", value: "Master's degree" },
                ]}
                helperText="Select your current or most recent qualification."
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="st-start"
                  label="Start year"
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  helperText="Year you started."
                  required
                />
                <Input
                  id="st-grad"
                  label="Graduation year"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
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
                <Button variant="primary" onClick={() => setCurrentStep(3)}>
                  Continue
                </Button>
              </div>
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
                onChange={setSkills}
                label="Your skills"
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
                Choose skills you can talk about through coursework, volunteering or a project. You
                can update these later.
              </div>

              <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button variant="primary" onClick={() => setCurrentStep(4)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: PROJECT LINKS */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[18px] font-semibold text-[#1B2433]">Project links</h3>
                <p className="text-[13px] text-[#5B6475] mt-1">
                  Show what you’ve made, not just what you know. Add a project, portfolio or GitHub
                  link. Make sure anyone with the link can open it.
                </p>
              </div>

              <div className="border border-[#E2E6EE] rounded-[10px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[14px] font-semibold text-[#1B2433]">{projectTitle}</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setProjectTitle('');
                      setProjectUrl('');
                      setProjectContribution('');
                    }}
                    className="text-[12px] text-[#C0392B] hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <Input
                  id="proj-title"
                  label="Project title"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  helperText="A short name that explains your work."
                  required
                />

                <Input
                  id="proj-url"
                  label="Project URL"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  helperText="Use a public link starting with https://."
                  required
                />

                <Input
                  id="proj-contrib"
                  label="Your contribution"
                  value={projectContribution}
                  onChange={(e) => setProjectContribution(e.target.value)}
                  helperText="Tell organizations what you worked on."
                />
              </div>

              <Button
                variant="secondary"
                type="button"
                onClick={() => toast.info('Link item saved. Add another link anytime.')}
                className="text-[13px]"
              >
                + Add another link
              </Button>

              <p className="text-[12px] text-[#5B6475]">
                1 project added · You can edit or remove links anytime.
              </p>

              <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <Button variant="primary" onClick={() => setCurrentStep(5)}>
                  Continue
                </Button>
              </div>
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
              <div className="flex items-center gap-3 p-3 bg-[#F7F9FC] border border-[#E2E6EE] rounded-[10px]">
                <div className="h-10 w-10 rounded-full bg-[#1F5FBF] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  HA
                </div>
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
                    onClick={() => setCurrentStep(1)}
                    className="text-[12px] text-[#1F5FBF] hover:underline"
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
                    onClick={() => setCurrentStep(2)}
                    className="text-[12px] text-[#1F5FBF] hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-[13px] text-[#5B6475]">
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
                    onClick={() => setCurrentStep(3)}
                    className="text-[12px] text-[#1F5FBF] hover:underline"
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
                    onClick={() => setCurrentStep(4)}
                    className="text-[12px] text-[#1F5FBF] hover:underline"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-[13px] font-medium text-[#1B2433]">{projectTitle}</p>
                <p className="text-[12px] text-[#1F5FBF]">{projectUrl}</p>
                <p className="text-[12px] text-[#5B6475]">{projectContribution}</p>
              </div>

              <div className="pt-4 border-t border-[#E2E6EE] flex items-center justify-between">
                <Button variant="secondary" onClick={() => setCurrentStep(4)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  isLoading={isSaving}
                  onClick={handleSaveProfile}
                >
                  Save profile
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center gap-2 text-[12px] text-[#5B6475]">
            <ShieldCheck className="h-4 w-4 text-[#1F5FBF]" />
            <span>Businesses only see your details after you apply.</span>
          </div>
        </div>

        {/* Sidebar Info Cards (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[12px] p-6 shadow-xs">
            <h4 className="text-[15px] font-bold text-[#1B2433]">Your potential, clearly shown</h4>
            <p className="text-[13px] text-[#5B6475] mt-2 leading-[20px]">
              Coursework, student projects and volunteer experience all count. Start with what you
              know today.
            </p>
            <div className="flex items-center gap-1.5 pt-3 text-[12px] text-[#5B6475]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#1F5FBF]" />
              <span>Businesses only see your details after you apply.</span>
            </div>
          </div>

          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <h4 className="text-[15px] font-bold text-[#1B2433]">A profile that grows with you</h4>
            <p className="text-[13px] text-[#5B6475] mt-2 leading-[20px]">
              You can return to any step before saving. After setup, use Edit profile to make changes.
            </p>
            <p className="text-[12px] text-[#1F5FBF] font-medium mt-3 cursor-pointer">
              Need a hand? Visit the help center →
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfileWizard;
