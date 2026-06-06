import { Router } from "express";
import { z } from "zod";
import { findCandidatesQuery } from "../neo4j/queries/matchmaker.queries.js";
import { runRead, runWrite } from "../neo4j/driver.js";
import { prisma } from "@skillgraph/database";

export const graphRouter = Router();

const updateSchema = z.object({
  studentId: z.string(),
  githubHandle: z.string().optional(),
  repositories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    fullName: z.string(),
    description: z.string().nullable().optional(),
    language: z.string().nullable().optional()
  })).default([]),
  skills: z.array(z.object({
    skill_name: z.string(),
    confidence: z.number().default(0.5),
    source_repos: z.array(z.string()).default([])
  })).default([])
});

function toGalaxy(records: Array<{ node: { properties: Record<string, unknown> }; rel?: { type: string; properties: Record<string, unknown> }; target?: { properties: Record<string, unknown> } }>) {
  const nodes = new Map<string, Record<string, unknown>>();
  const links: Array<Record<string, unknown>> = [];

  for (const record of records) {
    const source = record.node.properties;
    const sourceLabels = "labels" in record.node ? (record.node as unknown as { labels?: string[] }).labels : [];
    const sourceId = String(source.id ?? source.name);
    nodes.set(sourceId, { id: sourceId, labels: sourceLabels, ...source });

    if (record.target && record.rel) {
      const target = record.target.properties;
      const targetLabels = "labels" in record.target ? (record.target as unknown as { labels?: string[] }).labels : [];
      const targetId = String(target.id ?? target.name);
      nodes.set(targetId, { id: targetId, labels: targetLabels, ...target });
      links.push({ source: sourceId, target: targetId, type: record.rel.type, ...record.rel.properties });
    }
  }

  return { nodes: [...nodes.values()], links };
}

graphRouter.post("/update", async (req, res, next) => {
  try {
    const payload = updateSchema.parse(req.body);
    await runWrite(
      `
      MERGE (student:Student {id: $studentId})
      SET student.handle = coalesce($githubHandle, student.handle),
          student.updatedAt = datetime()
      WITH student
      UNWIND $repositories AS repo
      MERGE (project:Project {id: repo.id})
      SET project.name = repo.name,
          project.fullName = repo.fullName,
          project.description = repo.description,
          project.language = repo.language,
          project.updatedAt = datetime()
      MERGE (student)-[:WORKED_ON]->(project)
      WITH student
      UNWIND $skills AS extracted
      MERGE (skill:Skill {name: extracted.skill_name})
      SET skill.updatedAt = datetime()
      MERGE (student)-[knows:KNOWS]->(skill)
      SET knows.confidence = extracted.confidence,
          knows.sourceRepos = extracted.source_repos,
          knows.updatedAt = datetime(),
          knows.proficiency = null,
          knows.dormant = false
      WITH extracted, skill
      MATCH (project:Project)
      WHERE project.name IN extracted.source_repos OR project.fullName IN extracted.source_repos
      MERGE (project)-[built:BUILT_WITH]->(skill)
      SET built.confidence = extracted.confidence
      `,
      payload
    );
    res.json({ success: true, data: { status: "updated", skills: payload.skills.length } });
  } catch (error) {
    next(error);
  }
});

graphRouter.post("/endorsements", async (req, res, next) => {
  try {
    const payload = z.object({ studentId: z.string(), skillName: z.string() }).parse(req.body);
    
    // Increment endorsementCount
    const result = await runWrite<{ count: number }>(
      `
      MERGE (student:Student {id: $studentId})
      MERGE (skill:Skill {name: $skillName})
      MERGE (student)-[knows:KNOWS]->(skill)
      SET knows.endorsementCount = coalesce(knows.endorsementCount, 0) + 1
      RETURN knows.endorsementCount AS count
      `,
      payload
    );

    // Check if endorsementCount >= 2 and set endorsed = true
    const count = result.length > 0 ? result[0].count : 0;
    if (count >= 2) {
      await runWrite(
        `
        MATCH (student:Student {id: $studentId})-[knows:KNOWS]->(skill:Skill {name: $skillName})
        SET knows.endorsed = true
        `,
        payload
      );
    }

    res.json({ success: true, data: { status: "updated", endorsementCount: count } });
  } catch (error) {
    next(error);
  }
});

