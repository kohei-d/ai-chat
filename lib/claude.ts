import Anthropic from "@anthropic-ai/sdk";
import { createLogger } from "./logger";
import { sleep } from "./utils";
import type { ChatMessage } from "@/types/chat";

const logger = createLogger({ module: "claude" });

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 4096;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

let anthropicClient: Anthropic | null = null;

/**
 * Get or create the Anthropic client instance
 */
function getClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Convert chat messages to Anthropic message format
 * Supports both text-only and multimodal (text + images) messages
 */
function toAnthropicMessages(
  messages: ChatMessage[]
): Anthropic.MessageParam[] {
  return messages.map((msg) => {
    // If message has images, create multimodal content
    if (msg.images && msg.images.length > 0) {
      const content: Anthropic.MessageParam["content"] = [];

      // Add images first
      for (const image of msg.images) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: image.mimeType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
            data: image.data,
          },
        });
      }

      // Add text content
      if (msg.content) {
        content.push({
          type: "text",
          text: msg.content,
        });
      }

      return {
        role: msg.role as "user" | "assistant",
        content,
      };
    }

    // Text-only message
    return {
      role: msg.role as "user" | "assistant",
      content: msg.content,
    };
  });
}

/**
 * Create a streaming chat completion
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
  }
): AsyncGenerator<string, void, unknown> {
  const client = getClient();
  const model = options?.model || DEFAULT_MODEL;
  const maxTokens = options?.maxTokens || DEFAULT_MAX_TOKENS;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info({ model, messageCount: messages.length, attempt }, "Starting chat stream");

      const stream = client.messages.stream({
        model,
        max_tokens: maxTokens,
        messages: toAnthropicMessages(messages),
        ...(options?.systemPrompt && { system: options.systemPrompt }),
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }

      logger.info("Chat stream completed successfully");
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(
        { error: lastError.message, attempt, maxRetries: MAX_RETRIES },
        "Chat stream failed, retrying..."
      );

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  logger.error({ error: lastError?.message }, "Chat stream failed after all retries");
  throw lastError || new Error("Unknown error occurred");
}

/**
 * Create a non-streaming chat completion
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<string> {
  const client = getClient();
  const model = options?.model || DEFAULT_MODEL;
  const maxTokens = options?.maxTokens || DEFAULT_MAX_TOKENS;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info({ model, messageCount: messages.length, attempt }, "Creating chat completion");

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: toAnthropicMessages(messages),
        ...(options?.systemPrompt && { system: options.systemPrompt }),
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text content in response");
      }

      logger.info("Chat completion created successfully");
      return textContent.text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn(
        { error: lastError.message, attempt, maxRetries: MAX_RETRIES },
        "Chat completion failed, retrying..."
      );

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  logger.error({ error: lastError?.message }, "Chat completion failed after all retries");
  throw lastError || new Error("Unknown error occurred");
}
