// @vitest-environment jsdom
import { describe, expect, test, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMatchmaker } from "../src/hooks/useMatchmaker";

// Mock the service functions
vi.mock("../src/services/matchmaker.service", () => ({
  findMatchmakerCandidates: vi.fn(),
  sendMatchInvite: vi.fn()
}));

// Import mocked service to reference mock calls/implementations
import { findMatchmakerCandidates, sendMatchInvite } from "../src/services/matchmaker.service";

describe("useMatchmaker Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should initialize with default states", () => {
    const { result } = renderHook(() => useMatchmaker());

    expect(result.current.candidates).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("should fetch candidates successfully", async () => {
    const mockCandidates = [
      { id: "cand-1", name: "Alice", similarity: 0.9, matchedSkills: ["React"] }
    ];
    (findMatchmakerCandidates as any).mockResolvedValueOnce({
      candidates: mockCandidates
    });

    const { result } = renderHook(() => useMatchmaker());

    // Call findCandidates
    await act(async () => {
      await result.current.findCandidates({
        requiredSkills: ["React"],
        scope: "GLOBAL" as any
      });
    });

    expect(findMatchmakerCandidates).toHaveBeenCalledWith({
      requiredSkills: ["React"],
      scope: "GLOBAL",
      limit: 20
    });
    expect(result.current.candidates).toEqual(mockCandidates);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("should handle error when fetching candidates fails", async () => {
    (findMatchmakerCandidates as any).mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => useMatchmaker());

    await act(async () => {
      await result.current.findCandidates({
        requiredSkills: ["React"],
        scope: "GLOBAL" as any
      });
    });

    expect(result.current.candidates).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("Network Error");
  });

  test("should invoke invite service function successfully", async () => {
    (sendMatchInvite as any).mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useMatchmaker());

    const inviteData = {
      candidateId: "cand-1",
      projectName: "New project",
      requiredSkills: ["React"],
      message: "Join us"
    };

    await act(async () => {
      await result.current.invite(inviteData);
    });

    expect(sendMatchInvite).toHaveBeenCalledWith(inviteData);
  });
});