graphRouter.post("/endorsements/mark-endorsed", async (req, res, next) => {
  try {
    const payload = z.object({ studentId: z.string(), skillName: z.string() }).parse(req.body);
    await runWrite(
      `
      MATCH (student:Student {id: $studentId})-[knows:KNOWS]->(skill:Skill {name: $skillName})
      SET knows.endorsed = true
      `,
      payload
    );
    res.json({ success: true, data: { status: "marked_endorsed" } });
  } catch (error) {
    next(error);
  }
});

graphRouter.post("/mentor/verify", async (req, res, next) => {
  try {
    const payload = z.object({ studentId: z.string(), skillName: z.string() }).parse(req.body);
    await runWrite(
      `
      MERGE (student:Student {id: $studentId})
      MERGE (skill:Skill {name: $skillName})
      MERGE (student)-[knows:KNOWS]->(skill)
      SET knows.endorsed = true,
          knows.confidence = 1.0,
          knows.proficiency = 1.0,
          knows.dormant = false,
          knows.updatedAt = datetime()
      `,
      payload
    );
    res.json({ success: true, data: { status: "verified" } });
  } catch (error) {
    next(error);
  }
});


graphRouter.post("/endorsements/decrement", async (req, res, next) => {
  try {
    const payload = z.object({ studentId: z.string(), skillName: z.string() }).parse(req.body);
    
    // Decrement endorsementCount
    const result = await runWrite<{ count: number }>(
      `
      MATCH (student:Student {id: $studentId})-[knows:KNOWS]->(skill:Skill {name: $skillName})
      SET knows.endorsementCount = CASE 
        WHEN knows.endorsementCount > 0 THEN knows.endorsementCount - 1 
        ELSE 0 
      END
      RETURN knows.endorsementCount AS count
      `,
      payload
    );

    // Check if endorsementCount < 2 and set endorsed = false
    const count = result.length > 0 ? result[0].count : 0;
    if (count < 2) {
      await runWrite(
        `
        MATCH (student:Student {id: $studentId})-[knows:KNOWS]->(skill:Skill {name: $skillName})
        SET knows.endorsed = false
        `,
        payload
      );
    }

    res.json({ success: true, data: { status: "decremented", endorsementCount: count } });
  } catch (error) {
    next(error);
  }
});

graphRouter.get("/student/:id/skills", async (req, res, next) => {
  try {
    const records = await runRead<{
      name: string;
      confidence: number;
      proficiency: number;
      endorsementCount: number;
      endorsed: boolean;
      dormant: boolean;
      category: string;
    }>(
      `
      MATCH (:Student {id: $studentId})-[knows:KNOWS]->(skill:Skill)
      RETURN skill.name AS name,
             knows.confidence AS confidence,
             coalesce(knows.proficiency, knows.confidence) AS proficiency,
             coalesce(knows.endorsementCount, 0) AS endorsementCount,
             coalesce(knows.endorsed, false) AS endorsed,
             coalesce(knows.dormant, false) AS dormant,
             coalesce(skill.category, 'Uncategorized') AS category
      ORDER BY knows.confidence DESC, skill.name ASC
      `,
      { studentId: req.params.id }
    );
    res.json({ success: true, data: { skills: records } });
  } catch (error) {
    next(error);
  }
});

graphRouter.post("/students/skills", async (req, res, next) => {
  try {
    const { studentIds } = z.object({ studentIds: z.array(z.string()) }).parse(req.body);
    const records = await runRead<{
      studentId: string;
      name: string;
      confidence: number;
      proficiency: number;
      endorsementCount: number;
      endorsed: boolean;
      dormant: boolean;
      category: string;
    }>(
      `
      MATCH (student:Student)-[knows:KNOWS]->(skill:Skill)
      WHERE student.id IN $studentIds
      RETURN student.id AS studentId,
             skill.name AS name,
             knows.confidence AS confidence,
             coalesce(knows.proficiency, knows.confidence) AS proficiency,
             coalesce(knows.endorsementCount, 0) AS endorsementCount,
             coalesce(knows.endorsed, false) AS endorsed,
             coalesce(knows.dormant, false) AS dormant,
             coalesce(skill.category, 'Uncategorized') AS category
      ORDER BY knows.confidence DESC, skill.name ASC
      `,
      { studentIds }
    );

    const skillsByStudent: Record<string, any[]> = {};
    for (const id of studentIds) {
      skillsByStudent[id] = [];
    }
    for (const r of records) {
      if (!skillsByStudent[r.studentId]) {
        skillsByStudent[r.studentId] = [];
      }
      skillsByStudent[r.studentId].push({
        name: r.name,
        confidence: r.confidence,
        proficiency: r.proficiency,
        endorsementCount: r.endorsementCount,
        endorsed: r.endorsed,
        dormant: r.dormant,
        category: r.category
      });
    }

    res.json({ success: true, data: { skills: skillsByStudent } });
  } catch (error) {
    next(error);
  }
});


