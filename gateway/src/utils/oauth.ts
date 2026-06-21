export type OAuthProvider = "github" | "google";

export function frontendOAuthCallbackPath(provider: OAuthProvider) {
  return `/api/auth/${provider}/callback`;
}

export function oauthCallbackUrl(provider: OAuthProvider, configuredUrl: string | undefined, frontendUrl: string) {
  if (configuredUrl?.trim()) return configuredUrl;

  return `${frontendUrl.replace(/\/$/, "")}${frontendOAuthCallbackPath(provider)}`;
}

export function isOAuthLinkRequest(state: unknown) {
  return state === "link";
}
