import crypto from "crypto";
import { createHash } from "crypto";
import{env} from "../config/env.js"

const algorithm = "aes-256-gcm"

function key(){
const raw = env.TOKEN_ENCRYPTION_KEY;
  try{
const decoded = Buffer.from(raw,"base64")
if(decoded.length===32) return decoded;
  }catch{
    throw new Error("INVALID_KEY")
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptToken(token:string){
  const iv=crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(algorithm,key(),iv)
  const encrypted = Buffer.concat([
    cipher.update(token,"utf-8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag()
  return[iv,tag,encrypted].map((part)=>part.toString("base64")).join(".")
}


export function decryptToken(payload: string) {
  const [ivRaw, tagRaw, encryptedRaw] = payload.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid encrypted token");
  const decipher = crypto.createDecipheriv(algorithm, key(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedRaw, "base64url")), decipher.final()]).toString("utf8");
}
