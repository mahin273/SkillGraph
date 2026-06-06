import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { fail, ok } from "../utils/apiResponse.js";
import { env } from "../config/env.js";
import puppeteer from "puppeteer";
import fs from "fs";

// Helper to determine Chrome path (supporting host Windows environment and custom Docker configurations)
function getChromeExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const windowsDefault = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  if (fs.existsSync(windowsDefault)) {
    return windowsDefault;
  }
  // Fallback to Puppeteer's self-resolved path if default doesn't exist
  return undefined;
}

// Helper to generate ATS-friendly HTML template
export function buildResumeHtml(data: {
  fullName: string;
  email: string | null;
  githubHandle: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  bio: string | null;
  universityName: string;
  departmentName: string;
  graduationYear: number | null;
  skills: Array<{ name: string; category: string; proficiency: number; endorsementCount: number }>;
  projects: Array<{ title: string; description: string | null; role: string | null; date: string }>;
  targetRoleName?: string;
  atsScore?: number;
}) {
  const skillsList = data.skills
    .map(
      (s) => `
      <span class="skill-tag">
        <strong>${s.name}</strong> ${s.endorsementCount > 0 ? `(${s.endorsementCount} endorsements)` : ""}
      </span>
    `
    )
    .join("");

  const projectsList = data.projects
    .map(
      (p) => `
      <div class="project-item">
        <div class="project-header">
          <span class="project-title">${p.title}</span>
          <span class="project-date">${p.date}</span>
        </div>
        ${p.role ? `<p class="project-role"><strong>Role:</strong> ${p.role}</p>` : ""}
        <p class="project-desc">${p.description || "Developed software using modern web standards."}</p>
      </div>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${data.fullName} - Resume</title>
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #1a202c;
          line-height: 1.5;
          margin: 0;
          padding: 0;
          font-size: 11pt;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          font-size: 24pt;
          margin-bottom: 5px;
          color: #1a202c;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .contact-info {
          text-align: center;
          font-size: 10pt;
          margin-bottom: 25px;
          color: #4a5568;
        }
        .contact-info a {
          color: #1a202c;
          text-decoration: none;
        }
        .contact-info span:not(:last-child)::after {
          content: " | ";
          color: #cbd5e0;
          padding: 0 5px;
        }
        h2 {
          font-size: 13pt;
          border-bottom: 1.5px solid #2d3748;
          padding-bottom: 3px;
          margin-top: 25px;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #2d3748;
        }
        .education-item {
          margin-bottom: 15px;
        }
        .education-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
        }
        .education-sub {
          color: #4a5568;
          font-size: 10.5pt;
        }
        .skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 12px;
          margin-bottom: 15px;
        }
        .skill-tag {
          font-size: 10pt;
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .project-item {
          margin-bottom: 18px;
        }
        .project-header {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
        }
        .project-title {
          font-size: 11.5pt;
        }
        .project-date {
          color: #4a5568;
          font-size: 10pt;
        }
        .project-role {
          margin: 3px 0;
          font-size: 10pt;
          color: #4a5568;
        }
        .project-desc {
          margin: 5px 0 0 0;
          font-size: 10pt;
          color: #2d3748;
          text-align: justify;
        }
        .summary-box {
          font-size: 10pt;
          margin-bottom: 20px;
          color: #2d3748;
          text-align: justify;
        }
        ${
          data.atsScore !== undefined
            ? `
        .ats-badge {
          display: block;
          text-align: right;
          font-size: 9pt;
          color: #718096;
          margin-bottom: 10px;
        }
        `
            : ""
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${data.fullName}</h1>
        <div class="contact-info">
          ${data.email ? `<span>Email: <a href="mailto:${data.email}">${data.email}</a></span>` : ""}
          ${data.githubHandle ? `<span>GitHub: <a href="https://github.com/${data.githubHandle}">github.com/${data.githubHandle}</a></span>` : ""}
          ${data.linkedinUrl ? `<span>LinkedIn: <a href="${data.linkedinUrl}">${data.linkedinUrl.replace(/https?:\/\/(www\.)?/, "")}</a></span>` : ""}
          ${data.portfolioUrl ? `<span>Portfolio: <a href="${data.portfolioUrl}">${data.portfolioUrl.replace(/https?:\/\/(www\.)?/, "")}</a></span>` : ""}
        </div>

        ${data.atsScore !== undefined ? `<div class="ats-badge">ATS Profile Match Score: <strong>${data.atsScore}%</strong> (${data.targetRoleName || "Target Role"})</div>` : ""}

        ${
          data.bio
            ? `
        <h2>Professional Summary</h2>
        <div class="summary-box">
          ${data.bio}
        </div>
        `
            : ""
        }

        <h2>Education</h2>
        <div class="education-item">
          <div class="education-header">
            <span>${data.universityName}</span>
            <span>Graduation: ${data.graduationYear || "N/A"}</span>
          </div>
          <div class="education-sub">
            Bachelor of Science in ${data.departmentName}
          </div>
        </div>

        <h2>Technical Skills</h2>
        <div class="skills-container">
          ${skillsList || '<span class="skill-tag">General Technical Skills</span>'}
        </div>

        <h2>Academic & Engineering Projects</h2>
        <div class="projects-list">
          ${projectsList || "<p>Collaborated on various university capstone designs and engineering coursework.</p>"}
        </div>
      </div>
    </body>
    </html>
  `;
}

// Load resume details for preview or export
export async function getResumeData(userId: string, roleId?: string) {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      user: {
        include: {
          ownedProjects: true,
          collaborations: {
            include: {
              project: true
            }
          }
        }
      },
      department: true,
      university: true
    }
  });

  if (!student) {
    throw new Error("STUDENT_NOT_FOUND");
  }

  // Get skills from graph-service
  let skills: any[] = [];
  try {
    const response = await fetch(`${env.GRAPH_SERVICE_URL}/graph/student/${userId}/skills`);
    if (response.ok) {
      const body = await response.json();
      skills = body?.data?.skills || [];
    }
  } catch (err) {
    console.error("Failed to fetch student skills from graph-service:", err);
  }

  // Map academic projects owned by student or collaborated on
  const ownedProjects = student.user.ownedProjects.map((p) => ({
    title: p.title,
    description: p.description,
    role: p.isCapstone ? "Project Owner (Capstone)" : "Project Owner",
    date: p.startDate ? new Date(p.startDate).getFullYear().toString() : new Date().getFullYear().toString()
  }));

  const collaboratedProjects = student.user.collaborations.map((collab) => ({
    title: collab.project.title,
    description: collab.project.description,
    role: collab.role || "Collaborator",
    date: collab.project.startDate
      ? new Date(collab.project.startDate).getFullYear().toString()
      : new Date().getFullYear().toString()
  }));

  const allProjects = [...ownedProjects, ...collaboratedProjects];

  // If roleId is provided, perform ATS optimization
  let targetRoleName: string | undefined;
  let atsScore: number | undefined;
  let optimizedSkills = [...skills];

  if (roleId) {
    const role = await prisma.industryRole.findUnique({
      where: { id: roleId },
      include: {
        requirements: {
          include: {
            skill: true
          }
        }
      }
    });

    if (role) {
      targetRoleName = role.title;
      // Weighted ATS calculation based on criticality
      let totalCriticality = 0;
      let matchedCriticality = 0;

      const requirementSkillNames = new Set(
        role.requirements.map((req) => req.skill.name.toLowerCase())
      );

      for (const req of role.requirements) {
        totalCriticality += req.criticality;
        const aliases = (req.skill.aliases || []).map((a) => a.toLowerCase());
        const searchTerms = [req.skill.name.toLowerCase(), ...aliases];

        const isMatched = skills.some(
          (s) =>
            searchTerms.includes(s.name.toLowerCase()) &&
            s.confidence >= 0.5 &&
            !s.dormant
        );

        if (isMatched) {
          matchedCriticality += req.criticality;
        }
      }

      atsScore = totalCriticality > 0 ? Math.round((matchedCriticality / totalCriticality) * 100) : 100;

      // ATS Optimization: Sort skills such that requirements for the target role are placed first
      optimizedSkills.sort((a, b) => {
        const aIsRequired = requirementSkillNames.has(a.name.toLowerCase());
        const bIsRequired = requirementSkillNames.has(b.name.toLowerCase());

        if (aIsRequired && !bIsRequired) return -1;
        if (!aIsRequired && bIsRequired) return 1;
        // secondary sort by proficiency
        return b.proficiency - a.proficiency;
      });
    }
  }

  return {
    student,
    fullName: student.user.fullName,
    email: student.user.email,
    githubHandle: student.user.githubHandle,
    linkedinUrl: student.linkedinUrl,
    portfolioUrl: student.portfolioUrl,
    bio: student.bio,
    universityName: student.university?.name || "United International University",
    departmentName: student.department?.name || "Computer Science and Engineering",
    graduationYear: student.graduationYear,
    skills: optimizedSkills,
    projects: allProjects,
    targetRoleName,
    atsScore
  };
}

