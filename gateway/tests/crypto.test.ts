import { describe, expect, test } from "@jest/globals";
import { encryptToken, decryptToken } from "../src/utils/crypto.js";

describe("Crypto Utility", () => {
  const secretToken = "my-secret-token-123";

  test("should encrypt and decrypt a token correctly", () => {
    const encrypted = encryptToken(secretToken);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe("string");
    expect(encrypted).not.toBe(secretToken);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(secretToken);
  });

  test("should throw error for malformed encrypted token", () => {
    const malformed = "part1.part2";
    expect(() => decryptToken(malformed)).toThrow("Invalid encrypted token");
  });

  test("should throw error for invalid encrypted data", () => {
    const invalid = "aXY=.dGFn.ZW5j"; // base64 for iv, tag, enc but invalid content
    expect(() => decryptToken(invalid)).toThrow();
  });
});