graphRouter.get("/galaxy/:studentId", async (req, res, next) => {
  try {
    const records = await runRead<any>(
      `
      MATCH (student:Student {id: $studentId})
      RETURN student AS node, null AS rel, null AS target
      UNION
      MATCH (student:Student {id: $studentId})-[rel:KNOWS]->(skill:Skill)
      RETURN student AS node, rel, skill AS target
      UNION
      MATCH (student:Student {id: $studentId})-[rel:WORKED_ON]->(project:Project)
      RETURN student AS node, rel, project AS target
      UNION
      MATCH (student:Student {id: $studentId})-[:WORKED_ON]->(project:Project)-[rel:BUILT_WITH]->(skill:Skill)
      RETURN project AS node, rel, skill AS target
      `,
      { studentId: req.params.studentId }
    );
    res.json({ success: true, data: toGalaxy(records) });
  } catch (error) {
    next(error);
  }
});

graphRouter.get("/public/galaxy/:handle", async (req, res, next) => {
  try {
    const records = await runRead<any>(
      `
      MATCH (student:Student {handle: $handle})
      RETURN student AS node, null AS rel, null AS target
      UNION
      MATCH (student:Student {handle: $handle})-[rel:KNOWS]->(skill:Skill)
      RETURN student AS node, rel, skill AS target
      UNION
      MATCH (student:Student {handle: $handle})-[rel:WORKED_ON]->(project:Project)
      RETURN student AS node, rel, project AS target
      UNION
      MATCH (student:Student {handle: $handle})-[:WORKED_ON]->(project:Project)-[rel:BUILT_WITH]->(skill:Skill)
      RETURN project AS node, rel, skill AS target
      `,
      { handle: req.params.handle }
    );
    res.json({ success: true, data: toGalaxy(records) });
  } catch (error) {
    next(error);
  }
});

graphRouter.post("/matchmaker/find", (_req, res) => {
  res.json({ success: true, data: { query: findCandidatesQuery, candidates: [] } });
});