export async function getResumePreview(req: Request, res: Response) {
  let { studentId } = req.params;
  const { roleId } = req.query as { roleId?: string };

  try {
    let resolvedUserId: string;

    if (studentId === "me") {
      if (!req.user) {
        fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
        return;
      }
      resolvedUserId = req.user.id;
    } else {
      const student = await prisma.studentProfile.findFirst({
        where: { OR: [{ id: studentId }, { userId: studentId }] }
      });
      if (!student) {
        fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
        return;
      }
      resolvedUserId = student.userId;
    }

    const data = await getResumeData(resolvedUserId, roleId);
    const htmlContent = buildResumeHtml(data);

    res.setHeader("Content-Type", "text/html");
    res.send(htmlContent);
  } catch (error) {
    console.error("Resume preview error:", error);
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
    } else {
      fail(res, "INTERNAL_ERROR", "Failed to generate resume preview", 500);
    }
  }
}

export async function exportResumePdf(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { roleId } = req.body as { roleId?: string };

  try {
    const data = await getResumeData(req.user.id, roleId);
    const htmlContent = buildResumeHtml(data);

    // Render HTML to PDF via Headless Puppeteer
    const executablePath = getChromeExecutablePath();
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0.6in",
        bottom: "0.6in",
        left: "0.6in",
        right: "0.6in"
      }
    });

    await browser.close();

    // Store export entry in DB
    await prisma.resumeExport.create({
      data: {
        studentId: data.student.id,
        roleId: roleId || null,
        atsScore: data.atsScore !== undefined ? data.atsScore : null
      }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=resume_${data.student.publicHandle || "export"}.pdf`
    );
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error("Resume export PDF error:", error);
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
    } else {
      fail(res, "INTERNAL_ERROR", "Failed to generate resume PDF", 500);
    }
  }
}

export async function analyzeUploadedResume(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { text, roleId } = req.body as { text: string; roleId: string };

  if (!text || !roleId) {
    fail(res, "INVALID_BODY", "text and roleId are required fields", 400);
    return;
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
      return;
    }

    const role = await prisma.industryRole.findUnique({
      where: { id: roleId },
      include: {
        requirements: {
          include: {
            skill: true
          }
        }
      }
    });

    if (!role) {
      fail(res, "ROLE_NOT_FOUND", "Target industry role not found", 404);
      return;
    }

    let totalCriticality = 0;
    let matchedCriticality = 0;
    const matchedSkills: string[] = [];
    const gapSkills: string[] = [];

    const normalizedText = text.toLowerCase();

    for (const reqSkill of role.requirements) {
      totalCriticality += reqSkill.criticality;

      const skillName = reqSkill.skill.name.toLowerCase();
      const aliases = (reqSkill.skill.aliases || []).map((a) => a.toLowerCase());
      const searchTerms = [skillName, ...aliases];

      const isMatched = searchTerms.some((term) => {
        const escaped = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`(?:\\b|\\s|\\W)${escaped}(?:\\b|\\s|\\W)`, "i");
        return regex.test(normalizedText);
      });

      if (isMatched) {
        matchedCriticality += reqSkill.criticality;
        matchedSkills.push(reqSkill.skill.name);
      } else {
        gapSkills.push(reqSkill.skill.name);
      }
    }

    const atsScore = totalCriticality > 0 ? Math.round((matchedCriticality / totalCriticality) * 100) : 100;

    const resultRecord = await prisma.resumeExport.create({
      data: {
        studentId: student.id,
        roleId,
        atsScore
      }
    });

    ok(res, {
      id: resultRecord.id,
      atsScore,
      matchedSkills,
      gapSkills,
      roleTitle: role.title
    });
  } catch (error: any) {
    console.error("Failed to analyze resume:", error);
    fail(res, "INTERNAL_ERROR", error.message || "Failed to analyze resume text", 500);
  }
}