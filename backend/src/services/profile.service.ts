import {
  Prisma,
  StudentProfile,
  BusinessProfile,
  VerificationStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import {
  UpdateStudentProfileInput,
  UpdateBusinessProfileInput,
} from "../validations/profile.validation";

export interface SafeStudentProfile {
  id: string;
  user_id: string;
  education: string | null;
  skills: unknown;
  project_links: unknown;
}

export interface SafeBusinessProfile {
  id: string;
  user_id: string;
  company_name: string;
  verification_status: VerificationStatus;
}

export const formatStudentProfile = (
  profile: StudentProfile
): SafeStudentProfile => {
  return {
    id: profile.id,
    user_id: profile.user_id,
    education: profile.education,
    skills: profile.skills,
    project_links: profile.project_links,
  };
};

export const formatBusinessProfile = (
  profile: BusinessProfile
): SafeBusinessProfile => {
  return {
    id: profile.id,
    user_id: profile.user_id,
    company_name: profile.company_name,
    verification_status: profile.verification_status,
  };
};

export const getStudentProfileByUserId = async (
  userId: string
): Promise<SafeStudentProfile> => {
  const profile = await prisma.studentProfile.findUnique({
    where: { user_id: userId },
  });

  if (!profile) {
    throw new AppError("Student profile not found", 404);
  }

  return formatStudentProfile(profile);
};

export const upsertStudentProfileByUserId = async (
  userId: string,
  input: UpdateStudentProfileInput
): Promise<SafeStudentProfile> => {
  const existing = await prisma.studentProfile.findUnique({
    where: { user_id: userId },
  });

  if (existing) {
    const updateData: Prisma.StudentProfileUpdateInput = {};

    if (input.education !== undefined) {
      updateData.education = input.education;
    }

    if (input.skills !== undefined) {
      updateData.skills =
        input.skills === null
          ? Prisma.DbNull
          : (input.skills as Prisma.InputJsonValue);
    }

    if (input.project_links !== undefined) {
      updateData.project_links =
        input.project_links === null
          ? Prisma.DbNull
          : (input.project_links as Prisma.InputJsonValue);
    }

    const updated = await prisma.studentProfile.update({
      where: { user_id: userId },
      data: updateData,
    });

    return formatStudentProfile(updated);
  } else {
    const created = await prisma.studentProfile.create({
      data: {
        user: { connect: { id: userId } },
        education: input.education ?? null,
        skills:
          input.skills === null || input.skills === undefined
            ? Prisma.DbNull
            : (input.skills as Prisma.InputJsonValue),
        project_links:
          input.project_links === null || input.project_links === undefined
            ? Prisma.DbNull
            : (input.project_links as Prisma.InputJsonValue),
      },
    });

    return formatStudentProfile(created);
  }
};

export const getBusinessProfileByUserId = async (
  userId: string
): Promise<SafeBusinessProfile> => {
  const profile = await prisma.businessProfile.findUnique({
    where: { user_id: userId },
  });

  if (!profile) {
    throw new AppError("Business profile not found", 404);
  }

  return formatBusinessProfile(profile);
};

export const upsertBusinessProfileByUserId = async (
  userId: string,
  input: UpdateBusinessProfileInput
): Promise<SafeBusinessProfile> => {
  const existing = await prisma.businessProfile.findUnique({
    where: { user_id: userId },
  });

  if (existing) {
    const updated = await prisma.businessProfile.update({
      where: { user_id: userId },
      data: {
        company_name: input.company_name,
      },
    });

    return formatBusinessProfile(updated);
  } else {
    const created = await prisma.businessProfile.create({
      data: {
        user: { connect: { id: userId } },
        company_name: input.company_name,
        verification_status: VerificationStatus.PENDING,
      },
    });

    return formatBusinessProfile(created);
  }
};