graphRouter.post("/matchmaker/candidates", async (req, res, next) => {
  try {
    const payload = z.object({
      requesterId: z.string(),
      requiredSkills: z.array(z.string()).min(1).max(20),
      scope: z.enum(["same_department", "same_university", "all_universities"]).default("same_university"),
      limit: z.number().int().min(1).max(50).default(20)
    }).parse(req.body);

    const requester = await prisma.user.findUnique({
      where: { id: payload.requesterId },
      include: {
        studentProfile: {
          include: {
            university: true,
            department: true
          }
        }
      }
    });

    if (!requester?.studentProfile) {
      res.status(404).json({ success: false, error: { message: "Requester student profile not found" } });
      return;
    }

    const normalizedRequiredSkills = payload.requiredSkills.map((skill) => skill.trim().toLowerCase()).filter(Boolean);
    const candidateSignals = await runRead<{
      studentId: string;
      matchedSkills: Array<{
        name: string;
        category: string;
        confidence: number;
        proficiency: number;
        endorsementCount: number;
        sourceRepos: string[];
      }>;
      matchCount: number;
      avgConfidence: number;
      endorsementCount: number;
      repoSignalCount: number;
    }>(
      `
      MATCH (candidate:Student)-[knows:KNOWS]->(skill:Skill)
      WHERE candidate.id <> $requesterId
        AND toLower(skill.name) IN $requiredSkills
        AND coalesce(knows.dormant, false) = false
        AND coalesce(knows.confidence, 0) >= 0.35
      WITH candidate,
           collect(DISTINCT {
             name: skill.name,
             category: coalesce(skill.category, 'Uncategorized'),
             confidence: coalesce(knows.confidence, 0.5),
             proficiency: coalesce(knows.proficiency, knows.confidence, 0.5),
             endorsementCount: coalesce(knows.endorsementCount, 0),
             sourceRepos: coalesce(knows.sourceRepos, [])
           }) AS matchedSkills
      RETURN candidate.id AS studentId,
             matchedSkills AS matchedSkills,
             size(matchedSkills) AS matchCount,
             reduce(total = 0.0, item IN matchedSkills | total + item.confidence) / size(matchedSkills) AS avgConfidence,
             reduce(total = 0, item IN matchedSkills | total + item.endorsementCount) AS endorsementCount,
             reduce(total = 0, item IN matchedSkills | total + size(item.sourceRepos)) AS repoSignalCount
      ORDER BY matchCount DESC, avgConfidence DESC, endorsementCount DESC
      LIMIT 100
      `,
      {
        requesterId: payload.requesterId,
        requiredSkills: normalizedRequiredSkills
      }
    );

    const candidateIds = candidateSignals.map((candidate) => candidate.studentId);
    const users = candidateIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: {
            id: { in: candidateIds },
            role: "student",
            isActive: true,
            studentProfile: { isNot: null }
          },
          include: {
            studentProfile: {
              include: {
                university: true,
                department: true
              }
            }
          }
        });

    const usersById = new Map(users.map((user) => [user.id, user]));
    const requesterUniversityId = requester.studentProfile.universityId;
    const requesterDepartmentId = requester.studentProfile.departmentId;

    const candidates = candidateSignals
      .map((signal) => {
        const user = usersById.get(signal.studentId);
        const profile = user?.studentProfile;

        if (!user || !profile) return null;

        const sameUniversity = Boolean(requesterUniversityId && profile.universityId === requesterUniversityId);
        const sameDepartment = Boolean(requesterDepartmentId && profile.departmentId === requesterDepartmentId);

        if (payload.scope === "same_department" && !sameDepartment) return null;
        if (payload.scope === "same_university" && !sameUniversity) return null;

        const skillCoverage = signal.matchCount / normalizedRequiredSkills.length;
        const confidenceScore = Math.min(1, signal.avgConfidence);
        const endorsementScore = Math.min(1, signal.endorsementCount / Math.max(1, normalizedRequiredSkills.length * 2));
        const institutionScore = sameDepartment ? 1 : sameUniversity ? 0.75 : 0.35;
        const activityScore = Math.min(1, signal.repoSignalCount / Math.max(1, signal.matchCount * 2));
        const matchScore = Math.round((
          skillCoverage * 0.4 +
          confidenceScore * 0.2 +
          endorsementScore * 0.15 +
          institutionScore * 0.15 +
          activityScore * 0.1
        ) * 100);
        const matchedSkillNames = signal.matchedSkills.map((skill) => skill.name);
        const missingSkills = payload.requiredSkills.filter((skill) => (
          !matchedSkillNames.some((matchedSkill) => matchedSkill.toLowerCase() === skill.toLowerCase())
        ));
        const reasons = [
          `${signal.matchCount} of ${normalizedRequiredSkills.length} required skills matched`,
          sameDepartment ? "same department" : sameUniversity ? "same university" : "cross-university candidate",
          signal.repoSignalCount > 0 ? `${signal.repoSignalCount} repository evidence signals` : "limited repository evidence",
          signal.endorsementCount > 0 ? `${signal.endorsementCount} peer endorsements` : "no peer endorsements yet"
        ];

        return {
          studentId: user.id,
          name: user.fullName,
          avatarUrl: user.avatarUrl,
          publicHandle: profile.publicHandle,
          university: profile.university?.name ?? "Unknown university",
          department: profile.department?.name ?? "Unknown department",
          graduationYear: profile.graduationYear,
          sameUniversity,
          sameDepartment,
          matchScore,
          matchedSkills: signal.matchedSkills,
          missingSkills,
          evidence: {
            avgConfidence: Number(signal.avgConfidence.toFixed(2)),
            endorsementCount: signal.endorsementCount,
            repoSignalCount: signal.repoSignalCount
          },
          reasons
        };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, payload.limit);

    res.json({
      success: true,
      data: {
        scope: payload.scope,
        requiredSkills: payload.requiredSkills,
        candidates
      }
    });
  } catch (error) {
    next(error);
  }
});

