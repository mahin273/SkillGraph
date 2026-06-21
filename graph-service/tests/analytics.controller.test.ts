import { describe, expect, test, jest, beforeEach, afterEach } from "@jest/globals";
import { Request, Response } from "express";

// Mock the dependencies
jest.unstable_mockModule("../src/neo4j/driver.js", () => ({
  runRead: jest.fn()
}));

jest.unstable_mockModule("@skillgraph/database", () => ({
  prisma: {
    studentLearningPath: {
      findMany: jest.fn()
    }
  }
}));

// Dynamic imports after mocking
const { runRead } = await import("../src/neo4j/driver.js");
const { prisma } = await import("@skillgraph/database");
const { getSkillHeatmap, getIndustryGap, getMissingSkills, getSkillTrends } = await import("../src/controllers/analytics.controller.js");

describe("Analytics Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRequest = { query: {} };
    mockResponse = {
      json: jsonMock,
      status: statusMock
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("getSkillHeatmap", () => {
    test("should retrieve skill heatmap successfully without universityId", async () => {
      const mockRecords = [
        { name: "Python", category: "Language", count: 10 },
        { name: "React", category: "Library", count: { low: 5, high: 0 } }
      ];
      (runRead as any).mockResolvedValueOnce(mockRecords);

      await getSkillHeatmap(mockRequest as Request, mockResponse as Response);

      expect(runRead).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [
          { name: "Python", category: "Language", count: 10 },
          { name: "React", category: "Library", count: 5 }
        ]
      });
    });

    test("should handle query parameter universityId", async () => {
      mockRequest.query = { universityId: "univ-123" };
      (runRead as any).mockResolvedValueOnce([]);

      await getSkillHeatmap(mockRequest as Request, mockResponse as Response);

      expect(runRead).toHaveBeenCalledWith(expect.any(String), { universityId: "univ-123" });
    });

    test("should return 500 error if query fails", async () => {
      (runRead as any).mockRejectedValueOnce(new Error("Neo4j error"));

      await getSkillHeatmap(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: { message: "Internal server error" }
      });
    });
  });

  describe("getIndustryGap", () => {
    test("should retrieve industry gap successfully", async () => {
      const mockRecords = [
        { roleTitle: "Backend Developer", roleId: "role-1", skillName: "NodeJS", industryRequired: 4.5, studentAverage: 3.2 }
      ];
      (runRead as any).mockResolvedValueOnce(mockRecords);

      await getIndustryGap(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockRecords
      });
    });
  });

  describe("getMissingSkills", () => {
    test("should retrieve missing skills aggregated successfully", async () => {
      const mockPaths = [
        { missingSkillsJson: ["Docker", "Kubernetes"] },
        { missingSkillsJson: ["Docker", { name: "TypeScript" }] }
      ];
      (prisma.studentLearningPath.findMany as any).mockResolvedValueOnce(mockPaths);

      await getMissingSkills(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [
          { name: "Docker", count: 2 },
          { name: "Kubernetes", count: 1 },
          { name: "TypeScript", count: 1 }
        ]
      });
    });
  });

  describe("getSkillTrends", () => {
    test("should retrieve skill trends successfully and simulate growth if only one date", async () => {
      const mockRecords = [
        { name: "Python", category: "Language", date: "2026-06", count: 10 }
      ];
      (runRead as any).mockResolvedValueOnce(mockRecords);

      await getSkillTrends(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.arrayContaining([
          { name: "Python", category: "Language", date: "2026-06", count: 10 },
          { name: "Python", category: "Language", date: "2026-05", count: 7 }
        ])
      });
    });
  });
});
