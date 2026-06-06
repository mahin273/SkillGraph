import crypto from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@skillgraph/database";
import { env } from "../config/env.js";
import { ok, fail } from "../utils/apiResponse.js";
import { encryptToken } from "../utils/crypto.js";
import { signAccessToken, signRefreshToken, verifyToken } from "../utils/jwt.js";
import { getRedis } from "../utils/redis.js";
import { sendVerificationEmail } from "../utils/email.js";

const scrypt = promisify(crypto.scrypt);

type GithubTokenResponse = {
  access_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GithubUser = {
  id: number;
  login: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type GoogleTokenResponse = {
  access_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GoogleUser = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function nanoid6(): string {
  return crypto.randomBytes(4).readUInt32BE(0).toString(36).padStart(6, "0").slice(-6);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "user";
}

function universityShortName(name: string) {
  const words = name.match(/[a-z0-9]+/gi) ?? [];
  const initials = words.map((word) => word[0]).join("").toUpperCase();
  return (initials || name.replace(/[^a-z0-9]/gi, "").toUpperCase() || "UNI").slice(0, 20);
}

function departmentCode(name: string) {
  const words = name.match(/[a-z0-9]+/gi) ?? [];
  const initials = words.map((word) => word[0]).join("").toUpperCase();
  return (initials || name.replace(/[^a-z0-9]/gi, "").toUpperCase() || "DEPT").slice(0, 10);
}

async function generateUniquePublicHandle(seed: string): Promise<string> {
  const base = slugify(seed);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base}-${nanoid6()}`;
    const existing = await prisma.studentProfile.findUnique({ where: { publicHandle: candidate } });
    if (!existing) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function ensureStudentProfile(userId: string, seed: string) {
  const existing = await prisma.studentProfile.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.studentProfile.create({
    data: {
      userId,
      publicHandle: await generateUniquePublicHandle(seed)
    }
  });
}

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("base64url")}`;
}

async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, stored] = passwordHash.split(":");
  if (algorithm !== "scrypt" || !salt || !stored) return false;

  const storedBuffer = Buffer.from(stored, "base64url");
  const derived = (await scrypt(password, salt, storedBuffer.length)) as Buffer;
  return storedBuffer.length === derived.length && crypto.timingSafeEqual(storedBuffer, derived);
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

function accessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    maxAge: 15 * 60 * 1000
  };
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

export function setAuthCookies(res: Response, user: { id: string; role: any; githubHandle?: string | null; universityId?: string | null; isVerified: boolean }) {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    githubHandle: user.githubHandle ?? undefined,
    universityId: user.universityId ?? undefined,
    isVerified: user.isVerified
  });
  const refreshToken = signRefreshToken({ sub: user.id });
  res.cookie("skillgraph_access", accessToken, accessCookieOptions());
  res.cookie("skillgraph_refresh", refreshToken, refreshCookieOptions());
}

function getAuthenticatedUserId(req: Request) {
  const cookieToken = req.cookies?.skillgraph_access as string | undefined;
  if (!cookieToken) return undefined;

  try {
    return verifyToken(cookieToken).sub;
  } catch {
    return undefined;
  }
}

async function publishIngestionJob(userId: string, githubHandle?: string | null) {
  if (!githubHandle) return;

  try {
    const redisClient = await getRedis();
    await redisClient.xAdd("ingestion:queue", "*", {
      userId,
      githubHandle,
      queuedAt: new Date().toISOString()
    });
  } catch (redisError) {
    console.error("Failed to publish ingestion job to Redis:", redisError);
  }
}

export function redirectToGithub(req: Request, res: Response) {
  if (!env.GITHUB_CLIENT_ID || env.GITHUB_CLIENT_ID === "replace-me") {
    fail(res, "GITHUB_OAUTH_NOT_CONFIGURED", "GitHub OAuth client id is not configured", 503);
    return;
  }

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL ?? "",
    scope: "read:user user:email public_repo",
    allow_signup: "true"
  });

  if (req.query.link === "1") params.set("state", "link");
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

