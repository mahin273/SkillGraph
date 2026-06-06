import type { Request, Response } from "express";
import crypto from "node:crypto";
import { prisma } from "@skillgraph/database";
import { ok, fail } from "../utils/apiResponse.js";
import { getRedis } from "../utils/redis.js";
import { sendInvitationEmail, sendApprovalEmail } from "../utils/email.js";

// In-memory global configuration settings for demo purposes
export let globalConfig = {
  skillDecayRate: 0.15,
  scanCooldownHours: 1,
  sessionDurationSeconds: 900,
  isMaintenanceMode: false,
  isIngestionDisabled: false,
  isNlpThrottled: false
};

// 1. User Directory & Moderation (Admin only)
export async function listUsers(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const universityId = req.user?.universityId;
    const where: any = {};
    if (universityId) {
      where.universityId = universityId;
    }

    if (req.query.isVerified !== undefined) {
      where.isVerified = req.query.isVerified === "true";
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
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
          university: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    ok(res, {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}


export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { role, isActive, isVerified } = req.body as { role?: string; isActive?: boolean; isVerified?: boolean };

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      fail(res, "USER_NOT_FOUND", "User not found", 404);
      return;
    }

    // Enforce university isolation for University Admins
    if (req.user?.universityId && user.universityId !== req.user.universityId) {
      fail(res, "FORBIDDEN", "You can only manage users within your own university", 403);
      return;
    }

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { university: true }
    });

    // Send approval email if user was just verified
    if (isVerified === true && !user.isVerified) {
      const universityName = updatedUser.university?.name || "your university";
      if (updatedUser.email) {
        sendApprovalEmail(updatedUser.email, updatedUser.fullName, universityName).catch(() => {});
      }
    }

    // Automatically manage profiles if the role changes
    if (role !== undefined && role !== user.role) {
      if (role === "student") {
        const existing = await prisma.studentProfile.findUnique({ where: { userId: id } });
        if (!existing) {
          await prisma.studentProfile.create({
            data: {
              userId: id,
              publicHandle: `${user.email?.split("@")[0] || "student"}-${Date.now().toString(36)}`
            }
          });
        }
      } else if (role === "alumni") {
        const existing = await prisma.alumniProfile.findUnique({ where: { userId: id } });
        if (!existing) {
          await prisma.alumniProfile.create({
            data: {
              userId: id,
              willingToMentor: true,
              verified: isVerified ?? true
            }
          });
        }
      }
    }

    // Auto-update AlumniProfile verified state if isVerified is updated
    if (isVerified !== undefined && updatedUser.role === "alumni") {
      await prisma.alumniProfile.updateMany({
        where: { userId: id },
        data: { verified: isVerified }
      });
    }

    ok(res, updatedUser);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

