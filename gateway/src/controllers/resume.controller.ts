import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { fail, ok } from "../utils/apiResponse.js";
import { env } from "../config/env.js";
import puppeteer from "puppeteer";
import fs from "fs";
import { z } from "zod";

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
  phoneNumber: string | null;
  relevantCoursework: string | null;
  universityName: string;
  departmentName: string;
  graduationYear: number | null;
  skills: Array<{ name: string; category: string; proficiency: number; endorsementCount: number }>;
  projects: Array<{ title: string; description: string | null; role: string | null; date: string; techStack?: string }>;
  workExperiences: Array<{ company: string; role: string; startDate: string; endDate: string; description: string | null }>;
  publications: Array<{ title: string; publishedAt: string | null; url: string | null }>;
  targetRoleName?: string;
  atsScore?: number;
}) {
  // Group skills by category
  const groupedSkills: Record<string, string[]> = {};
  for (const s of data.skills) {
    let cat = s.category?.trim() || "General Skills";
    if (cat.toLowerCase() === "uncategorized") {
      cat = "General Skills";
    }
    if (!groupedSkills[cat]) {
      groupedSkills[cat] = [];
    }
    groupedSkills[cat].push(s.name);
  }

  const skillsList = Object.entries(groupedSkills)
    .map(([cat, names]) => `
      <div class="skill-group">
        <strong>${cat}:</strong> ${names.join(", ")}
      </div>
    `)
    .join("");

  const projectsList = data.projects
    .map(
      (p) => `
      <div class="project-item">
        • <strong>${p.title}</strong>${p.role ? ` (${p.role})` : ""}: ${p.description || ""}
        ${p.techStack ? `<div class="project-tech"><strong>Tech Stack:</strong> ${p.techStack}</div>` : ""}
      </div>
    `
    )
    .join("");

  const experienceList = data.workExperiences
    .map((exp) => {
      const bullets = (exp.description || "")
        .split("\n")
        .map((b) => b.trim())
        .filter((b) => b.length > 0)
        .map((b) => `<li>${b}</li>`)
        .join("");

      return `
        <div class="experience-item">
          <div class="section-row">
            <strong>${exp.company}</strong>
            <span>${exp.startDate} - ${exp.endDate}</span>
          </div>
          <div class="experience-role"><em>${exp.role}</em></div>
          ${bullets ? `<ul class="experience-bullets">${bullets}</ul>` : ""}
        </div>
      `;
    })
    .join("");

  const publicationsList = data.publications
    .map(
      (pub) => `
      <div class="publication-item">
        • <strong>${pub.title}</strong> ${pub.publishedAt ? `${pub.publishedAt}` : ""}
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
          line-height: 1.4;
          margin: 0;
          padding: 0;
          font-size: 10pt;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          font-size: 22pt;
          margin-top: 0;
          margin-bottom: 5px;
          color: #1a202c;
          text-align: center;
          font-weight: bold;
        }
        .contact-info {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 9.5pt;
          margin-bottom: 18px;
          color: #2d3748;
        }
        .contact-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .contact-item a {
          color: #0c66e4;
          text-decoration: none;
        }
        .contact-item a:hover {
          text-decoration: underline;
        }
        .contact-icon {
          width: 12px;
          height: 12px;
          fill: #2d3748;
          flex-shrink: 0;
        }
        h2 {
          font-size: 12.5pt;
          border-bottom: 1px solid #1a202c;
          padding-bottom: 2px;
          margin-top: 16px;
          margin-bottom: 8px;
          text-transform: none;
          color: #1a202c;
          font-weight: bold;
        }
        .section-row {
          display: flex;
          justify-content: space-between;
          font-size: 10.5pt;
        }
        .education-item {
          margin-bottom: 10px;
        }
        .education-degree {
          font-size: 10.2pt;
          margin-top: 1px;
        }
        .education-coursework {
          font-size: 9.5pt;
          color: #2d3748;
          margin-top: 2px;
        }
        .skill-group {
          font-size: 10pt;
          margin-bottom: 4px;
        }
        .project-item {
          margin-bottom: 8px;
          padding-left: 15px;
          text-indent: -15px;
          text-align: justify;
        }
        .project-tech {
          margin-left: 15px;
          text-indent: 0;
          font-size: 9.5pt;
          color: #1a202c;
          margin-top: 2px;
        }
        .experience-item {
          margin-bottom: 10px;
        }
        .experience-role {
          font-size: 10pt;
          margin-top: 1px;
        }
        .experience-bullets {
          margin-top: 4px;
          margin-bottom: 0;
          padding-left: 20px;
        }
        .experience-bullets li {
          font-size: 9.5pt;
          margin-bottom: 2px;
          text-align: justify;
        }
        .publication-item {
          margin-bottom: 6px;
          padding-left: 15px;
          text-indent: -15px;
          text-align: justify;
        }
        .summary-box {
          font-size: 9.8pt;
          color: #1a202c;
          text-align: justify;
        }
        ${
          data.atsScore !== undefined
            ? `
        .ats-badge {
          display: block;
          text-align: right;
          font-size: 8.5pt;
          color: #718096;
          margin-bottom: 8px;
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
          ${data.email ? `<div class="contact-item">
            <svg class="contact-icon" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            <a href="mailto:${data.email}">${data.email}</a>
          </div>` : ""}
          ${data.phoneNumber ? `<div class="contact-item">
            <svg class="contact-icon" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
            <span>${data.phoneNumber}</span>
          </div>` : ""}
          ${data.githubHandle ? `<div class="contact-item">
            <svg class="contact-icon" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
            <a href="https://github.com/${data.githubHandle}" target="_blank">github.com/${data.githubHandle}</a>
          </div>` : ""}
          ${data.linkedinUrl ? `<div class="contact-item">
            <svg class="contact-icon" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            <a href="${data.linkedinUrl}" target="_blank">${data.linkedinUrl.replace(/https?:\/\/(www\.)?/, "")}</a>
          </div>` : ""}
          ${data.portfolioUrl ? `<div class="contact-item">
            <svg class="contact-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
            <a href="${data.portfolioUrl}" target="_blank">${data.portfolioUrl.replace(/https?:\/\/(www\.)?/, "")}</a>
          </div>` : ""}
        </div>

        ${data.atsScore !== undefined ? `<div class="ats-badge">ATS Profile Match Score: <strong>${data.atsScore}%</strong> (${data.targetRoleName || "Target Role"})</div>` : ""}

        ${
          data.bio
            ? `
        <h2>Executive Summary</h2>
        <div class="summary-box">
          ${data.bio}
        </div>
        `
            : ""
        }

        <h2>Skills</h2>
        <div class="skills-section">
          ${skillsList || '<div class="skill-group">General Technical Skills</div>'}
        </div>

        <h2>Project Work</h2>
        <div class="projects-list">
          ${projectsList || "<p>Collaborated on various university projects and coursework.</p>"}
        </div>

        ${
          experienceList
            ? `
        <h2>Work Experience</h2>
        <div class="experience-list">
          ${experienceList}
        </div>
        `
            : ""
        }

        <h2>Education</h2>
        <div class="education-item">
          <div class="section-row">
            <strong>${data.universityName}</strong>
            <span>${data.graduationYear ? `2022 - ${data.graduationYear}` : "2022 - 2026"}</span>
          </div>
          <div class="education-degree">Bachelor of Science in ${data.departmentName}</div>
          ${data.relevantCoursework ? `<div class="education-coursework">Relevant Coursework: ${data.relevantCoursework}</div>` : ""}
        </div>

        ${
          publicationsList
            ? `
        <h2>Research & Publications</h2>
        <div class="publications-list">
          ${publicationsList}
        </div>
        `
            : ""
        }
      </div>
    </body>
    </html>
  `;
}

// Default values helper for Mahin's first-time setup
async function ensureMahinDefaultResumeDetails(studentId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.studentProfile.update({
      where: { id: studentId },
      data: {
        phoneNumber: "+8801873306762",
        relevantCoursework: "Object Oriented Programming, Databases Management System, Discrete Maths, Data Structures and Algorithms, Computer Networks"
      }
    });

    await tx.workExperience.createMany({
      data: [
        {
          studentProfileId: studentId,
          company: "IEEE Computer Society UIU SB",
          role: "Secretary",
          startDate: "2025",
          endDate: "2026",
          description: "Organized logistics for 10+ university tech events, ensuring smooth execution.\nDrafted minutes and reports for chapter meetings, maintaining IEEE compliance.\nManaged communication with 100+ members for workshops and competitions."
        },
        {
          studentProfileId: studentId,
          company: "UIUEDF",
          role: "Jr. Executive, Event Department",
          startDate: "2023",
          endDate: "2024",
          description: "Assisted in organizing and managing university events.\nCoordinated logistics and collaborated with teams.\nEngaged with sponsors and participants for smooth execution."
        }
      ]
    });

    await tx.researchPublication.createMany({
      data: [
        {
          studentProfileId: studentId,
          title: "Blockchain-Based Hajj Pilgrim Registration System: Enhancing Transparency and Security",
          publishedAt: "(PID: 273). Authored and presented at SPICSCON2025, 2025.",
          url: "https://github.com/mahin273"
        }
      ]
    });
  });
}

// Load resume details for preview or export
export async function getResumeData(userId: string, roleId?: string) {
  let student = await prisma.studentProfile.findUnique({
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
      university: true,
      workExperiences: true,
      publications: true
    }
  });

  if (!student) {
    throw new Error("STUDENT_NOT_FOUND");
  }

  // Pre-populate dynamic details for Mahin if database is empty
  if (student.user.email === "md.mahin.bd18@gmail.com" &&
      student.workExperiences.length === 0 &&
      student.publications.length === 0 &&
      !student.phoneNumber) {
    await ensureMahinDefaultResumeDetails(student.id);
    // Re-fetch
    student = await prisma.studentProfile.findUnique({
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
        university: true,
        workExperiences: true,
        publications: true
      }
    });
    if (!student) {
      throw new Error("STUDENT_NOT_FOUND");
    }
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
  const ownedProjects = student.user.ownedProjects.map((p) => {
    let techStack = "";
    let cleanDescription = p.description || "";
    const techStackMatch = cleanDescription.match(/Tech Stack:\s*(.*)/i);
    if (techStackMatch) {
      techStack = techStackMatch[1].trim();
      cleanDescription = cleanDescription.replace(/Tech Stack:\s*(.*)/i, "").trim();
    }
    return {
      title: p.title,
      description: cleanDescription,
      role: p.isCapstone ? "Project Owner (Capstone)" : "Project Owner",
      date: p.startDate ? new Date(p.startDate).getFullYear().toString() : new Date().getFullYear().toString(),
      techStack
    };
  });

  const collaboratedProjects = student.user.collaborations.map((collab) => {
    let techStack = "";
    let cleanDescription = collab.project.description || "";
    const techStackMatch = cleanDescription.match(/Tech Stack:\s*(.*)/i);
    if (techStackMatch) {
      techStack = techStackMatch[1].trim();
      cleanDescription = cleanDescription.replace(/Tech Stack:\s*(.*)/i, "").trim();
    }
    return {
      title: collab.project.title,
      description: cleanDescription,
      role: collab.role || "Collaborator",
      date: collab.project.startDate
        ? new Date(collab.project.startDate).getFullYear().toString()
        : new Date().getFullYear().toString(),
      techStack
    };
  });

  let allProjects = [...ownedProjects, ...collaboratedProjects];

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

  // Check custom details and use empty states if not entered
  const workExperiences = student.workExperiences.map(w => ({
    company: w.company,
    role: w.role,
    startDate: w.startDate,
    endDate: w.endDate,
    description: w.description
  }));

  const publications = student.publications.map(p => ({
    title: p.title,
    publishedAt: p.publishedAt,
    url: p.url
  }));

  const phoneNumber = student.phoneNumber || null;
  const bio = student.bio || null;
  const relevantCoursework = student.relevantCoursework || null;

  return {
    student,
    fullName: student.user.fullName,
    email: student.user.email,
    githubHandle: student.user.githubHandle,
    linkedinUrl: student.linkedinUrl,
    portfolioUrl: student.portfolioUrl,
    bio,
    phoneNumber,
    relevantCoursework,
    universityName: student.university?.name || "United International University",
    departmentName: student.department?.name || "Computer Science and Engineering",
    graduationYear: student.graduationYear,
    skills: optimizedSkills,
    projects: allProjects,
    workExperiences,
    publications,
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

// GET Custom Resume/CV details (Phone, Work Experience, Publications)
export async function getResumeDetails(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  try {
    let student = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        user: true,
        workExperiences: true,
        publications: true
      }
    });

    if (!student) {
      fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
      return;
    }

    // Auto-initialize default resume database rows for Mahin's first visit
    if (student.user.email === "md.mahin.bd18@gmail.com" &&
        student.workExperiences.length === 0 &&
        student.publications.length === 0 &&
        !student.phoneNumber) {
      await ensureMahinDefaultResumeDetails(student.id);
      student = await prisma.studentProfile.findUnique({
        where: { userId: req.user.id },
        include: {
          user: true,
          workExperiences: true,
          publications: true
        }
      });
      if (!student) {
        fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
        return;
      }
    }

    const workExperiences = student.workExperiences.map(w => ({
      company: w.company,
      role: w.role,
      startDate: w.startDate,
      endDate: w.endDate,
      description: w.description
    }));

    const publications = student.publications.map(p => ({
      title: p.title,
      publishedAt: p.publishedAt,
      url: p.url
    }));

    ok(res, {
      phoneNumber: student.phoneNumber || "",
      relevantCoursework: student.relevantCoursework || "",
      workExperiences,
      publications
    });
  } catch (error) {
    console.error("Failed to get resume details:", error);
    fail(res, "INTERNAL_ERROR", "Failed to retrieve resume details", 500);
  }
}

// POST Save Custom Resume/CV details
export async function saveResumeDetails(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const schema = z.object({
    phoneNumber: z.string().trim().nullable().optional(),
    relevantCoursework: z.string().trim().nullable().optional(),
    workExperiences: z.array(z.object({
      company: z.string().trim().min(1),
      role: z.string().trim().min(1),
      startDate: z.string().trim().min(1),
      endDate: z.string().trim().min(1),
      description: z.string().trim().nullable().optional()
    })),
    publications: z.array(z.object({
      title: z.string().trim().min(1),
      publishedAt: z.string().trim().nullable().optional(),
      url: z.string().trim().nullable().optional()
    }))
  });

  try {
    const payload = schema.parse(req.body);

    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
      return;
    }

    // Execute in a transaction: delete old experiences/publications, save phone number, coursework and bulk insert new details
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update StudentProfile phoneNumber and relevantCoursework
      const updatedProfile = await tx.studentProfile.update({
        where: { id: student.id },
        data: { 
          phoneNumber: payload.phoneNumber || null,
          relevantCoursework: payload.relevantCoursework || null
        }
      });

      // 2. Delete existing experiences and publications
      await tx.workExperience.deleteMany({
        where: { studentProfileId: student.id }
      });
      await tx.researchPublication.deleteMany({
        where: { studentProfileId: student.id }
      });

      // 3. Create new experiences
      if (payload.workExperiences.length > 0) {
        await tx.workExperience.createMany({
          data: payload.workExperiences.map(w => ({
            studentProfileId: student.id,
            company: w.company,
            role: w.role,
            startDate: w.startDate,
            endDate: w.endDate,
            description: w.description || null
          }))
        });
      }

      // 4. Create new publications
      if (payload.publications.length > 0) {
        await tx.researchPublication.createMany({
          data: payload.publications.map(p => ({
            studentProfileId: student.id,
            title: p.title,
            publishedAt: p.publishedAt || null,
            url: p.url || null
          }))
        });
      }

      // Fetch newly inserted values
      const experiences = await tx.workExperience.findMany({
        where: { studentProfileId: student.id }
      });
      const pubs = await tx.researchPublication.findMany({
        where: { studentProfileId: student.id }
      });

      return {
        phoneNumber: updatedProfile.phoneNumber,
        relevantCoursework: updatedProfile.relevantCoursework,
        workExperiences: experiences,
        publications: pubs
      };
    });

    ok(res, result);
  } catch (error: any) {
    console.error("Failed to save resume details:", error);
    fail(res, "INTERNAL_ERROR", error.message || "Failed to save resume details", 500);
  }
}