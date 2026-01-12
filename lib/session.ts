import { prisma } from "./prisma";
import { createLogger } from "./logger";
import { generateSessionId, getSessionExpiresAt, isSessionExpired } from "./utils";

const logger = createLogger({ module: "session" });

/**
 * Get or create a session by sessionId
 */
export async function getOrCreateSession(sessionId?: string) {
  const id = sessionId || generateSessionId();

  let session = await prisma.session.findUnique({
    where: { sessionId: id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (session && isSessionExpired(session.expiresAt)) {
    logger.info({ sessionId: id }, "Session expired, deleting");
    await prisma.session.delete({ where: { id: session.id } });
    session = null;
  }

  if (!session) {
    session = await prisma.session.create({
      data: {
        sessionId: id,
        expiresAt: getSessionExpiresAt(),
      },
      include: { messages: true },
    });
    logger.info({ sessionId: id }, "Created new session");
  }

  return session;
}

/**
 * Update session expiration time
 */
export async function refreshSession(sessionId: string) {
  try {
    await prisma.session.update({
      where: { sessionId },
      data: { expiresAt: getSessionExpiresAt() },
    });
    logger.debug({ sessionId }, "Session refreshed");
  } catch (error) {
    logger.warn({ sessionId, error }, "Failed to refresh session");
  }
}

/**
 * Delete a session and all its messages
 */
export async function deleteSession(sessionId: string) {
  try {
    await prisma.session.delete({
      where: { sessionId },
    });
    logger.info({ sessionId }, "Session deleted");
    return true;
  } catch (error) {
    logger.warn({ sessionId, error }, "Failed to delete session");
    return false;
  }
}

/**
 * Clean up expired sessions
 * This can be called periodically (e.g., via a cron job)
 */
export async function cleanupExpiredSessions() {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    logger.info({ deletedCount: result.count }, "Cleaned up expired sessions");
    return result.count;
  } catch (error) {
    logger.error({ error }, "Failed to clean up expired sessions");
    return 0;
  }
}

/**
 * Get session statistics
 */
export async function getSessionStats() {
  const [total, expired] = await Promise.all([
    prisma.session.count(),
    prisma.session.count({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    }),
  ]);

  return {
    total,
    active: total - expired,
    expired,
  };
}
