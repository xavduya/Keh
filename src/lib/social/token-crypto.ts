/**
 * Encryption for social platform tokens (server-only).
 *
 * Tokens are stored as "enc:v1:<base64url(iv | tag | ciphertext)>" using
 * AES-256-GCM with SOCIAL_TOKEN_KEY (32 random bytes, base64). Generate one:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Values without the prefix are tokens saved before encryption existed;
 * they're read as-is and encrypted the next time the account is connected.
 * Changing the key makes existing tokens unreadable (owners reconnect).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function isTokenEncryptionConfigured(): boolean {
  return readKey() !== null;
}

function readKey(): Buffer | null {
  const raw = process.env.SOCIAL_TOKEN_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : null;
}

function requireKey(): Buffer {
  const key = readKey();
  if (!key) {
    throw new Error("SOCIAL_TOKEN_KEY must be set to 32 random bytes, base64-encoded (see token-crypto.ts).");
  }
  return key;
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", requireKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

/** Decrypts a stored token. Throws if it was encrypted with another key or tampered with. */
export function decryptToken(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored; // saved before encryption
  const data = Buffer.from(stored.slice(PREFIX.length), "base64url");
  const decipher = createDecipheriv("aes-256-gcm", requireKey(), data.subarray(0, IV_BYTES));
  decipher.setAuthTag(data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
  return Buffer.concat([decipher.update(data.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString("utf8");
}
