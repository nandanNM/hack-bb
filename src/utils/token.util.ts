import crypto from "crypto";

/**
 * Generate a cryptographically secure random token
 * @param length Token length in bytes (default 32)
 * @returns Hex-encoded token string
 */
export const generateResetToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Hash a token using SHA-256
 * @param token Raw token string
 * @returns Hashed token
 */
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Constant-time comparison of two strings to prevent timing attacks
 * @param a First string
 * @param b Second string
 * @returns True if strings match
 */
export const constantTimeCompare = (a: string, b: string): boolean => {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
};
