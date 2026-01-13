import { NextRequest } from "next/server";
import { getStorage } from "@/lib/storage";
import { createLogger } from "@/lib/logger";
import { isSessionExpired } from "@/lib/utils";
import { createErrorResponse, createSuccessResponse } from "@/types/api";
import type { HistoryResponse } from "@/types/chat";

const logger = createLogger({ module: "api/chat/history" });

/**
 * GET /api/chat/history - Get chat history for a session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      logger.warn("Missing sessionId parameter");
      return new Response(
        JSON.stringify(createErrorResponse("VALIDATION_ERROR", "sessionId is required")),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    logger.info({ sessionId }, "Fetching chat history");

    // Get storage adapter
    const storage = await getStorage();
    const session = await storage.getSession(sessionId);

    if (!session) {
      logger.warn({ sessionId }, "Session not found");
      return new Response(
        JSON.stringify(createErrorResponse("NOT_FOUND", "Session not found")),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (isSessionExpired(session.expiresAt)) {
      logger.warn({ sessionId }, "Session expired");
      // Clean up expired session
      await storage.deleteSession(sessionId);
      return new Response(
        JSON.stringify(createErrorResponse("SESSION_EXPIRED", "Session has expired")),
        { status: 410, headers: { "Content-Type": "application/json" } }
      );
    }

    const response: HistoryResponse = {
      sessionId: session.sessionId,
      messages: session.messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };

    logger.info({ sessionId, messageCount: response.messages.length }, "Chat history retrieved");

    return new Response(JSON.stringify(createSuccessResponse(response)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "History API error");
    return new Response(
      JSON.stringify(createErrorResponse("INTERNAL_ERROR", "Internal server error")),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
