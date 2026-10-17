import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { OpportunityCard } from '../../components/ui/OpportunityCard';
import { MOCK_OPPORTUNITIES } from '../../lib/mockData';
import api from '../../lib/api';
import type { Opportunity } from '../../types';

export const Landing: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    api
      .get('/opportunities')
      .then((res) => {
        if (isMounted && res.data?.opportunities && res.data.opportunities.length > 0) {
          setOpportunities(res.data.opportunities.slice(0, 4));
        } else {
          setOpportunities(MOCK_OPPORTUNITIES.slice(0, 4));
        }
      })
      .catch(() => {
        if (isMounted) {
          setOpportunities(MOCK_OPPORTUNITIES.slice(0, 4));
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);


  const handleBookmarkToggle = (id: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full bg-white text-[#1B2433] overflow-x-clip">
      {/* 1. Hero Section */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            <span className="text-[12px] font-semibold tracking-wider text-[#1F5FBF] uppercase mb-3">
              Somali talent. Real possibilities.
            </span>
            <h1 className="text-[32px] sm:text-[36px] lg:text-[44px] font-bold text-[#1B2433] leading-[40px] sm:leading-[44px] lg:leading-[52px] tracking-tight">
              Your first opportunity starts here
            </h1>
            <p className="mt-4 text-[15px] sm:text-[17px] text-[#5B6475] leading-[24px] sm:leading-[26px] max-w-xl">
              Connecting Somali students with internships, jobs and competitions. Find the people who
              see what you can become.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <Link to="/opportunities" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full sm:w-auto px-6">
                  Find opportunities
                </Button>
              </Link>
              <Link to="/register?role=business" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto px-6">
                  Post an opportunity
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-[13px] text-[#5B6475]">A clearer first step, wherever you begin.</p>
          </div>

          {/* Right Hero Card */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-[#E8F0FC] rounded-[16px] p-6 sm:p-8 text-left flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-[#0F3166] uppercase">
                  Potential, meet possibility
                </span>
                <h2 className="mt-2 text-[22px] sm:text-[26px] font-bold text-[#0F3166] leading-[1.25]">
                  You bring the ambition. We open the door.
                </h2>
              </div>

              {/* Student avatar profile */}
              <div className="mt-7 flex items-center gap-3">
                <img
                  src="/images/hodan-avatar.png"
                  alt="Hodan Abdirahman"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover shrink-0"
                />
                <div>
                  <h4 className="text-[15px] font-semibold text-[#1B2433]">Hodan Abdirahman</h4>
                  <p className="text-[13px] text-[#5B6475]">Computer Science · SIMAD University</p>
                </div>
              </div>

              {/* Verified badge */}
              <div className="mt-6 pt-5 border-t border-[#1F5FBF]/15 flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E3F6EC] text-[#1E8E5A] text-[12px] font-medium shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1E8E5A]" />
                  Verified
                </span>
                <span className="text-[12px] sm:text-[13px] text-[#0F3166] font-medium leading-tight">
                  Real organizations. A clearer first step.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. How it works Section */}
      <section className="border-t border-[#E2E6EE] py-16 lg:py-20 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 text-left">
          <h2 className="text-[28px] font-bold text-[#1B2433]">How it works</h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="pt-4 border-t border-[#E2E6EE]">
              <span className="text-[13px] font-semibold text-[#1F5FBF]">01</span>
              <h3 className="mt-2 text-[18px] font-semibold text-[#1B2433]">Create profile</h3>
              <p className="mt-1.5 text-[14px] text-[#5B6475] leading-[22px]">
                Tell your story with your studies, skills and interests.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2E6EE]">
              <span className="text-[13px] font-semibold text-[#1F5FBF]">02</span>
              <h3 className="mt-2 text-[18px] font-semibold text-[#1B2433]">Apply</h3>
              <p className="mt-1.5 text-[14px] text-[#5B6475] leading-[22px]">
                Find your fit and apply to opportunities with your profile.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E2E6EE]">
              <span className="text-[13px] font-semibold text-[#1F5FBF]">03</span>
              <h3 className="mt-2 text-[18px] font-semibold text-[#1B2433]">Get hired</h3>
              <p className="mt-1.5 text-[14px] text-[#5B6475] leading-[22px]">
                Follow your applications and take your next step with an organization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured opportunities Section */}
      <section className="py-16 lg:py-24 bg-[#F7F9FC] border-y border-[#E2E6EE]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 text-left">
          <div className="mb-8">
            <h2 className="text-[28px] font-bold text-[#1B2433]">Featured opportunities</h2>
            <p className="mt-1.5 text-[15px] text-[#5B6475]">
              A few places to begin. Explore roles and challenges for young talent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {opportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                isBookmarked={bookmarkedIds.includes(opp.id)}
                onBookmarkToggle={handleBookmarkToggle}
              />
            ))}
          </div>

          <div className="mt-10">
            <Link to="/opportunities" className="w-full sm:w-auto inline-block">
              <Button variant="secondary" className="w-full sm:w-auto px-6">
                View all opportunities
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. For Businesses & Organizations */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <span className="text-[12px] font-semibold tracking-wider text-[#1F5FBF] uppercase">
                For businesses & organizations
              </span>
              <h2 className="mt-2 text-[28px] sm:text-[34px] font-bold text-[#1B2433] leading-tight">
                Give young talent a place to grow.
              </h2>
              <p className="mt-4 text-[15px] sm:text-[16px] text-[#5B6475] leading-[24px] max-w-lg">
                Bring fresh ideas into your team. Connect with Somali students who are ready to learn,
                contribute and build practical experience.
              </p>
              <div className="mt-8">
                <Link to="/register?role=business" className="w-full sm:w-auto inline-block">
                  <Button variant="secondary" className="w-full sm:w-auto px-6">
                    Post an opportunity
                  </Button>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-[12px] bg-[#F7F9FC] border border-[#E2E6EE]">
                <div className="h-10 w-10 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center shrink-0">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#1B2433]">New skills. Fresh perspectives.</h3>
                  <p className="mt-1 text-[13px] text-[#5B6475] leading-[20px]">
                    Find emerging talent with skills relevant to your team.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-[12px] bg-[#F7F9FC] border border-[#E2E6EE]">
                <div className="h-10 w-10 rounded-[8px] bg-[#E8F0FC] text-[#1F5FBF] flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[#1B2433]">Grow your next generation</h3>
                  <p className="mt-1 text-[13px] text-[#5B6475] leading-[20px]">
                    Create an internship or entry-level role and help potential become experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Statistics Section */}
      <section className="py-16 bg-[#F7F9FC] border-t border-[#E2E6EE]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 text-left">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-6 lg:col-span-5">
              <h2 className="text-[22px] font-bold text-[#1B2433] leading-snug">
                Potential is everywhere. Opportunity should be too.
              </h2>
              <p className="mt-2 text-[14px] text-[#5B6475]">The gap facing young people in Somalia.</p>
            </div>

            <div className="md:col-span-3 lg:col-span-3">
              <p className="text-[36px] font-bold text-[#0F3166] leading-none">~500,000</p>
              <p className="mt-2 text-[14px] text-[#5B6475] leading-snug">
                young Somalis enter the job market yearly
              </p>
            </div>

            <div className="md:col-span-3 lg:col-span-4">
              <p className="text-[36px] font-bold text-[#0F3166] leading-none">~80,000</p>
              <p className="mt-2 text-[14px] text-[#5B6475] leading-snug">jobs are created yearly</p>
            </div>
          </div>

          <p className="mt-10 text-[12px] text-[#5B6475] border-t border-[#E2E6EE] pt-4">
            Source: World Bank · Approximate figures, not Furan performance metrics.
          </p>
        </div>
      </section>

      {/* 6. Call To Action Banner */}
      <section className="py-16 lg:py-20 bg-[#E8F0FC]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 text-left">
          <h2 className="text-[28px] sm:text-[34px] font-bold text-[#0F3166]">
            Take your first step with Furan.
          </h2>
          <p className="mt-2 text-[15px] sm:text-[16px] text-[#0F3166]">
            Find your next opportunity or help someone find theirs.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link to="/register?role=student">
              <Button variant="primary" className="w-full sm:w-auto px-6">
                Sign up as Student
              </Button>
            </Link>
            <Link to="/register?role=business">
              <Button
                variant="secondary"
                className="w-full sm:w-auto px-6 bg-white hover:bg-white/90 border-[#1F5FBF]/20 text-[#1F5FBF]"
              >
                Sign up as Business
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
