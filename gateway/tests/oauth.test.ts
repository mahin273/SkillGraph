import { describe, expect, test } from "@jest/globals";
import { frontendOAuthCallbackPath, isOAuthLinkRequest, oauthCallbackUrl } from "../src/utils/oauth.js";

describe("OAuth helpers", () => {
  test("returns the frontend callback bridge path for each provider", () => {
    expect(frontendOAuthCallbackPath("google")).toBe("/api/auth/google/callback");
    expect(frontendOAuthCallbackPath("github")).toBe("/api/auth/github/callback");
  });

  test("prefers an explicitly configured callback URL", () => {
    expect(oauthCallbackUrl(
      "google",
      "http://localhost:5173/api/auth/google/callback",
      "http://localhost:5173"
    )).toBe("http://localhost:5173/api/auth/google/callback");
  });

  test("falls back to the frontend callback bridge without duplicating slashes", () => {
    expect(oauthCallbackUrl("github", undefined, "http://localhost:5173/"))
      .toBe("http://localhost:5173/api/auth/github/callback");
  });

  test("only treats state=link as an account-linking OAuth request", () => {
    expect(isOAuthLinkRequest("link")).toBe(true);
    expect(isOAuthLinkRequest("login")).toBe(false);
    expect(isOAuthLinkRequest(undefined)).toBe(false);
    expect(isOAuthLinkRequest(["link"])).toBe(false);
  });
});
