import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@/types/chat";

// Mock uuid to avoid ESM issues
jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid"),
}));

// Mock logger to avoid console noise during tests
jest.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock Anthropic SDK
const mockCreate = jest.fn();
const mockStream = jest.fn();

jest.mock("@anthropic-ai/sdk", () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
      stream: mockStream,
    },
  }));
});

describe("claude", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ANTHROPIC_API_KEY = "test-api-key";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getClient", () => {
    it("should throw error when ANTHROPIC_API_KEY is not set", async () => {
      // Need to reimport after changing env
      delete process.env.ANTHROPIC_API_KEY;
      jest.resetModules();

      const { createChatCompletion } = await import("@/lib/claude");

      const messages: ChatMessage[] = [
        { role: "user", content: "Hello" },
      ];

      await expect(createChatCompletion(messages)).rejects.toThrow(
        "ANTHROPIC_API_KEY environment variable is not set"
      );
    });
  });

  describe("createChatCompletion", () => {
    let createChatCompletion: typeof import("@/lib/claude").createChatCompletion;

    beforeEach(async () => {
      jest.resetModules();
      const claude = await import("@/lib/claude");
      createChatCompletion = claude.createChatCompletion;
    });

    it("should create non-streaming chat completion", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "Test response" }],
      });

      const messages: ChatMessage[] = [
        { role: "user", content: "Test message" },
      ];

      const result = await createChatCompletion(messages);

      expect(result).toBe("Test response");
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "Test message" }],
          max_tokens: 4096,
        })
      );
    });

    it("should use custom model and maxTokens", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "Custom response" }],
      });

      const messages: ChatMessage[] = [
        { role: "user", content: "Test" },
      ];

      await createChatCompletion(messages, {
        model: "custom-model",
        maxTokens: 2048,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "custom-model",
          max_tokens: 2048,
        })
      );
    });

    it("should include system prompt when provided", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "Response with system" }],
      });

      const messages: ChatMessage[] = [
        { role: "user", content: "Test" },
      ];

      await createChatCompletion(messages, {
        systemPrompt: "You are a helpful assistant",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "You are a helpful assistant",
        })
      );
    });

    it("should handle multiple messages", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "Multi-turn response" }],
      });

      const messages: ChatMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
        { role: "user", content: "How are you?" },
      ];

      await createChatCompletion(messages);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi there!" },
            { role: "user", content: "How are you?" },
          ],
        })
      );
    });

    it("should throw error when no text content in response", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "image", source: {} }],
      });

      const messages: ChatMessage[] = [
        { role: "user", content: "Test" },
      ];

      await expect(createChatCompletion(messages)).rejects.toThrow(
        "No text content in response"
      );
    });

    it("should retry on failure and succeed", async () => {
      mockCreate
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          content: [{ type: "text", text: "Success after retry" }],
        });

      const messages: ChatMessage[] = [
        { role: "user", content: "Test" },
      ];

      // Mock sleep to avoid waiting
      jest.useFakeTimers();

      const resultPromise = createChatCompletion(messages);

      // Fast-forward through all timers
      await jest.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBe("Success after retry");
      expect(mockCreate).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it("should throw error after max retries", async () => {
      mockCreate.mockRejectedValue(new Error("Persistent error"));

      const messages: ChatMessage[] = [
        { role: "user", content: "Test" },
      ];

      // Mock sleep to avoid waiting
      jest.useFakeTimers();

      const resultPromise = createChatCompletion(messages).catch((e) => e);

      // Fast-forward through all timers
      await jest.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe("Persistent error");
      expect(mockCreate).toHaveBeenCalledTimes(3); // MAX_RETRIES = 3

      jest.useRealTimers();
    });
  });

  describe("streamChatCompletion", () => {
    let streamChatCompletion: typeof import("@/lib/claude").streamChatCompletion;

    beforeEach(async () => {
      jest.resetModules();
      const claude = await import("@/lib/claude");
      streamChatCompletion = claude.streamChatCompletion;
    });

    it("should stream chat completion", async () => {
      const mockStreamData = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Hello" },
          };
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: " " },
          };
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "World" },
          };
        },
      };

      mockStream.mockReturnValue(mockStreamData);

      const messages: ChatMessage[] = [
        { role: "user", content: "Test" },
      ];

      const chunks: string[] = [];
      for await (const chunk of streamChatCompletion(messages)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["Hello", " ", "World"]);
      expect(mockStream).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "Test" }],
        })
      );
    });

    it("should use custom options for streaming", async () => {
      const mockStreamData = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Response" },
          };
        },
      };

      mockStream.mockReturnValue(mockStreamData);

      const messages: ChatMessage[] = [
        { role: "user", content: "Test" },
      ];

      const generator = streamChatCompletion(messages, {
        model: "custom-model",
        maxTokens: 1024,
        systemPrompt: "Test prompt",
      });

      // Consume the generator
      for await (const _ of generator) {
        // Just consume
      }

      expect(mockStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "custom-model",
          max_tokens: 1024,
          system: "Test prompt",
        })
      );
    });

    it("should filter only text delta events", async () => {
      const mockStreamData = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: "message_start",
            message: {},
          };
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Hello" },
          };
          yield {
            type: "content_block_delta",
            delta: { type: "other_type", data: "ignored" },
          };
          yield {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "World" },
          };
          yield {
            type: "message_end",
          };
        },
      };

      mockStream.mockReturnValue(mockStreamData);

      const messages: ChatMessage[] = [
        { role: "user", content: "Test" },
      ];

      const chunks: string[] = [];
      for await (const chunk of streamChatCompletion(messages)) {
        chunks.push(chunk);
      }

      // Should only include text_delta events
      expect(chunks).toEqual(["Hello", "World"]);
    });
  });
});
