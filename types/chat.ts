/**
 * Chat message role
 */
export type MessageRole = "user" | "assistant";

/**
 * Chat message for API communication
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Chat message with metadata (from database)
 */
export interface ChatMessageWithMeta extends ChatMessage {
  id: string;
  createdAt: Date;
}

/**
 * Session data
 */
export interface Session {
  id: string;
  sessionId: string;
  messages: ChatMessageWithMeta[];
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Chat request body
 */
export interface ChatRequest {
  sessionId: string;
  message: string;
}

/**
 * Chat response for non-streaming
 */
export interface ChatResponse {
  sessionId: string;
  message: ChatMessage;
}

/**
 * Streaming event types
 */
export type StreamEventType = "content" | "done" | "error";

/**
 * Streaming event data
 */
export interface StreamEvent {
  type: StreamEventType;
  text?: string;
  error?: string;
}

/**
 * History response
 */
export interface HistoryResponse {
  sessionId: string;
  messages: Array<{
    role: MessageRole;
    content: string;
    createdAt: string;
  }>;
}
