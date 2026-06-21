import { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { runRead } from "../neo4j/driver.js";

interface SimulationRequest {
  studentId: string;
  targetRoleId: string;
  hypotheticalSkills: string[];
}

type StudentSkillRecord = {
  id: string | null;
  name: string;
  category: string;
  proficiency: number;
  confidence: number;
};

type RoadmapItem = {
  skillId: string;
  skillName: string;
  category: string;
  difficulty: number;
  prerequisites: string[];
  estimatedWeeks: number;
  criticality: number;
  objective: string;
  practiceProject: string;
  milestones: string[];
  resources: Array<{
    id: string;
    title: string;
    url: string;
    type: string;
    provider: string | null;
    durationHours: number | null;
    isUniversityApproved: boolean;
    courseCode: string | null;
    rating: number | null;
  }>;
};

function difficultyFromCriticality(criticality: number, index: number) {
  const scaled = Math.ceil(Math.max(0.2, Math.min(1, criticality)) * 5);
  return Math.max(1, Math.min(5, scaled + (index % 2 === 0 ? 0 : -1)));
}

function estimateWeeks(difficulty: number, criticality = 0.8) {
  return Math.max(1, Math.ceil(difficulty * (criticality >= 0.75 ? 1.2 : 0.9)));
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function getRoadmapDetails(skillName: string, category: string, roleName: string, difficulty: number) {
  const lowerName = normalizeName(skillName);
  const categoryLower = normalizeName(category);
  const objectiveByCategory: Record<string, string> = {
    language: `Use ${skillName} confidently in production-style code, including syntax, debugging, and maintainable structure.`,
    framework: `Build and integrate ${skillName} features that fit a real ${roleName} workflow.`,
    database: `Model, query, and optimize data with ${skillName} for realistic application needs.`,
    devops: `Use ${skillName} to package, deploy, or operate a service with repeatable commands.`,
    cloud: `Deploy a small service using ${skillName} with clear access, networking, and cost boundaries.`,
    testing: `Create dependable automated checks with ${skillName} and wire them into a team workflow.`,
    security: `Identify risks covered by ${skillName} and document practical mitigations.`,
    analytics: `Turn raw data into a decision-ready analysis using ${skillName}.`,
    product: `Use ${skillName} to prioritize product work from evidence instead of guesses.`,
    design: `Apply ${skillName} to produce interfaces that are usable, accessible, and implementation-ready.`,
    "ml library": `Train, evaluate, and explain a small model using ${skillName}.`
  };

  const projectBySkill: Record<string, string> = {
    react: "Build a role dashboard with filters, saved state, loading states, and responsive panels.",
    "node.js": "Create an authenticated API with validation, pagination, logging, and clear error responses.",
    postgresql: "Design a schema, seed realistic data, and write reporting queries with indexes.",
    docker: "Containerize a frontend and API, then run them with a compose file and health checks.",
    kubernetes: "Deploy a sample service with config, rollout, service discovery, and restart behavior.",
    playwright: "Automate three core user journeys and run the suite as a CI quality gate.",
    "owasp top 10": "Audit a demo app, rank three vulnerabilities, and write fixes with before/after notes.",
    aws: "Deploy a small API or static app with IAM least privilege and a rollback plan.",
    figma: "Design a compact product workflow, document states, and hand off component specs.",
    sql: "Analyze a product funnel with joins, cohorts, and a concise recommendation.",
    python: "Build a small data processing script with tests, CLI inputs, and clean outputs."
  };

  const milestones = [
    `Explain the core ${skillName} concepts without notes.`,
    `Build a focused mini-project and publish the source or screenshots.`,
    `Add tests, documentation, or review notes that prove the skill is job-ready.`
  ];

  if (difficulty >= 4) {
    milestones.push(`Complete one advanced ${skillName} exercise that includes tradeoffs and failure handling.`);
  }

  return {
    objective: objectiveByCategory[categoryLower] ?? `Apply ${skillName} in a realistic ${roleName} task.`,
    practiceProject: projectBySkill[lowerName] ?? `Build a ${roleName} portfolio artifact that demonstrates ${skillName}.`,
    milestones
  };
}

export async function runSimulation(req: Request, res: Response) {
  try {
    const { studentId, targetRoleId, hypotheticalSkills = [] } = req.body as SimulationRequest;

    if (!studentId || !targetRoleId) {
      return res.status(400).json({
        success: false,
        error: { message: "studentId and targetRoleId are required" }
      });
    }

    const role = await prisma.industryRole.findUnique({
      where: { id: targetRoleId },
      include: {
        requirements: {
          include: {
            skill: {
              include: { category: true }
            }
          },
          orderBy: [{ criticality: "desc" }, { skill: { name: "asc" } }]
        }
      }
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: { message: "Role not found" }
      });
    }

    // Get current student skills from Neo4j (matching careerGps query)
    const studentSkills = await runRead<StudentSkillRecord>(
      `
      MATCH (:Student {id: $studentId})-[knows:KNOWS]->(skill:Skill)
      WHERE coalesce(knows.confidence, 0) >= 0.5
        AND coalesce(knows.dormant, false) = false
      RETURN coalesce(skill.id, null) AS id,
             skill.name AS name,
             coalesce(skill.category, 'Uncategorized') AS category,
             coalesce(knows.proficiency, knows.confidence, 0.5) AS proficiency,
             coalesce(knows.confidence, 0.5) AS confidence
      ORDER BY confidence DESC, name ASC
      `,
      { studentId }
    );

    const studentSkillNames = new Set(studentSkills.map((skill) => normalizeName(skill.name)));
    const requiredSkills = role.requirements.map((requirement, index) => {
      const difficulty = difficultyFromCriticality(requirement.criticality, index);

      return {
        id: requirement.skill.id,
        name: requirement.skill.name,
        category: requirement.skill.category?.name ?? "Uncategorized",
        learningDifficulty: difficulty,
        criticality: requirement.criticality,
        aliases: requirement.skill.aliases
      };
    });

    // 1. Calculate original metrics
    const originalCompletedSkills = requiredSkills.filter((skill) => {
      const names = [skill.name, ...skill.aliases].map(normalizeName);
      return names.some((name) => studentSkillNames.has(name));
    });

    const originalMissingSkills = requiredSkills.filter((skill) => {
      const names = [skill.name, ...skill.aliases].map(normalizeName);
      return !names.some((name) => studentSkillNames.has(name));
    });

    const originalCompletionPercentage = requiredSkills.length > 0
      ? Math.round((originalCompletedSkills.length / requiredSkills.length) * 100)
      : 100;

    const originalRoadmapWeeks = originalMissingSkills.map((skill, index) => {
      return estimateWeeks(skill.learningDifficulty, skill.criticality);
    });
    const originalEstimatedWeeks = originalRoadmapWeeks.reduce((sum, w) => sum + w, 0);

    // 2. Calculate simulated metrics with hypothetical skills added
    const hypotheticalSet = new Set(hypotheticalSkills.map((s) => normalizeName(s)));

    const simulatedCompletedSkills = requiredSkills.filter((skill) => {
      const names = [skill.name, ...skill.aliases].map(normalizeName);
      return names.some(
        (name) =>
          studentSkillNames.has(name) ||
          hypotheticalSet.has(name) ||
          hypotheticalSet.has(normalizeName(skill.id))
      );
    });

    const simulatedMissingSkills = requiredSkills.filter((skill) => {
      const names = [skill.name, ...skill.aliases].map(normalizeName);
      return !names.some(
        (name) =>
          studentSkillNames.has(name) ||
          hypotheticalSet.has(name) ||
          hypotheticalSet.has(normalizeName(skill.id))
      );
    });

    const simulatedCompletionPercentage = requiredSkills.length > 0
      ? Math.round((simulatedCompletedSkills.length / requiredSkills.length) * 100)
      : 100;

    // Query learning resources dynamically for all simulated missing skills in one query
    const simulatedMissingSkillIds = simulatedMissingSkills.map((s) => s.id);
    const dbResources = await prisma.learningResource.findMany({
      where: {
        skills: {
          some: {
            skillId: { in: simulatedMissingSkillIds }
          }
        }
      },
      include: {
        skills: {
          select: {
            skillId: true
          }
        }
      },
      orderBy: [
        { isUniversityApproved: "desc" },
        { rating: "desc" }
      ]
    });

    // Group resources by skillId
    const resourceMap: Record<string, typeof dbResources> = {};
    for (const resItem of dbResources) {
      for (const rs of resItem.skills) {
        if (!resourceMap[rs.skillId]) {
          resourceMap[rs.skillId] = [];
        }
        if (resourceMap[rs.skillId].length < 5) {
          resourceMap[rs.skillId].push(resItem);
        }
      }
    }

    const simulatedRoadmap: RoadmapItem[] = simulatedMissingSkills.map((skill, index) => {
      const details = getRoadmapDetails(skill.name, skill.category, role.title, skill.learningDifficulty);
      const skillResources = resourceMap[skill.id] || [];

      return {
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        difficulty: skill.learningDifficulty,
        prerequisites: index === 0 ? [] : simulatedMissingSkills.slice(0, index).map((item) => item.name).slice(-2),
        estimatedWeeks: estimateWeeks(skill.learningDifficulty, skill.criticality),
        criticality: skill.criticality,
        objective: details.objective,
        practiceProject: details.practiceProject,
        milestones: details.milestones,
        resources: skillResources.map((res) => ({
          id: res.id,
          title: res.title,
          url: res.url,
          type: res.type,
          provider: res.provider,
          durationHours: res.durationHours,
          isUniversityApproved: res.isUniversityApproved,
          courseCode: res.courseCode,
          rating: res.rating
        }))
      };
    });

    const simulatedEstimatedWeeks = simulatedRoadmap.reduce((sum, item) => sum + item.estimatedWeeks, 0);

    const completionDelta = Math.max(0, simulatedCompletionPercentage - originalCompletionPercentage);
    const weeksSaved = Math.max(0, originalEstimatedWeeks - simulatedEstimatedWeeks);

    return res.json({
      success: true,
      data: {
        studentId,
        targetRole: {
          id: role.id,
          name: role.title,
          description: role.description
        },
        original: {
          completionPercentage: originalCompletionPercentage,
          estimatedWeeks: originalEstimatedWeeks,
          skillsCompleted: originalCompletedSkills.length,
          skillsRemaining: originalMissingSkills.length
        },
        simulated: {
          completionPercentage: simulatedCompletionPercentage,
          estimatedWeeks: simulatedEstimatedWeeks,
          skillsCompleted: simulatedCompletedSkills.length,
          skillsRemaining: simulatedMissingSkills.length,
          completionDelta,
          weeksSaved,
          roadmap: simulatedRoadmap
        }
      }
    });
  } catch (error) {
    console.error("Simulation run error:", error);
    return res.status(500).json({
      success: false,
      error: { message: "Failed to run simulation" }
    });
  }
}