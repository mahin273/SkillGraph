import { describe, expect, test, jest, beforeEach } from "@jest/globals";
import { Request, Response } from "express";

// Mock the dependencies
jest.unstable_mockModule("../src/neo4j/driver.js", () => ({
  runRead: jest.fn()
}));

jest.unstable_mockModule("@skillgraph/database", () => ({
  prisma: {
    industryRole: {
      findUnique: jest.fn()
    },
    studentProfile: {
      findUnique: jest.fn()
    },
    learningResource: {
      findMany: jest.fn()
    },
    studentLearningPath: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  }
}));

const { runRead } = await import("../src/neo4j/driver.js");
const { prisma } = await import("@skillgraph/database");
const { getCareerGPS, saveCareerGPS, getCareerGPSHistory } = await import("../src/controllers/careerGps.controller.js");

describe("Career GPS Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRequest = { query: {}, body: {}, params: {} };
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };
  });

  describe("getCareerGPS", () => {
    test("should return 400 if studentId or targetRoleId is missing", async () => {
      mockRequest.query = {};
      await getCareerGPS(mockRequest as Request, mockResponse as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test("should return 404 if targetRole is not found", async () => {
      mockRequest.query = { studentId: "stud-1", targetRoleId: "role-1" };
      (prisma.industryRole.findUnique as any).mockResolvedValueOnce(null);

      await getCareerGPS(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test("should calculate completed/missing skills and roadmap successfully", async () => {
      mockRequest.query = { studentId: "stud-1", targetRoleId: "role-1" };
      
      const mockRole = {
        id: "role-1",
        title: "Frontend Engineer",
        description: "Build interfaces",
        requirements: [
          {
            criticality: 0.8,
            skill: { id: "skill-react", name: "React", aliases: ["ReactJS"], category: { name: "Framework" } }
          },
          {
            criticality: 0.9,
            skill: { id: "skill-node", name: "NodeJS", aliases: [], category: { name: "Backend" } }
          }
        ]
      };
      (prisma.industryRole.findUnique as any).mockResolvedValueOnce(mockRole);

      // Student only knows React
      const mockStudentSkills = [
        { id: "skill-react", name: "React", category: "Framework", proficiency: 0.8, confidence: 0.9 }
      ];
      (runRead as any).mockResolvedValueOnce(mockStudentSkills);

      (prisma.learningResource.findMany as any).mockResolvedValueOnce([]);

      await getCareerGPS(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          studentId: "stud-1",
          totalSkillsRequired: 2,
          skillsCompleted: 1,
          skillsRemaining: 1,
          completedSkills: expect.arrayContaining([
            expect.objectContaining({ id: "skill-react" })
          ]),
          missingSkills: expect.arrayContaining([
            expect.objectContaining({ id: "skill-node" })
          ]),
          roadmap: expect.any(Array)
        })
      });
    });
  });

  describe("saveCareerGPS", () => {
    test("should return 400 if studentId or targetRoleId is missing", async () => {
      mockRequest.body = {};
      await saveCareerGPS(mockRequest as Request, mockResponse as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    test("should create new learning path if none exists", async () => {
      mockRequest.body = { studentId: "user-123", targetRoleId: "role-1", completionPercentage: 50, estimatedWeeks: 4 };
      (prisma.studentProfile.findUnique as any).mockResolvedValueOnce({ id: "profile-1" });
      (prisma.studentLearningPath.findFirst as any).mockResolvedValueOnce(null);
      (prisma.studentLearningPath.create as any).mockResolvedValueOnce({ id: "path-123" });

      await saveCareerGPS(mockRequest as Request, mockResponse as Response);

      expect(prisma.studentLearningPath.create).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          message: "Career GPS saved successfully",
          saved: true,
          pathId: "path-123",
          estimatedWeeks: 4
        }
      });
    });
  });

  describe("getCareerGPSHistory", () => {
    test("should return empty history if student is not found", async () => {
      mockRequest.params = { studentId: "stud-unknown" };
      (prisma.studentProfile.findUnique as any).mockResolvedValueOnce(null);

      await getCareerGPSHistory(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { history: [] }
      });
    });

    test("should return history list successfully", async () => {
      mockRequest.params = { studentId: "stud-1" };
      (prisma.studentProfile.findUnique as any).mockResolvedValueOnce({ id: "profile-1" });
      (prisma.studentLearningPath.findMany as any).mockResolvedValueOnce([
        {
          id: "path-1",
          roleId: "role-1",
          completionPct: 60,
          createdAt: new Date(),
          lastComputedAt: new Date(),
          roadmapJson: [{ estimatedWeeks: 2 }, { estimatedWeeks: 3 }],
          role: { title: "Software Engineer" }
        }
      ]);

      await getCareerGPSHistory(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          history: [
            expect.objectContaining({
              id: "path-1",
              roleName: "Software Engineer",
              completionPercentage: 60,
              estimatedWeeks: 5
            })
          ]
        }
      });
    });
  });
});