export async function githubCallback(req: Request, res: Response) {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  if (!code) {
    fail(res, "MISSING_CODE", "GitHub callback did not include an OAuth code", 400);
    return;
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || env.GITHUB_CLIENT_SECRET === "replace-me") {
    fail(res, "GITHUB_OAUTH_NOT_CONFIGURED", "GitHub OAuth credentials are not configured", 503);
    return;
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL
    })
  });
  const tokenPayload = (await tokenResponse.json()) as GithubTokenResponse;

  if (!tokenResponse.ok || !tokenPayload.access_token) {
    fail(res, "GITHUB_TOKEN_EXCHANGE_FAILED", tokenPayload.error_description ?? "Could not exchange GitHub code", 502);
    return;
  }

  const githubUserResponse = await fetch("https://api.github.com/user", {
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${tokenPayload.access_token}`,
      "user-agent": "skillgraph-gateway"
    }
  });
  const githubUser = (await githubUserResponse.json()) as GithubUser;

  if (!githubUserResponse.ok) {
    fail(res, "GITHUB_PROFILE_FETCH_FAILED", "Could not fetch GitHub profile", 502);
    return;
  }

  const authenticatedUserId = getAuthenticatedUserId(req);
  const githubEmail = githubUser.email?.trim().toLowerCase();
  const existingGithubUser = await prisma.user.findUnique({
    where: { githubId: String(githubUser.id) },
    include: { studentProfile: true }
  });
  const existingEmailUser = githubEmail
    ? await prisma.user.findUnique({
        where: { email: githubEmail },
        include: { studentProfile: true }
      })
    : null;

  if (authenticatedUserId && existingGithubUser && existingGithubUser.id !== authenticatedUserId) {
    fail(res, "GITHUB_ALREADY_LINKED", "This GitHub account is already linked to another SkillGraph user", 409);
    return;
  }
  if (authenticatedUserId && existingEmailUser && existingEmailUser.id !== authenticatedUserId) {
    fail(res, "EMAIL_ALREADY_LINKED", "This GitHub email is already used by another SkillGraph user", 409);
    return;
  }

  let user;
  if (authenticatedUserId) {
    user = await prisma.user.update({
      where: { id: authenticatedUserId },
      data: {
        githubId: String(githubUser.id),
        githubHandle: githubUser.login,
        email: githubEmail,
        emailVerifiedAt: githubEmail ? new Date() : undefined,
        fullName: githubUser.name ?? githubUser.login,
        avatarUrl: githubUser.avatar_url
      },
      include: { studentProfile: true }
    });
  } else if (existingGithubUser) {
    user = await prisma.user.update({
      where: { id: existingGithubUser.id },
      data: {
        githubHandle: githubUser.login,
        email: githubEmail ?? existingGithubUser.email,
        emailVerifiedAt: githubEmail ? new Date() : existingGithubUser.emailVerifiedAt,
        fullName: githubUser.name ?? githubUser.login,
        avatarUrl: githubUser.avatar_url
      },
      include: { studentProfile: true }
    });
  } else if (existingEmailUser) {
    user = await prisma.user.update({
      where: { id: existingEmailUser.id },
      data: {
        githubId: String(githubUser.id),
        githubHandle: githubUser.login,
        emailVerifiedAt: new Date(),
        fullName: githubUser.name ?? existingEmailUser.fullName,
        avatarUrl: githubUser.avatar_url ?? existingEmailUser.avatarUrl
      },
      include: { studentProfile: true }
    });
  } else {
    user = await prisma.user.create({
      data: {
        githubId: String(githubUser.id),
        githubHandle: githubUser.login,
        email: githubEmail,
        emailVerifiedAt: githubEmail ? new Date() : undefined,
        fullName: githubUser.name ?? githubUser.login,
        avatarUrl: githubUser.avatar_url,
        studentProfile: { create: { publicHandle: await generateUniquePublicHandle(githubUser.login) } }
      },
      include: { studentProfile: true }
    });
  }

  if (user.role === "student" && !user.studentProfile) await ensureStudentProfile(user.id, user.githubHandle ?? user.email ?? user.fullName);

  const encryptedToken = encryptToken(tokenPayload.access_token);
  const existingConnection = await prisma.oauthConnection.findFirst({ where: { userId: user.id, provider: "github" } });
  if (existingConnection) {
    await prisma.oauthConnection.update({
      where: { id: existingConnection.id },
      data: { accessTokenEnc: encryptedToken, tokenScope: tokenPayload.scope, lastUsedAt: new Date() }
    });
  } else {
    await prisma.oauthConnection.create({
      data: { userId: user.id, provider: "github", accessTokenEnc: encryptedToken, tokenScope: tokenPayload.scope, lastUsedAt: new Date() }
    });
  }

  setAuthCookies(res, user);
  await publishIngestionJob(user.id, user.githubHandle);
  res.redirect(`${env.FRONTEND_URL}${authenticatedUserId ? "/settings" : "/dashboard"}`);
}

export function redirectToGoogle(_req: Request, res: Response) {
  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID === "replace-me") {
    fail(res, "GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth client id is not configured", 503);
    return;
  }

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL ?? "",
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account"
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function googleCallback(req: Request, res: Response) {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  if (!code) {
    fail(res, "MISSING_CODE", "Google callback did not include an OAuth code", 400);
    return;
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET === "replace-me") {
    fail(res, "GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth credentials are not configured", 503);
    return;
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: env.GOOGLE_CALLBACK_URL ?? ""
    })
  });
  const tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokenResponse.ok || !tokenPayload.access_token) {
    fail(res, "GOOGLE_TOKEN_EXCHANGE_FAILED", tokenPayload.error_description ?? "Could not exchange Google code", 502);
    return;
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${tokenPayload.access_token}` }
  });
  const googleUser = (await profileResponse.json()) as GoogleUser;

  if (!profileResponse.ok || !googleUser.email) {
    fail(res, "GOOGLE_PROFILE_FETCH_FAILED", "Could not fetch Google profile", 502);
    return;
  }

  const existingByGoogle = await prisma.user.findUnique({ where: { googleId: googleUser.sub }, include: { studentProfile: true } });
  const existingByEmail = await prisma.user.findUnique({ where: { email: googleUser.email }, include: { studentProfile: true } });
  const authenticatedUserId = getAuthenticatedUserId(req);
  const targetUser = authenticatedUserId
    ? await prisma.user.findUnique({ where: { id: authenticatedUserId }, include: { studentProfile: true } })
    : existingByGoogle ?? existingByEmail;

  let user;
  if (targetUser) {
    user = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        googleId: googleUser.sub,
        email: googleUser.email,
        emailVerifiedAt: googleUser.email_verified ? new Date() : targetUser.emailVerifiedAt,
        fullName: googleUser.name ?? targetUser.fullName,
        avatarUrl: googleUser.picture ?? targetUser.avatarUrl
      },
      include: { studentProfile: true }
    });
  } else {
    user = await prisma.user.create({
      data: {
        googleId: googleUser.sub,
        email: googleUser.email,
        emailVerifiedAt: googleUser.email_verified ? new Date() : undefined,
        fullName: googleUser.name ?? googleUser.email,
        avatarUrl: googleUser.picture,
        studentProfile: { create: { publicHandle: await generateUniquePublicHandle(googleUser.email) } }
      },
      include: { studentProfile: true }
    });
  }

  if (user.role === "student" && !user.studentProfile) await ensureStudentProfile(user.id, user.email ?? user.fullName);
  setAuthCookies(res, user);
  res.redirect(`${env.FRONTEND_URL}/dashboard`);
}

