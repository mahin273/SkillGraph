import { describe, expect, test, jest, beforeEach, afterEach } from "@jest/globals";

// Mock dependencies
jest.unstable_mockModule("../src/config/neo4j.js", () => ({
  runRead: jest.fn(),
  runWrite: jest.fn()
}));

jest.unstable_mockModule("@skillgraph/database", () => ({
  prisma: {
    studentProfile: {
      findUnique: jest.fn()
    },
    githubCommit: {
      findFirst: jest.fn()
    },
    skillDecayAudit: {
      findUnique: jest.fn(),
      upsert: jest.fn()
    },
    systemNotification: {
      create: jest.fn()
    }
  }
}));

const { runRead, runWrite } = await import("../src/config/neo4j.js");
const { prisma } = await import("@skillgraph/database");
const { runDecayCycle } = await import("../src/jobs/decayCycle.job.js");

describe("Decay Cycle Job", () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test("should skip decay if no student profile is found", async () => {
    const mockRecord = {
      userId: "user-1",
      skillName: "Python",
      currentProficiency: 0.8,
      confidence: 0.8,
      sourceRepos: ["repo1"],
      lastActive: Date.now()
    };

    (runRead as any).mockResolvedValueOnce([mockRecord]);
    (prisma.studentProfile.findUnique as any).mockResolvedValueOnce(null);

    await runDecayCycle();

    expect(runRead).toHaveBeenCalled();
    expect(prisma.studentProfile.findUnique).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(prisma.githubCommit.findFirst).not.toHaveBeenCalled();
  });

  test("should decay skill by 15% if last commit was over 12 months ago", async () => {
    const mockRecord = {
      userId: "user-1",
      skillName: "Python",
      currentProficiency: 0.8,
      confidence: 0.8,
      sourceRepos: ["repo1"],
      lastActive: null
    };

    const mockProfile = { id: "profile-1", userId: "user-1" };

    // Last active date 13 months ago
    const thirteenMonthsAgo = new Date();
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

    (runRead as any).mockResolvedValueOnce([mockRecord]);
    (prisma.studentProfile.findUnique as any).mockResolvedValueOnce(mockProfile);
    (prisma.githubCommit.findFirst as any).mockResolvedValueOnce({
      committedAt: thirteenMonthsAgo
    });
    // No prior audit log (or not dormant, and decayed > 30 days ago)
    (prisma.skillDecayAudit.findUnique as any).mockResolvedValueOnce(null);

    await runDecayCycle();

    // Verify Neo4j update
    expect(runWrite).toHaveBeenCalledWith(
      expect.stringContaining("SET knows.proficiency = $newProficiency"),
      expect.objectContaining({
        userId: "user-1",
        skillName: "Python",
        newProficiency: 0.8 * 0.85, // 15% decay
        isDormant: false
      })
    );

    // Verify Prisma upsert
    expect(prisma.skillDecayAudit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId_skillName: { studentId: "profile-1", skillName: "Python" }
        },
        create: expect.objectContaining({
          studentId: "profile-1",
          skillName: "Python",
          currentWeight: 0.8 * 0.85
        })
      })
    );

    // Verify Notification creation
    expect(prisma.systemNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          type: "SKILL_DECAY"
        })
      })
    );
  });
});
