import { describe, expect, test, beforeEach } from "vitest";
import { useAuthStore } from "../src/store/auth.store";

describe("Auth Store (Zustand)", () => {
  beforeEach(() => {
    // Reset state before each test
    useAuthStore.getState().clearUser();
  });

  test("should start with undefined user fields", () => {
    const state = useAuthStore.getState();
    expect(state.userId).toBeUndefined();
    expect(state.fullName).toBeUndefined();
    expect(state.role).toBeUndefined();
  });

  test("should set userId correctly using setUserId", () => {
    useAuthStore.getState().setUserId("user-123");
    const state = useAuthStore.getState();
    expect(state.userId).toBe("user-123");
  });

  test("should set all user fields correctly using setUser", () => {
    const userPayload = {
      id: "user-456",
      fullName: "Jane Doe",
      role: "ADMIN",
      githubHandle: "janedoe",
      email: "jane@example.com",
      emailVerified: true,
      isVerified: true,
      githubConnected: true,
      googleConnected: false,
      publicHandle: "jane-p",
      avatarUrl: "http://example.com/avatar.png",
      academicProfile: null
    };

    useAuthStore.getState().setUser(userPayload);

    const state = useAuthStore.getState();
    expect(state.userId).toBe("user-456");
    expect(state.fullName).toBe("Jane Doe");
    expect(state.role).toBe("ADMIN");
    expect(state.githubHandle).toBe("janedoe");
    expect(state.email).toBe("jane@example.com");
    expect(state.emailVerified).toBe(true);
    expect(state.isVerified).toBe(true);
    expect(state.githubConnected).toBe(true);
    expect(state.googleConnected).toBe(false);
    expect(state.publicHandle).toBe("jane-p");
    expect(state.avatarUrl).toBe("http://example.com/avatar.png");
    expect(state.academicProfile).toBeNull();
  });

  test("should clear user fields correctly using clearUser", () => {
    // Set first
    useAuthStore.getState().setUserId("user-123");
    expect(useAuthStore.getState().userId).toBe("user-123");

    // Clear
    useAuthStore.getState().clearUser();
    const state = useAuthStore.getState();
    expect(state.userId).toBeUndefined();
    expect(state.fullName).toBeUndefined();
  });
});