export async function registerWithEmail(req: Request, res: Response) {
  const { fullName, email, password, role, inviteToken } = req.body as {
    fullName?: string;
    email?: string;
    password?: string;
    role?: string;
    inviteToken?: string;
  };
  let targetEmail = email?.trim().toLowerCase();
  let targetRole = role;
  let targetUniversityId: string | undefined;

  if (inviteToken) {
    const invitation = await prisma.academicInvitation.findUnique({
      where: { token: inviteToken }
    });

    if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
      fail(res, "INVALID_INVITATION", "The invitation is invalid, accepted, or expired", 400);
      return;
    }

    targetEmail = invitation.email.trim().toLowerCase();
    targetRole = invitation.role;
    targetUniversityId = invitation.universityId;
  }

  if (!fullName?.trim() || !targetEmail || !password || password.length < 8) {
    fail(res, "INVALID_REGISTRATION", "Full name, valid email, and an 8+ character password are required", 400);
    return;
  }

  const validRole = (targetRole && ["student", "professor", "alumni"].includes(targetRole)) ? targetRole : "student";

  const existing = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (existing) {
    fail(res, "EMAIL_ALREADY_REGISTERED", "An account already exists for this email", 409);
    return;
  }

  const verificationToken = crypto.randomBytes(32).toString("base64url");

  const userData: any = {
    email: targetEmail,
    fullName: fullName.trim(),
    passwordHash: await hashPassword(password),
    emailVerificationTokenHash: hashToken(verificationToken),
    emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    role: validRole
  };

  if (targetUniversityId) {
    userData.universityId = targetUniversityId;
  }

  if (validRole === "alumni") {
    userData.isVerified = false;
    userData.alumniProfile = { 
      create: { 
        willingToMentor: true, 
        verified: false,
        universityId: targetUniversityId 
      } 
    };
  } else if (validRole === "professor") {
    userData.isVerified = false;
  } else if (validRole === "student") {
    userData.studentProfile = { 
      create: { 
        publicHandle: await generateUniquePublicHandle(targetEmail),
        universityId: targetUniversityId
      } 
    };
  }

  const user = await prisma.user.create({
    data: userData,
    include: { studentProfile: true, alumniProfile: true }
  });

  // Send verification email (fire-and-forget)
  if (user.email) {
    sendVerificationEmail(user.email, user.fullName, verificationToken).catch(() => {});
  }

  ok(res, {
    id: user.id,
    email: user.email,
    emailVerificationRequired: true,
    verificationToken: env.NODE_ENV === "production" ? undefined : verificationToken
  }, 201);
}