//
// POST /graph/sync — re-sync a student's Neo4j nodes from PostgreSQL

graphRouter.post("/sync", async (req, res, next) => {
  try {
    const { studentId } = z.object({ studentId: z.string() }).parse(req.body);

    // Fetch the user + student profile from PostgreSQL
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      include: { studentProfile: { include: { university: true } } }
    });

    if (!user) {
      res.status(404).json({ success: false, error: "Student not found" });
      return;
    }

    const universityName = user.studentProfile?.university?.name ?? "Unknown";
    const universityId = user.universityId;

    // Upsert the Student node
    await runWrite(
      `
      MERGE (s:Student {id: $studentId})
      SET s.name = $name,
          s.university = $university,
          s.universityId = $universityId,
          s.updatedAt = timestamp()
      `,
      { studentId, name: user.fullName, university: universityName, universityId }
    );

    // Fetch all skills the student has endorsements for and sync them
    const endorsements = await prisma.peerEndorsement.findMany({
      where: { endorsedId: studentId },
      include: { skill: { include: { category: true } } }
    });

    for (const endorsement of endorsements) {
      const skillName = endorsement.skill.name;
      const category = endorsement.skill.category?.name ?? "Uncategorized";

      await runWrite(
        `
        MERGE (sk:Skill {name: $skillName})
        SET sk.category = $category
        WITH sk
        MATCH (s:Student {id: $studentId})
        MERGE (s)-[r:KNOWS]->(sk)
        SET r.endorsementCount = coalesce(r.endorsementCount, 0),
            r.confidence = coalesce(r.confidence, 0.5),
            r.proficiency = coalesce(r.proficiency, 0.5),
            r.lastActive = coalesce(r.lastActive, timestamp()),
            r.dormant = coalesce(r.dormant, false)
        `,
        { studentId, skillName, category }
      );
    }

    res.json({
      success: true,
      data: { status: "synced", studentId, skillsSynced: endorsements.length }
    });
  } catch (error) {
    next(error);
  }
});


// GET /graph/roles — return all industry roles from PostgreSQL

graphRouter.get("/roles", async (_req, res, next) => {
  try {
    const roles = await prisma.industryRole.findMany({
      include: {
        requirements: {
          include: { skill: true },
          orderBy: { criticality: "desc" }
        }
      },
      orderBy: { title: "asc" }
    });

    const data = roles.map((role) => ({
      id: role.id,
      title: role.title,
      description: role.description ?? null,
      requiredSkills: role.requirements.map((req) => ({
        name: req.skill.name,
        criticality: req.criticality
      }))
    }));

    res.json({ success: true, data: { roles: data } });
  } catch (error) {
    next(error);
  }
});


// GET /graph/skills/all — return all skill nodes from Neo4j

graphRouter.get("/skills/all", async (_req, res, next) => {
  try {
    const records = await runRead<{ name: string; category: string }>(
      `
      MATCH (sk:Skill)
      RETURN sk.name AS name,
             coalesce(sk.category, 'Uncategorized') AS category
      ORDER BY sk.name ASC
      `
    );
    res.json({ success: true, data: { skills: records } });
  } catch (error) {
    next(error);
  }
});

// POST /graph/reactivate — reactivate a dormant skill

graphRouter.post("/reactivate", async (req, res, next) => {
  try {
    const { studentId, skillName } = z.object({
      studentId: z.string(),
      skillName: z.string()
    }).parse(req.body);

    await runWrite(
      `
      MATCH (student:Student {id: $studentId})-[knows:KNOWS]->(skill:Skill {name: $skillName})
      SET knows.dormant = false,
          knows.lastActive = $lastActive,
          knows.proficiency = coalesce(knows.confidence, 0.5),
          knows.updatedAt = datetime()
      `,
      { studentId, skillName, lastActive: Date.now() }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
