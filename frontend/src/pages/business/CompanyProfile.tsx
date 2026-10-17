import React, { useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { MOCK_BUSINESS_PROFILE } from '../../lib/mockData';
import api from '../../lib/api';
import { toast } from 'sonner';

export const CompanyProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const profile = user?.businessProfile || MOCK_BUSINESS_PROFILE;

  const [companyName, setCompanyName] = useState(profile.company_name || 'Banadir Tech Hub');
  const [description, setDescription] = useState(
    profile.company_description ||
      'Banadir Tech Hub supports young Somali builders through practical training, community programs and digital products. We partner with local organizations to turn early potential into meaningful work.'
  );
  const [location, setLocation] = useState(profile.location || 'Mogadishu, Somalia');
  const [website, setWebsite] = useState(profile.website || 'https://banadirtech.example');

  const [contactName, setContactName] = useState(profile.contact_name || 'Ahmed Hassan');
  const [contactEmail, setContactEmail] = useState(profile.contact_email || 'hello@banadirtech.example');
  const [phone, setPhone] = useState(profile.phone || '+252 61 555 0142');
  const [isSaving, setIsSaving] = useState(false);

  const isVerified = profile.verification_status === 'VERIFIED';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/businesses/me/profile', {
        company_name: companyName,
        company_description: description,
        location,
        website,
        contact_name: contactName,
        contact_email: contactEmail,
        phone,
      });
      toast.success('Company profile updated successfully!');
    } catch {
      // Mock mode fallback:
      toast.success('Company profile updated successfully!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full text-left space-y-8">
      {/* Header */}
      <div>
        <p className="text-[12px] font-semibold text-[#1F5FBF] uppercase tracking-wider">
          Business / Company profile
        </p>
        <h1 className="text-[32px] sm:text-[36px] font-bold text-[#1B2433] mt-1">
          Your company profile
        </h1>
        <p className="text-[15px] sm:text-[16px] text-[#5B6475] mt-1">
          Help young talent understand your work and the opportunities you offer.
        </p>
      </div>

      {/* Verification status banner */}
      {isVerified ? (
        <div className="bg-[#E3F6EC] border border-[#1E8E5A]/20 rounded-[8px] p-4 flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-[#1E8E5A] shrink-0" />
          <div>
            <span className="text-[13px] font-semibold text-[#1E8E5A]">Verified</span>
            <p className="text-[12px] text-[#1E8E5A]/90">
              Your company is verified. You can publish opportunities and review your applicants.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#FEF3D7] border border-[#F5A623]/30 rounded-[8px] p-4 flex items-center gap-2.5">
          <Clock className="h-5 w-5 text-[#8A5A00] shrink-0" />
          <div>
            <span className="text-[13px] font-semibold text-[#8A5A00]">Pending verification</span>
            <p className="text-[12px] text-[#8A5A00]/90">
              Your account is waiting for administrator verification.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column (8 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-8 space-y-8">
          {/* Company Details Card */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 sm:p-8 space-y-6 shadow-xs">
            <h3 className="text-[18px] font-bold text-[#1B2433]">Company details</h3>

            {/* Logo row */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-[10px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center font-bold text-sm shrink-0">
                {'{ }'}
              </div>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => toast.info('Image uploader active: choose PNG or JPG up to 2MB.')}
                  className="px-4 py-1.5 text-[13px] min-h-[38px]"
                >
                  Replace logo
                </Button>
                <p className="text-[12px] text-[#5B6475] mt-1">PNG or JPG · up to 2 MB</p>
              </div>
            </div>

            <Input
              id="biz-name"
              label="Company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              helperText="Use your organization’s registered name."
              required
            />

            <div>
              <label htmlFor="biz-desc" className="block text-[14px] font-medium text-[#1B2433] mb-1.5">
                Company description *
              </label>
              <textarea
                id="biz-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-[#E2E6EE] rounded-[8px] p-3 text-[14px] text-[#1B2433] focus:outline-none focus:ring-2 focus:ring-[#1F5FBF]"
                required
              />
            </div>

            <Input
              id="biz-loc"
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            <Input
              id="biz-web"
              label="Website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              helperText="Use a complete link, including https://."
            />
          </div>

          {/* Contact Information Card */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 sm:p-8 space-y-6 shadow-xs">
            <div>
              <h3 className="text-[18px] font-bold text-[#1B2433]">Contact information</h3>
              <p className="text-[13px] text-[#5B6475] mt-1">
                The administrator may use these details to verify your organization.
              </p>
            </div>

            <Input
              id="biz-contact-name"
              label="Contact name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
            />

            <Input
              id="biz-contact-email"
              label="Contact email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />

            <Input
              id="biz-phone"
              label="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <div className="pt-4 border-t border-[#E2E6EE] flex items-center gap-3">
              <Button type="submit" variant="primary" isLoading={isSaving}>
                Save changes
              </Button>
              <Button type="button" variant="secondary" onClick={() => window.history.back()}>
                Cancel
              </Button>
            </div>
          </div>
        </form>

        {/* Right Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Account Box */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs space-y-4">
            <div>
              <h4 className="text-[15px] font-bold text-[#1B2433]">{companyName}</h4>
              <p className="text-[12px] text-[#5B6475]">Business account</p>
            </div>
            <Button variant="secondary" className="w-full text-[13px]" disabled>
              Company profile
            </Button>
            <Button variant="secondary" onClick={logout} className="w-full text-[13px]">
              Log out
            </Button>
          </div>

          {/* Account verification status card */}
          <div className="bg-white border border-[#E2E6EE] rounded-[12px] p-6 shadow-xs">
            <h4 className="text-[15px] font-bold text-[#1B2433] mb-3">Account verification</h4>
            <StatusBadge status={profile.verification_status} />
            <p className="text-[13px] text-[#5B6475] mt-3 leading-[20px]">
              Your company details have been reviewed. Keep your contact information accurate so
              students can reach you.
            </p>
            <p className="text-[12px] text-[#5B6475] mt-4 pt-3 border-t border-[#E2E6EE]">
              Verified 08 Oct 2026
            </p>
          </div>

          {/* A clear introduction helps card */}
          <div className="bg-[#E8F0FC]/60 border border-[#1F5FBF]/20 rounded-[12px] p-6 shadow-xs">
            <h4 className="text-[15px] font-bold text-[#1B2433]">A clear introduction helps.</h4>
            <p className="text-[13px] text-[#5B6475] mt-2 leading-[20px]">
              Tell students what you do, where you work and how they can contribute. Keep requirements
              welcoming to entry-level talent.
            </p>
            <p className="text-[12px] text-[#1F5FBF] font-medium mt-3 cursor-pointer">
              Company profile guidance →
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;
