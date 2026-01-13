import { NextRequest } from "next/server";
import { getStorage } from "@/lib/storage";
import { streamChatCompletion } from "@/lib/claude";
import { createLogger } from "@/lib/logger";
import { generateSessionId, getSessionExpiresAt, isSessionExpired } from "@/lib/utils";
import { createErrorResponse } from "@/types/api";
import type { ChatRequest, ChatMessage, StreamEvent } from "@/types/chat";

const logger = createLogger({ module: "api/chat" });

/**
 * Validate chat request body
 */
function validateRequest(body: unknown): body is ChatRequest {
  if (typeof body !== "object" || body === null) return false;
  const { sessionId, message } = body as Record<string, unknown>;
  return typeof sessionId === "string" && typeof message === "string" && message.trim().length > 0;
}

/**
 * Create SSE formatted event
 */
function formatSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * POST /api/chat - Send a chat message and receive streaming response
 */
export async function POST(request: NextRequest) {
  let sessionId: string | null = null;

  try {
    const body = await request.json();

    if (!validateRequest(body)) {
      logger.warn({ body }, "Invalid request body");
      return new Response(
        JSON.stringify(createErrorResponse("VALIDATION_ERROR", "Invalid request body")),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    sessionId = body.sessionId || generateSessionId();
    const userMessage = body.message.trim();

    logger.info({ sessionId, messageLength: userMessage.length }, "Processing chat request");

    // Get storage adapter
    const storage = await getStorage();

    // Get or create session
    let session = await storage.getSession(sessionId);

    if (session && isSessionExpired(session.expiresAt)) {
      logger.info({ sessionId }, "Session expired, creating new session");
      await storage.deleteSession(sessionId);
      session = null;
    }

    if (!session) {
      session = await storage.createSession(sessionId, getSessionExpiresAt());
      logger.info({ sessionId }, "Created new session");
    }

    // Save user message
    await storage.addMessage(sessionId, { role: "user", content: userMessage });

    // Prepare messages for Claude API
    const chatMessages: ChatMessage[] = [
      ...session.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userMessage },
    ];

    // Create streaming response
    const encoder = new TextEncoder();
    let assistantResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const text of streamChatCompletion(chatMessages)) {
            assistantResponse += text;
            controller.enqueue(encoder.encode(formatSSE({ type: "content", text })));
          }

          // Save assistant message after streaming completes
          await storage.addMessage(sessionId!, { role: "assistant", content: assistantResponse });

          controller.enqueue(encoder.encode(formatSSE({ type: "done" })));
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          logger.error({ error: errorMessage, sessionId }, "Streaming error");
          controller.enqueue(encoder.encode(formatSSE({ type: "error", error: errorMessage })));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Session-Id": sessionId,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage, sessionId }, "Chat API error");
    return new Response(
      JSON.stringify(createErrorResponse("INTERNAL_ERROR", "Internal server error")),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
