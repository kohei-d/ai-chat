import { NextRequest } from "next/server";
import { getStorage } from "@/lib/storage";
import { streamChatCompletion } from "@/lib/claude";
import { createLogger } from "@/lib/logger";
import { generateSessionId, getSessionExpiresAt, isSessionExpired } from "@/lib/utils";
import { createErrorResponse } from "@/types/api";
import { validateImages } from "@/lib/image";
import type { ChatRequest, ChatMessage, StreamEvent } from "@/types/chat";

const logger = createLogger({ module: "api/chat" });

/**
 * Validate chat request body
 */
function validateRequest(body: unknown): body is ChatRequest {
  if (typeof body !== "object" || body === null) return false;
  const { sessionId, message, images } = body as Record<string, unknown>;

  // Basic validation
  if (typeof sessionId !== "string" || typeof message !== "string" || message.trim().length === 0) {
    return false;
  }

  // Validate images if present
  if (images !== undefined) {
    if (!Array.isArray(images)) return false;

    // Validate each image structure
    for (const img of images) {
      if (
        typeof img !== "object" ||
        img === null ||
        typeof img.data !== "string" ||
        typeof img.mimeType !== "string" ||
        typeof img.size !== "number"
      ) {
        return false;
      }
    }
  }

  return true;
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
    const images = body.images;

    // Validate images if present
    if (images && images.length > 0) {
      const validationResult = validateImages(images);
      if (!validationResult.valid) {
        logger.warn({ sessionId, error: validationResult.error }, "Image validation failed");
        return new Response(
          JSON.stringify(createErrorResponse("VALIDATION_ERROR", validationResult.message || "Invalid images")),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    logger.info(
      { sessionId, messageLength: userMessage.length, imageCount: images?.length || 0 },
      "Processing chat request"
    );

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
    await storage.addMessage(sessionId, { role: "user", content: userMessage, images });

    // Prepare messages for Claude API
    const chatMessages: ChatMessage[] = [
      ...session.messages.map((m) => ({
        role: m.role,
        content: m.content,
        images: m.images
      })),
      { role: "user" as const, content: userMessage, images },
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