export async function verifyEmail(req: Request, res: Response) {
  const token = typeof req.query.token === "string" ? req.query.token : (req.body as { token?: string }).token;
  if (!token) {
    fail(res, "MISSING_TOKEN", "Email verification token is required", 400);
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiresAt: { gt: new Date() }
    }
  });

  if (!user) {
    fail(res, "INVALID_TOKEN", "Email verification token is invalid or expired", 400);
    return;
  }

  // Check for any pending academic invitation matching this email
  const invitation = await prisma.academicInvitation.findFirst({
    where: {
      email: user.email ?? "",
      status: "pending",
      expiresAt: { gt: new Date() }
    }
  });

  const updateData: any = {
    emailVerifiedAt: new Date(),
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null
  };

  if (invitation) {
    updateData.universityId = invitation.universityId;
    updateData.isVerified = true;
  }

  const verifiedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData
  });

  if (invitation) {
    // Mark invitation as accepted
    await prisma.academicInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted" }
    });

    // If the role is alumni, ensure their profile is also verified and linked to university
    if (user.role === "alumni") {
      await prisma.alumniProfile.updateMany({
        where: { userId: user.id },
        data: { verified: true, universityId: invitation.universityId }
      });
    }
  }

  setAuthCookies(res, verifiedUser);
  ok(res, { verified: true });
}

