import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { fail, ok } from "../utils/apiResponse.js";

// GET /api/v1/admin/alumni/pending
// Lists all alumni profiles that are not verified yet
export async function listPendingAlumni(req: Request, res: Response) {
  try {
    const universityId = req.user?.universityId;
    const pendingAlumni = await prisma.alumniProfile.findMany({
      where: {
        verified: false,
        // Ensure they have uploaded a card to verify
        alumniCardUrl: { not: null },
        ...(universityId ? { universityId } : {})
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    const data = pendingAlumni.map((profile) => ({
      id: profile.id,
      userId: profile.userId,
      fullName: profile.user.fullName,
      email: profile.user.email,
      githubHandle: profile.user.githubHandle,
      graduationYear: profile.graduationYear,
      currentCompany: profile.currentCompany,
      currentRole: profile.currentRole,
      yearsExperience: profile.yearsExperience,
      willingToMentor: profile.willingToMentor,
      mentoringSkills: profile.mentoringSkills,
      linkedinUrl: profile.linkedinUrl,
      alumniCardUrl: profile.alumniCardUrl,
      createdAt: profile.createdAt
    }));

    ok(res, data);
  } catch (error) {
    console.error("[listPendingAlumni] Error:", error);
    fail(res, "SERVER_ERROR", "Internal server error", 500);
  }
}

// POST /api/v1/admin/alumni/:id/verify
// Approves (verified: true) or Rejects (deletes/resets card, verified: false)
export async function verifyAlumni(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { approve } = req.body as { approve?: boolean };

    if (approve === undefined) {
      fail(res, "INVALID_BODY", "approve boolean field is required", 400);
      return;
    }

    const profile = await prisma.alumniProfile.findUnique({
      where: { id }
    });

    if (!profile) {
      fail(res, "ALUMNI_PROFILE_NOT_FOUND", "Alumni profile not found", 404);
      return;
    }

    // Enforce university isolation for University Admins
    if (req.user?.universityId && profile.universityId !== req.user.universityId) {
      fail(res, "FORBIDDEN", "You can only manage users within your own university", 403);
      return;
    }

    if (approve) {
      const [updated] = await prisma.$transaction([
        prisma.alumniProfile.update({
          where: { id },
          data: {
            verified: true
          }
        }),
        prisma.user.update({
          where: { id: profile.userId },
          data: {
            isVerified: true
          }
        })
      ]);
      ok(res, updated);
    } else {
      // Rejection: reset verification status and delete/clear the card image
      const [updated] = await prisma.$transaction([
        prisma.alumniProfile.update({
          where: { id },
          data: {
            verified: false,
            alumniCardUrl: null
          }
        }),
        prisma.user.update({
          where: { id: profile.userId },
          data: {
            isVerified: false
          }
        })
      ]);
      ok(res, updated);
    }
  } catch (error) {
    console.error("[verifyAlumni] Error:", error);
    fail(res, "SERVER_ERROR", "Internal server error", 500);
  }
}