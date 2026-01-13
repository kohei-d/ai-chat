import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage, StreamEvent } from '@/types/chat';

const SESSION_ID_KEY = 'ai-chat-session-id';

/**
 * Get or create session ID
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);

  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Clear session ID
 */
export function clearSessionId(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_ID_KEY);
  }
}

/**
 * Send chat message and receive streaming response
 */
export async function sendChatMessage(
  sessionId: string,
  message: string,
  onChunk: (text: string) => void,
  onError: (error: string) => void,
  onDone: (fullText: string) => void
): Promise<void> {
  let accumulatedText = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, message }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'サーバーエラーが発生しました' } }));
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6)) as StreamEvent;

            if (data.type === 'content' && data.text) {
              accumulatedText += data.text;
              onChunk(data.text);
            } else if (data.type === 'error' && data.error) {
              onError(data.error);
              return;
            } else if (data.type === 'done') {
              onDone(accumulatedText);
              return;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      onError(error.message);
    } else {
      onError('予期しないエラーが発生しました');
    }
  }
}

/**
 * Fetch chat history
 */
export async function fetchChatHistory(sessionId: string): Promise<ChatMessage[]> {
  try {
    const response = await fetch(`/api/chat/history?sessionId=${sessionId}`);

    // 404 (Session not found) や 410 (Session expired) は正常な状態
    // 初回アクセス時やセッション期限切れ時など
    if (response.status === 404 || response.status === 410) {
      return [];
    }

    if (!response.ok) {
      console.error(`Failed to fetch chat history: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return [];
  }
}

/**
 * Format error message for display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '予期しないエラーが発生しました';
}