export async function loginWithEmail(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    fail(res, "INVALID_LOGIN", "Email and password are required", 400);
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    if (user) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_LOGIN_FAILED",
          entity: "User",
          entityId: user.id,
          metadata: { source: "email_login" },
          ipAddress: req.ip || "127.0.0.1"
        }
      });
    }
    fail(res, "INVALID_CREDENTIALS", "Email or password is incorrect", 401);
    return;
  }

  if (!user.emailVerifiedAt) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_LOGIN_FAILED",
        entity: "User",
        entityId: user.id,
        metadata: { source: "email_login", reason: "email_not_verified" },
        ipAddress: req.ip || "127.0.0.1"
      }
    });
    fail(res, "EMAIL_NOT_VERIFIED", "Please verify your email before signing in", 403);
    return;
  }

  setAuthCookies(res, user);
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "USER_LOGIN",
      entity: "User",
      entityId: user.id,
      metadata: { source: "email_login" },
      ipAddress: req.ip || "127.0.0.1"
    }
  });
  ok(res, { id: user.id, email: user.email, fullName: user.fullName });
}

export async function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      university: true,
      studentProfile: {
        include: {
          university: true,
          department: true
        }
      },
      alumniProfile: {
        include: {
          university: true
        }
      },
      oauthConnections: true
    }
  });
  if (!user) {
    fail(res, "USER_NOT_FOUND", "Authenticated user no longer exists", 404);
    return;
  }

  let academicProfilePayload = null;
  if (user.role === "student" && user.studentProfile) {
    academicProfilePayload = {
      universityId: user.studentProfile.universityId,
      universityName: user.studentProfile.university?.name ?? null,
      departmentId: user.studentProfile.departmentId,
      departmentName: user.studentProfile.department?.name ?? null,
      graduationYear: user.studentProfile.graduationYear
    };
  } else if (user.role === "alumni" && user.alumniProfile) {
    academicProfilePayload = {
      universityId: user.alumniProfile.universityId || user.universityId,
      universityName: user.alumniProfile.university?.name || user.university?.name || null,
      departmentId: null,
      departmentName: null,
      graduationYear: user.alumniProfile.graduationYear
    };
  } else if (user.role === "professor" || user.role === "admin") {
    academicProfilePayload = {
      universityId: user.universityId,
      universityName: user.university?.name ?? null,
      departmentId: null,
      departmentName: null,
      graduationYear: null
    };
  } else if (user.role === "superadmin") {
    academicProfilePayload = {
      universityId: null,
      universityName: null,
      departmentId: null,
      departmentName: null,
      graduationYear: null
    };
  }

  ok(res, {
    id: user.id,
    role: user.role,
    githubHandle: user.githubHandle,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    googleConnected: Boolean(user.googleId),
    githubConnected: Boolean(user.githubHandle || user.oauthConnections.some((connection) => connection.provider === "github")),
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    publicHandle: user.studentProfile?.publicHandle,
    isVerified: user.isVerified,
    academicProfile: academicProfilePayload
  });
}

export async function getAcademicOptions(_req: Request, res: Response) {
  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    include: {
      departments: {
        orderBy: { name: "asc" }
      }
    }
  });

  ok(res, {
    universities: universities.map((university) => ({
      id: university.id,
      name: university.name,
      shortName: university.shortName,
      country: university.country,
      departments: university.departments.map((department) => ({
        id: department.id,
        name: department.name,
        code: department.code
      }))
    }))
  });
}

export async function createUniversity(req: Request, res: Response) {
  const payload = z.object({
    name: z.string().trim().min(2).max(200),
    country: z.string().trim().min(2).max(100).nullable().optional()
  }).parse(req.body);

  const existingUniversity = await prisma.university.findFirst({
    where: {
      name: {
        equals: payload.name,
        mode: "insensitive"
      }
    },
    include: {
      departments: {
        orderBy: { name: "asc" }
      }
    }
  });

  const university = existingUniversity ?? await prisma.university.create({
    data: {
      name: payload.name,
      shortName: universityShortName(payload.name),
      country: payload.country ?? null
    },
    include: {
      departments: true
    }
  });

  ok(res, {
    id: university.id,
    name: university.name,
    shortName: university.shortName,
    country: university.country,
    departments: university.departments.map((department) => ({
      id: department.id,
      name: department.name,
      code: department.code
    })),
    created: !existingUniversity
  }, existingUniversity ? 200 : 201);
}