// 2. Audit Log Explorer (Admin only)
export async function listAuditLogs(req: Request, res: Response) {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    ok(res, logs);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

// 3. System Configuration (Admin only)
export async function getConfig(req: Request, res: Response) {
  ok(res, globalConfig);
}

export async function updateConfig(req: Request, res: Response) {
  const {
    skillDecayRate,
    scanCooldownHours,
    sessionDurationSeconds,
    isMaintenanceMode,
    isIngestionDisabled,
    isNlpThrottled
  } = req.body as {
    skillDecayRate?: number;
    scanCooldownHours?: number;
    sessionDurationSeconds?: number;
    isMaintenanceMode?: boolean;
    isIngestionDisabled?: boolean;
    isNlpThrottled?: boolean;
  };

  if (skillDecayRate !== undefined) globalConfig.skillDecayRate = skillDecayRate;
  if (scanCooldownHours !== undefined) globalConfig.scanCooldownHours = scanCooldownHours;
  if (sessionDurationSeconds !== undefined) globalConfig.sessionDurationSeconds = sessionDurationSeconds;
  if (isMaintenanceMode !== undefined) globalConfig.isMaintenanceMode = isMaintenanceMode;
  if (isIngestionDisabled !== undefined) globalConfig.isIngestionDisabled = isIngestionDisabled;
  if (isNlpThrottled !== undefined) globalConfig.isNlpThrottled = isNlpThrottled;

  ok(res, globalConfig);
}

// 4. Department Student Directory (Professor/Admin)
export async function listStudents(req: Request, res: Response) {
  try {
    const universityId = req.user?.universityId;
    const where: any = { role: "student" };
    if (universityId) {
      where.universityId = universityId;
    }
    const students = await prisma.user.findMany({
      where,
      include: {
        studentProfile: {
          include: {
            department: true,
            university: true,
            learningPaths: {
              include: {
                role: true
              }
            }
          }
        }
      },
      orderBy: { fullName: "asc" }
    });
    ok(res, students);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

// 5. Course Mapping Editor (Professor/Admin)
export async function listCourses(req: Request, res: Response) {
  try {
    const universityId = req.user?.universityId;
    const where: any = { isUniversityApproved: true };
    if (universityId) {
      where.universityId = universityId;
    }
    const courses = await prisma.learningResource.findMany({
      where,
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      },
      orderBy: { courseCode: "asc" }
    });
    ok(res, courses);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function mapCourse(req: Request, res: Response) {
  const { title, url, courseCode, skills } = req.body as {
    title: string;
    url: string;
    courseCode: string;
    skills: string[]; // skill IDs
  };

  if (!title || !url || !courseCode) {
    fail(res, "MISSING_FIELDS", "Title, url, and courseCode are required", 400);
    return;
  }

  try {
    const universityId = req.user?.universityId;
    const course = await prisma.learningResource.upsert({
      where: { url },
      update: {
        title,
        courseCode,
        isUniversityApproved: true,
        type: "UNIVERSITY_COURSE",
        universityId: universityId ?? undefined
      },
      create: {
        title,
        url,
        courseCode,
        isUniversityApproved: true,
        type: "UNIVERSITY_COURSE",
        universityId: universityId ?? undefined
      }
    });

    // Clean old resource skill links
    await prisma.resourceSkill.deleteMany({
      where: { resourceId: course.id }
    });

    // Add new skill links
    if (skills && skills.length > 0) {
      for (const skillId of skills) {
        await prisma.resourceSkill.create({
          data: {
            resourceId: course.id,
            skillId
          }
        });
      }
    }

    const fullCourse = await prisma.learningResource.findUnique({
      where: { id: course.id },
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      }
    });

    ok(res, fullCourse);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

// 6. Capstone Advising Explorer (Professor/Admin)
export async function listCapstoneMatches(req: Request, res: Response) {
  try {
    const universityId = req.user?.universityId;
    const where = universityId ? { requester: { universityId } } : {};

    const matches = await prisma.teamRequest.findMany({
      where,
      include: {
        project: {
          include: {
            owner: true
          }
        },
        requester: true,
        matches: {
          include: {
            user: {
              include: {
                studentProfile: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    ok(res, matches);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function listAllSkills(req: Request, res: Response) {
  try {
    const skills = await prisma.skill.findMany({
      include: {
        category: true
      },
      orderBy: { name: "asc" }
    });

    const data = skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      category: skill.category?.name ?? "Uncategorized"
    }));

    ok(res, data);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function getKpiStats(req: Request, res: Response) {
  try {
    const universityId = req.user?.universityId;

    const userWhere: any = {};
    const oauthWhere: any = { provider: "github" };
    const alumniWhere: any = { verified: false };

    if (universityId) {
      userWhere.universityId = universityId;
      oauthWhere.user = { universityId };
      alumniWhere.universityId = universityId;
    }

    const [totalUsers, githubConnections, totalRoles, pendingAlumni] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.oauthConnection.count({ where: oauthWhere }),
      prisma.industryRole.count(),
      prisma.alumniProfile.count({ where: alumniWhere })
    ]);

    const connectionRate = totalUsers > 0 ? Math.round((githubConnections / totalUsers) * 100) : 0;

    let universityLeaderboard: any[] = [];
    if (!universityId) {
      const statsByUni = await prisma.university.findMany({
        select: {
          id: true,
          name: true,
          shortName: true,
          _count: {
            select: {
              users: true,
              studentProfiles: true,
              alumniProfiles: true
            }
          }
        }
      });
      universityLeaderboard = statsByUni.map(u => ({
        id: u.id,
        name: u.name,
        shortName: u.shortName,
        totalUsers: u._count.users,
        studentsCount: u._count.studentProfiles,
        alumniCount: u._count.alumniProfiles
      })).sort((a, b) => b.totalUsers - a.totalUsers).slice(0, 5);
    }

    ok(res, {
      totalUsers,
      githubConnections,
      connectionRate,
      totalRoles,
      pendingAlumni,
      universityLeaderboard
    });
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function listAllJobs(req: Request, res: Response) {
  try {
    const redis = await getRedis();
    const keys = await redis.keys("ingestion:status:*");
    const jobs: any[] = [];

    for (const key of keys) {
      const statusData = await redis.hGetAll(key);
      if (statusData && Object.keys(statusData).length > 0) {
        const userId = key.split(":").pop();
        jobs.push({
          userId,
          status: statusData.status,
          jobId: statusData.jobId,
          queuedAt: statusData.queuedAt,
          startedAt: statusData.startedAt,
          completedAt: statusData.completedAt,
          repositoryCount: statusData.repositoryCount ? parseInt(statusData.repositoryCount, 10) : undefined,
          skillsFound: statusData.skillsFound ? parseInt(statusData.skillsFound, 10) : undefined,
          error: statusData.error
        });
      }
    }

    ok(res, jobs);
  } catch (error: any) {
    fail(res, "REDIS_ERROR", error.message, 500);
  }
}

export async function listGithubConnections(req: Request, res: Response) {
  try {
    const connections = await prisma.oauthConnection.findMany({
      where: { provider: "github" },
      include: {
        user: true
      },
      orderBy: { createdAt: "desc" }
    });

    const data = connections.map((conn) => ({
      id: conn.id,
      userId: conn.userId,
      fullName: conn.user.fullName,
      email: conn.user.email,
      provider: conn.provider,
      createdAt: conn.createdAt,
      lastUsedAt: conn.lastUsedAt
    }));

    ok(res, data);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function listCategories(req: Request, res: Response) {
  try {
    const categories = await prisma.skillCategory.findMany({
      orderBy: { name: "asc" }
    });
    ok(res, categories);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function createCategory(req: Request, res: Response) {
  const { name } = req.body as { name?: string };
  if (!name) {
    fail(res, "INVALID_BODY", "Category name is required", 400);
    return;
  }
  try {
    const category = await prisma.skillCategory.create({
      data: { name }
    });
    ok(res, category, 201);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function createSkill(req: Request, res: Response) {
  const { name, categoryId, aliases } = req.body as { name?: string; categoryId?: string; aliases?: string[] };
  if (!name) {
    fail(res, "INVALID_BODY", "Skill name is required", 400);
    return;
  }
  try {
    const skill = await prisma.skill.create({
      data: {
        name,
        categoryId: categoryId || null,
        aliases: aliases || []
      },
      include: { category: true }
    });
    ok(res, skill, 201);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function updateSkill(req: Request, res: Response) {
  const { id } = req.params;
  const { name, categoryId, aliases } = req.body as { name?: string; categoryId?: string; aliases?: string[] };
  try {
    const skill = await prisma.skill.update({
      where: { id },
      data: {
        name,
        categoryId: categoryId || null,
        aliases: aliases || []
      },
      include: { category: true }
    });
    ok(res, skill);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function deleteSkill(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await prisma.skill.delete({ where: { id } });
    ok(res, { deleted: true });
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function exportAuditLogsCsv(req: Request, res: Response) {
  try {
    const { action, entity, search } = req.query as { action?: string; entity?: string; search?: string };
    
    const where: any = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } }
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });

    let csv = "ID,User Name,User Email,Action,Entity,IP Address,Created At\n";
    for (const log of logs) {
      const id = log.id;
      const name = log.user?.fullName ? `"${log.user.fullName.replace(/"/g, '""')}"` : "System";
      const email = log.user?.email || "N/A";
      const actionStr = `"${log.action.replace(/"/g, '""')}"`;
      const entityStr = log.entity ? `"${log.entity.replace(/"/g, '""')}"` : "N/A";
      const ip = log.ipAddress || "N/A";
      const date = log.createdAt.toISOString();
      csv += `${id},${name},${email},${actionStr},${entityStr},${ip},${date}\n`;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=audit_logs.csv");
    res.status(200).send(csv);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function extractSyllabusSkills(req: Request, res: Response) {
  try {
    const { text } = req.body as { text?: string };
    if (!text) {
      fail(res, "INVALID_BODY", "Text is required", 400);
      return;
    }
    
    const nlpUrl = process.env.NLP_SERVICE_URL || "http://nlp-service:8001";
    const response = await fetch(`${nlpUrl}/api/v1/nlp/extract/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      fail(res, "NLP_SERVICE_ERROR", `NLP extraction request failed: ${errorText}`, 502);
      return;
    }
    
    const data = (await response.json()) as { success: boolean; data: any[] };
    ok(res, data.data);
  } catch (error: any) {
    fail(res, "API_ERROR", error.message, 500);
  }
}

export async function listAlumni(req: Request, res: Response) {
  try {
    const universityId = req.user?.universityId;
    const where: any = { verified: true };
    if (universityId) {
      where.universityId = universityId;
    }
    const alumni = await prisma.alumniProfile.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });
    
    const data = alumni.map((al) => ({
      id: al.id,
      userId: al.userId,
      name: al.user.fullName,
      email: al.user.email,
      githubHandle: al.user.githubHandle,
      currentCompany: al.currentCompany,
      currentRole: al.currentRole,
      graduationYear: al.graduationYear,
      mentoringSkills: al.mentoringSkills || []
    }));
    
    ok(res, data);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function createInvitation(req: Request, res: Response) {
  const { email, role, universityId } = req.body as { email?: string; role?: string; universityId?: string };
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !role || !["professor", "alumni"].includes(role)) {
    fail(res, "INVALID_INPUT", "Valid email and role ('professor' or 'alumni') are required", 400);
    return;
  }

  // Force universityId to match local admin's scope if they are a University Admin
  let targetUniversityId = universityId;
  if (req.user?.universityId) {
    targetUniversityId = req.user.universityId;
  }

  if (!targetUniversityId) {
    fail(res, "UNIVERSITY_REQUIRED", "University ID is required", 400);
    return;
  }

  try {
    const university = await prisma.university.findUnique({ where: { id: targetUniversityId } });
    if (!university) {
      fail(res, "UNIVERSITY_NOT_FOUND", "Selected university not found", 404);
      return;
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.academicInvitation.create({
      data: {
        email: normalizedEmail,
        role: role as any,
        universityId: targetUniversityId,
        token,
        expiresAt
      }
    });

    // Send invitation email (fire-and-forget)
    sendInvitationEmail(
      normalizedEmail,
      role,
      university.name,
      token,
      req.user?.id ? undefined : undefined
    ).catch(() => {});

    ok(res, {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      universityId: invitation.universityId,
      token,
      expiresAt
    }, 201);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

// 8. Super Admin University & Platform Management
export async function listUniversities(req: Request, res: Response) {
  try {
    const universities = await prisma.university.findMany({
      include: {
        _count: {
          select: {
            users: true,
            studentProfiles: true,
            alumniProfiles: true
          }
        }
      },
      orderBy: { name: "asc" }
    });
    ok(res, { universities });
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function createUniversity(req: Request, res: Response) {
  const { name, shortName, country, allowedDomains } = req.body as {
    name?: string;
    shortName?: string;
    country?: string;
    allowedDomains?: string[];
  };

  if (!name || !shortName) {
    fail(res, "INVALID_INPUT", "Name and Short Name are required", 400);
    return;
  }

  try {
    const existing = await prisma.university.findFirst({
      where: {
        OR: [
          { name },
          { shortName }
        ]
      }
    });

    if (existing) {
      fail(res, "UNIVERSITY_EXISTS", "University with this name or short name already exists", 400);
      return;
    }

    const university = await prisma.university.create({
      data: {
        name,
        shortName,
        country: country || "Bangladesh",
        allowedDomains: allowedDomains || []
      }
    });

    // Automatically seed standard departments
    const defaultDepts = [
      { name: "Computer Science and Engineering", code: "CSE" },
      { name: "Software Engineering", code: "SWE" },
      { name: "Electrical and Electronic Engineering", code: "EEE" },
      { name: "Business Administration", code: "BBA" }
    ];

    await prisma.department.createMany({
      data: defaultDepts.map(d => ({
        name: d.name,
        code: d.code,
        universityId: university.id
      }))
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "UNIVERSITY_CREATE",
        entity: "University",
        entityId: university.id,
        metadata: { name, shortName },
        ipAddress: req.ip || "127.0.0.1"
      }
    });

    ok(res, { university }, 201);
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function updateUniversity(req: Request, res: Response) {
  const { id } = req.params;
  const { name, shortName, country, allowedDomains } = req.body as {
    name?: string;
    shortName?: string;
    country?: string;
    allowedDomains?: string[];
  };

  try {
    const university = await prisma.university.findUnique({ where: { id } });
    if (!university) {
      fail(res, "UNIVERSITY_NOT_FOUND", "University not found", 404);
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (shortName !== undefined) updateData.shortName = shortName;
    if (country !== undefined) updateData.country = country;
    if (allowedDomains !== undefined) updateData.allowedDomains = allowedDomains;

    const updated = await prisma.university.update({
      where: { id },
      data: updateData
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "UNIVERSITY_UPDATE",
        entity: "University",
        entityId: id,
        metadata: updateData,
        ipAddress: req.ip || "127.0.0.1"
      }
    });

    ok(res, { university: updated });
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function getSystemHealth(req: Request, res: Response) {
  try {
    // 1. PostgreSQL ping
    let dbStatus = "unhealthy";
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "healthy";
    } catch (e) {}

    // 2. Redis ping
    let redisStatus = "unhealthy";
    try {
      const redis = await getRedis();
      await redis.ping();
      redisStatus = "healthy";
    } catch (e) {}

    // 3. PostgreSQL Database storage size
    let dbSize = "Unknown";
    try {
      const result: any[] = await prisma.$queryRawUnsafe("SELECT pg_size_pretty(pg_database_size('skillgraph')) as size;");
      dbSize = result[0]?.size || "Unknown";
    } catch (e) {}

    // 4. Graph Service ping
    let graphStatus = "unhealthy";
    const graphUrl = process.env.GRAPH_SERVICE_URL || "http://graph-service:3001";
    try {
      const res = await fetch(`${graphUrl.replace("localhost", "graph-service")}/health`);
      if (res.ok) graphStatus = "healthy";
    } catch (e) {
      try {
        const res = await fetch(`${graphUrl}/health`);
        if (res.ok) graphStatus = "healthy";
      } catch (e2) {}
    }

    // 5. NLP Service ping
    let nlpStatus = "unhealthy";
    const nlpUrl = process.env.NLP_SERVICE_URL || "http://nlp-service:8001";
    try {
      const res = await fetch(`${nlpUrl.replace("localhost", "nlp-service")}/health`);
      if (res.ok) nlpStatus = "healthy";
    } catch (e) {
      try {
        const res = await fetch(`${nlpUrl}/health`);
        if (res.ok) nlpStatus = "healthy";
      } catch (e2) {}
    }

    // 6. Notification Service ping
    let notificationStatus = "unhealthy";
    const notifUrl = process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:3002";
    try {
      const res = await fetch(`${notifUrl}/health`);
      if (res.ok) notificationStatus = "healthy";
    } catch (e) {
      try {
        const res = await fetch("http://localhost:3002/health");
        if (res.ok) notificationStatus = "healthy";
      } catch (e2) {}
    }

    ok(res, {
      services: {
        gateway: "healthy",
        postgres: dbStatus,
        redis: redisStatus,
        graphService: graphStatus,
        nlpService: nlpStatus,
        notificationService: notificationStatus
      },
      metrics: {
        databaseSize: dbSize
      }
    });
  } catch (error: any) {
    fail(res, "HEALTH_CHECK_ERROR", error.message, 500);
  }
}

export async function getSecurityThreats(req: Request, res: Response) {
  try {
    const [loginSuccess, loginFailed, configUpdates, recentFailures] = await Promise.all([
      prisma.auditLog.count({ where: { action: "USER_LOGIN" } }),
      prisma.auditLog.count({ where: { action: "USER_LOGIN_FAILED" } }),
      prisma.auditLog.count({ where: { action: "CONFIG_UPDATE" } }),
      prisma.auditLog.findMany({
        where: { action: "USER_LOGIN_FAILED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: {
            select: {
              email: true,
              fullName: true
            }
          }
        }
      })
    ]);

    ok(res, {
      threatMetrics: {
        loginSuccess,
        loginFailed,
        configUpdates,
        activeThreatLevel: loginFailed > 20 ? "HIGH" : loginFailed > 5 ? "MEDIUM" : "LOW"
      },
      recentFailures: recentFailures.map(log => ({
        id: log.id,
        email: log.user?.email || "Unknown",
        fullName: log.user?.fullName || "Unknown",
        ipAddress: log.ipAddress,
        createdAt: log.createdAt
      }))
    });
  } catch (error: any) {
    fail(res, "DB_ERROR", error.message, 500);
  }
}

export async function exportAnonymizedDataset(req: Request, res: Response) {
  try {
    const students = await prisma.studentProfile.findMany({
      include: {
        university: { select: { shortName: true } },
        department: { select: { code: true } }
      }
    });

    const graphUrl = process.env.GRAPH_SERVICE_URL || "http://graph-service:3001";
    
    const anonymizedData = await Promise.all(
      students.map(async (student, idx) => {
        let skills: string[] = [];
        try {
          const res = await fetch(`${graphUrl.replace("localhost", "graph-service")}/graph/student/${student.userId}/skills`);
          if (res.ok) {
            const data = await res.json() as any;
            skills = (data.skills || []).map((s: any) => s.name);
          }
        } catch (e) {
          try {
            const res = await fetch(`${graphUrl}/graph/student/${student.userId}/skills`);
            if (res.ok) {
              const data = await res.json() as any;
              skills = (data.skills || []).map((s: any) => s.name);
            }
          } catch (e2) {}
        }

        return {
          anonymizedId: `STUDENT-${idx + 1001}`,
          university: student.university?.shortName || "Unknown",
          department: student.department?.code || "Unknown",
          graduationYear: student.graduationYear,
          skills
        };
      })
    );

    res.setHeader("Content-Disposition", 'attachment; filename="anonymized_skills_dataset.json"');
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(anonymizedData, null, 2));
  } catch (error: any) {
    fail(res, "EXPORT_ERROR", error.message, 500);
  }
}