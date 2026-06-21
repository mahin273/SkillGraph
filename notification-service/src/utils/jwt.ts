import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AccessTokenPayload = {
  sub: string;
  role: string;
  githubHandle: string;
};

const developmentSecret = crypto.randomUUID();

function verificationKey() {
  const configured = env.JWT_PUBLIC_KEY;
  if (!configured) {
    const privateKey = env.JWT_PRIVATE_KEY;
    if (!privateKey) return developmentSecret;
    return privateKey.replace(/\\n/g, "\n");
  }
  return configured.replace(/\\n/g, "\n");
}

function algorithm() {
  return verificationKey().includes("BEGIN") ? "RS256" : "HS256";
}

export function verifyToken(token: string) {
  return jwt.verify(token, verificationKey(), {
    algorithms: [algorithm()],
    audience: env.JWT_AUDIENCE,
    issuer: env.JWT_ISSUER
  }) as jwt.JwtPayload & AccessTokenPayload;
}