export async function createDepartment(req: Request, res: Response) {
  const payload = z.object({
    universityId: z.string().uuid(),
    name: z.string().trim().min(2).max(200),
    code: z.string().trim().min(1).max(10).nullable().optional()
  }).parse(req.body);

  const university = await prisma.university.findUnique({
    where: { id: payload.universityId }
  });
  if (!university) {
    fail(res, "UNIVERSITY_NOT_FOUND", "Selected university was not found", 404);
    return;
  }

  const existingDepartment = await prisma.department.findFirst({
    where: {
      universityId: payload.universityId,
      name: {
        equals: payload.name,
        mode: "insensitive"
      }
    }
  });

  const department = existingDepartment ?? await prisma.department.create({
    data: {
      universityId: payload.universityId,
      name: payload.name,
      code: (payload.code || departmentCode(payload.name)).toUpperCase()
    }
  });

  ok(res, {
    id: department.id,
    name: department.name,
    code: department.code,
    created: !existingDepartment
  }, existingDepartment ? 200 : 201);
}

export async function updateAcademicProfile(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const payload = z.object({
    universityId: z.string().uuid(),
    departmentId: z.string().uuid().nullable().optional(),
    graduationYear: z.number().int().min(2000).max(2100).nullable().optional()
  }).parse(req.body);

  const university = await prisma.university.findUnique({
    where: { id: payload.universityId }
  });
  if (!university) {
    fail(res, "UNIVERSITY_NOT_FOUND", "Selected university was not found", 404);
    return;
  }

  let department = null;
  if (payload.departmentId) {
    department = await prisma.department.findFirst({
      where: {
        id: payload.departmentId,
        universityId: payload.universityId
      }
    });
    if (!department) {
      fail(res, "DEPARTMENT_NOT_FOUND", "Selected department does not belong to this university", 400);
      return;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { alumniProfile: true }
  });
  if (!user) {
    fail(res, "USER_NOT_FOUND", "User not found", 404);
    return;
  }

  // 1. Block professor university updates if already configured
  if (req.user.role === "professor" && user.universityId && user.universityId !== payload.universityId) {
    fail(res, "PROHIBITED_UNIVERSITY_CHANGE", "Professors cannot shift universities directly in settings to protect academic and grading history. Please contact your new university administrator to issue an invitation, or register a new account.", 403);
    return;
  }

  // 2. Block alumni university updates if already configured
  if (req.user.role === "alumni" && user.alumniProfile?.universityId && user.alumniProfile.universityId !== payload.universityId) {
    fail(res, "PROHIBITED_UNIVERSITY_CHANGE", "Alumni cannot change their university once configured.", 403);
    return;
  }

  // 3. Determine isVerified based on role & allowedDomains
  let isVerified = true;
  if (req.user.role === "professor") {
    isVerified = false; // Always requires admin approval
  } else if (req.user.role === "student") {
    if (university.allowedDomains && university.allowedDomains.length > 0) {
      const emailDomain = user.email?.split("@")[1] || "";
      isVerified = university.allowedDomains.some(d => emailDomain.toLowerCase().endsWith(d.toLowerCase()));
    }
  } else if (req.user.role === "alumni") {
    isVerified = false; // Always requires admin approval
  }

  // Always update the User model's universityId and isVerified status
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: { 
      universityId: payload.universityId,
      isVerified
    }
  });

  // Re-sign access tokens so session details refresh immediately
  setAuthCookies(res, updatedUser);

  if (req.user.role === "student") {
    const profile = await ensureStudentProfile(req.user.id, req.user.githubHandle ?? req.user.id);
    const updatedProfile = await prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        universityId: payload.universityId,
        departmentId: payload.departmentId ?? null,
        graduationYear: payload.graduationYear ?? null
      },
      include: {
        university: true,
        department: true
      }
    });

    ok(res, {
      universityId: updatedProfile.universityId,
      universityName: updatedProfile.university?.name ?? null,
      departmentId: updatedProfile.departmentId,
      departmentName: updatedProfile.department?.name ?? null,
      graduationYear: updatedProfile.graduationYear
    });
    return;
  }

  if (req.user.role === "alumni") {
    const existing = await prisma.alumniProfile.findUnique({ where: { userId: req.user.id } });
    let alumniProfile;
    if (existing) {
      alumniProfile = await prisma.alumniProfile.update({
        where: { id: existing.id },
        data: {
          universityId: payload.universityId,
          graduationYear: payload.graduationYear ?? null,
          verified: false
        },
        include: { university: true }
      });
    } else {
      alumniProfile = await prisma.alumniProfile.create({
        data: {
          userId: req.user.id,
          willingToMentor: true,
          verified: false,
          universityId: payload.universityId,
          graduationYear: payload.graduationYear ?? null
        },
        include: { university: true }
      });
    }

    ok(res, {
      universityId: alumniProfile.universityId,
      universityName: alumniProfile.university?.name ?? null,
      departmentId: null,
      departmentName: null,
      graduationYear: alumniProfile.graduationYear
    });
    return;
  }

  // Else for professors/admins (only User record updated)
  ok(res, {
    universityId: university.id,
    universityName: university.name,
    departmentId: null,
    departmentName: null,
    graduationYear: null
  });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie("skillgraph_access", accessCookieOptions());
  res.clearCookie("skillgraph_refresh", refreshCookieOptions());
  ok(res, null);
}

