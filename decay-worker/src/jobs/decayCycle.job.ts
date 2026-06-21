import { prisma } from "@skillgraph/database";
import { runRead, runWrite } from "../config/neo4j.js";

interface KnowsEdge {
  userId: string;
  skillName: string;
  currentProficiency: number;
  confidence: number;
  sourceRepos: string[];
  lastActive: number | null;
}

export async function runDecayCycle() {
  console.log("Starting skill decay cycle...");
  try {
    // 1. Get all knows relationships from Neo4j
    const query = `
      MATCH (student:Student)-[knows:KNOWS]->(skill:Skill)
      RETURN student.id AS userId,
             skill.name AS skillName,
             coalesce(knows.proficiency, knows.confidence) AS currentProficiency,
             knows.confidence AS confidence,
             knows.sourceRepos AS sourceRepos,
             knows.lastActive AS lastActive
    `;
    const records = await runRead<KnowsEdge>(query);
    console.log(`Retrieved ${records.length} skill relationships from Neo4j`);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    for (const record of records) {
      const { userId, skillName, currentProficiency, sourceRepos, lastActive } = record;

      // Find the StudentProfile associated with this userId
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId }
      });

      if (!studentProfile) {
        continue;
      }

      const studentId = studentProfile.id;

      // Find the latest commit date in PostgreSQL for repositories listed in sourceRepos
      let lastActiveDate: Date | null = null;

      if (sourceRepos && sourceRepos.length > 0) {
        const latestCommit = await prisma.githubCommit.findFirst({
          where: {
            repository: {
              userId,
              OR: [
                { repoName: { in: sourceRepos } },
                { fullName: { in: sourceRepos } }
              ]
            }
          },
          orderBy: { committedAt: "desc" }
        });
        if (latestCommit) {
          lastActiveDate = latestCommit.committedAt;
        }
      }

      // Fallback to Neo4j lastActive (timestamp in ms)
      if (!lastActiveDate && lastActive) {
        lastActiveDate = new Date(lastActive);
      }

      // If still no last active date, skip decay
      if (!lastActiveDate) {
        continue;
      }

      // Check if the last active date is over 12 months ago
      if (lastActiveDate < twelveMonthsAgo) {
        // Fetch existing audit record if any
        const existingAudit = await prisma.skillDecayAudit.findUnique({
          where: {
            studentId_skillName: {
              studentId,
              skillName
            }
          }
        });

        // If already dormant, skip
        if (existingAudit?.isDormant) {
          continue;
        }

        // If decayed recently (e.g. in the last 30 days), skip to avoid multiple decays in same period
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (existingAudit?.lastDecayedAt && existingAudit.lastDecayedAt > thirtyDaysAgo) {
          continue;
        }

        // Apply decay formula: 15% decay
        const newProficiency = currentProficiency * 0.85;
        const isDormant = newProficiency < 0.10;

        console.log(`Decaying skill "${skillName}" for student "${studentId}". New proficiency: ${newProficiency.toFixed(2)}`);

        // Update Neo4j
        await runWrite(
          `
          MATCH (student:Student {id: $userId})-[knows:KNOWS]->(skill:Skill {name: $skillName})
          SET knows.proficiency = $newProficiency,
              knows.dormant = $isDormant
          `,
          { userId, skillName, newProficiency, isDormant }
        );

        // Upsert PostgreSQL SkillDecayAudit
        await prisma.skillDecayAudit.upsert({
          where: {
            studentId_skillName: {
              studentId,
              skillName
            }
          },
          update: {
            currentWeight: newProficiency,
            isDormant,
            decayCycles: (existingAudit?.decayCycles ?? 0) + 1,
            lastDecayedAt: new Date(),
            lastActiveDate
          },
          create: {
            studentId,
            skillName,
            currentWeight: newProficiency,
            isDormant,
            decayCycles: 1,
            lastDecayedAt: new Date(),
            lastActiveDate
          }
        });

        // Create a system notification for the student user
        try {
          await prisma.systemNotification.create({
            data: {
              userId,
              type: "SKILL_DECAY",
              payload: {
                skillName,
                oldWeight: currentProficiency,
                newWeight: newProficiency,
                isDormant,
                warningText: `Your skill "${skillName}" has decayed by 15% to ${(newProficiency * 100).toFixed(0)}% due to inactivity over the last 12 months. Make new commits containing this skill to restore your proficiency.`
              }
            }
          });
        } catch (notifErr) {
          console.error("Failed to create decay notification:", notifErr);
        }
      }
    }
    console.log("Skill decay cycle completed.");
  } catch (error) {
    console.error("Error running skill decay cycle:", error);
  }
}