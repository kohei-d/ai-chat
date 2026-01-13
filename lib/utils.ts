import { v4 as uuidv4 } from "uuid";

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return uuidv4();
}

/**
 * Calculate session expiration date
 */
export function getSessionExpiresAt(): Date {
  const parsed = parseInt(process.env.SESSION_EXPIRY || "3600", 10);
  const expirySeconds = isNaN(parsed) ? 3600 : parsed;
  return new Date(Date.now() + expirySeconds * 1000);
}

/**
 * Check if a session has expired
 */
export function isSessionExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