export function getSocketToken(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }
  const socketToken = signAccessToken({
    sub: req.user.id,
    role: req.user.role,
    githubHandle: req.user.githubHandle,
    isVerified: req.user.isVerified
  });
  ok(res, { token: socketToken });
}

export async function updateUserRole(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { role } = req.body as { role?: string };
  if (!role || !["student", "professor", "alumni"].includes(role)) {
    fail(res, "INVALID_ROLE", "Role must be 'student', 'professor', or 'alumni'", 400);
    return;
  }

  try {
    const userId = req.user.id;

    // Check if the user already has the target profile, if not create it
    if (role === "student") {
      const existingStudent = await prisma.studentProfile.findUnique({ where: { userId } });
      if (!existingStudent) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const seed = user?.email ?? user?.fullName ?? "user";
        await prisma.studentProfile.create({
          data: {
            userId,
            publicHandle: await generateUniquePublicHandle(seed)
          }
        });
      }
    } else if (role === "alumni") {
      const existingAlumni = await prisma.alumniProfile.findUnique({ where: { userId } });
      if (!existingAlumni) {
        await prisma.alumniProfile.create({
          data: {
            userId,
            willingToMentor: true
          }
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role as any }
    });

    setAuthCookies(res, updatedUser);
    ok(res, { role: updatedUser.role });
  } catch (error) {
    console.error("Failed to update user role:", error);
    fail(res, "INTERNAL_ERROR", "Failed to update user role", 500);
  }
}

export async function getInvitationDetails(req: Request, res: Response) {
  const { token } = req.params;
  if (!token) {
    fail(res, "MISSING_TOKEN", "Invitation token is required", 400);
    return;
  }

  try {
    const invitation = await prisma.academicInvitation.findUnique({
      where: { token },
      include: { university: true }
    });

    if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
      fail(res, "INVALID_TOKEN", "Invitation token is invalid, already used, or expired", 400);
      return;
    }

    ok(res, {
      email: invitation.email,
      role: invitation.role,
      universityId: invitation.universityId,
      universityName: invitation.university.name
    });
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}