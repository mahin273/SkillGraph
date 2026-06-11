import jwt from "jsonwebtoken"
import type { UserRole } from "@prisma/client";
import { env } from "../config/env.js";
import { globalConfig } from "../config/platform.js";

export type AccessTokenPayload = {
  sub:string;
  role:UserRole;
  githubHandle?:string;
  universityId?:string;
  isVerified:boolean;
}

const developmentSecret = crypto.randomUUID();
function signingKey(){
 const configured= env.JWT_PRIVATE_KEY;
 if(!configured ){
  return developmentSecret;
 }
 return configured.replace(/\\n/g,"\n");
}

function verificationKey(){
 const configured= env.JWT_PUBLIC_KEY;
if(!configured){
  return signingKey();
}
return configured.replace(/\\n/g,"\n");
}

function algorithm(){
  return signingKey().includes("BEGIN")?"RS256":"HS256"
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, signingKey(), {
    algorithm: algorithm(),
    audience: env.JWT_AUDIENCE,
    expiresIn: globalConfig.sessionDurationSeconds,
    issuer: env.JWT_ISSUER
  });
}

export function signRefreshToken(payload: Pick<AccessTokenPayload, "sub">) {
  return jwt.sign(payload, signingKey(), {
    algorithm: algorithm(),
    audience: env.JWT_AUDIENCE,
    expiresIn: "7d",
    issuer: env.JWT_ISSUER
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, verificationKey(), {
    algorithms: [algorithm()],
    audience: env.JWT_AUDIENCE,
    issuer: env.JWT_ISSUER
  }) as jwt.JwtPayload & AccessTokenPayload;
}
