import { render, screen } from "@testing-library/react";
import ChatMessage from "@/components/chat/ChatMessage";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

// Mock react-markdown to avoid ESM issues
jest.mock("react-markdown", () => {
  return function ReactMarkdown({ children }: { children: string }) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

describe("ChatMessage", () => {
  describe("User messages", () => {
    it("should render user message with correct styling", () => {
      const message: ChatMessageType = {
        role: "user",
        content: "Hello, how are you?",
      };

      const { container } = render(<ChatMessage message={message} />);

      // Check message content
      expect(screen.getByText("Hello, how are you?")).toBeInTheDocument();

      // Check user message styling (blue background)
      const messageDiv = container.querySelector(".bg-blue-600");
      expect(messageDiv).toBeInTheDocument();
      expect(messageDiv).toHaveClass("text-white");
    });

    it("should justify user messages to the right", () => {
      const message: ChatMessageType = {
        role: "user",
        content: "Test message",
      };

      const { container } = render(<ChatMessage message={message} />);

      const flexContainer = container.querySelector(".justify-end");
      expect(flexContainer).toBeInTheDocument();
    });

    it("should preserve whitespace in user messages", () => {
      const message: ChatMessageType = {
        role: "user",
        content: "Line 1\nLine 2\nLine 3",
      };

      const { container } = render(<ChatMessage message={message} />);

      const textElement = container.querySelector(".whitespace-pre-wrap");
      expect(textElement).toBeInTheDocument();
      // whitespace-pre-wrap class preserves newlines in rendering
      expect(textElement).toHaveClass("whitespace-pre-wrap");
      // The text content includes the newlines
      expect(textElement?.textContent).toContain("Line 1");
      expect(textElement?.textContent).toContain("Line 2");
      expect(textElement?.textContent).toContain("Line 3");
    });
  });

  describe("Assistant messages", () => {
    it("should render assistant message with correct styling", () => {
      const message: ChatMessageType = {
        role: "assistant",
        content: "I'm doing well, thank you!",
      };

      const { container } = render(<ChatMessage message={message} />);

      // Check message content
      expect(screen.getByText("I'm doing well, thank you!")).toBeInTheDocument();

      // Check assistant message styling (gray background)
      const messageDiv = container.querySelector(".bg-gray-100");
      expect(messageDiv).toBeInTheDocument();
      expect(messageDiv).toHaveClass("text-gray-900");
    });

    it("should justify assistant messages to the left", () => {
      const message: ChatMessageType = {
        role: "assistant",
        content: "Test message",
      };

      const { container } = render(<ChatMessage message={message} />);

      const flexContainer = container.querySelector(".justify-start");
      expect(flexContainer).toBeInTheDocument();
    });

    it("should render markdown content in assistant messages", () => {
      const message: ChatMessageType = {
        role: "assistant",
        content: "This is **bold** text and *italic* text.",
      };

      render(<ChatMessage message={message} />);

      // react-markdown is mocked, so we just verify the content is passed to it
      const markdownContent = screen.getByTestId("markdown-content");
      expect(markdownContent).toBeInTheDocument();
      expect(markdownContent).toHaveTextContent("This is **bold** text and *italic* text.");
    });
  });

  describe("Streaming indicator", () => {
    it("should show cursor when streaming", () => {
      const message: ChatMessageType = {
        role: "assistant",
        content: "Typing...",
      };

      const { container } = render(
        <ChatMessage message={message} isStreaming={true} />
      );

      const cursor = container.querySelector(".animate-pulse");
      expect(cursor).toBeInTheDocument();
      expect(cursor).toHaveClass("bg-gray-900");
    });

    it("should not show cursor when not streaming", () => {
      const message: ChatMessageType = {
        role: "assistant",
        content: "Done typing",
      };

      const { container } = render(
        <ChatMessage message={message} isStreaming={false} />
      );

      const cursor = container.querySelector(".animate-pulse");
      expect(cursor).not.toBeInTheDocument();
    });

    it("should not show cursor for user messages even if streaming", () => {
      const message: ChatMessageType = {
        role: "user",
        content: "User message",
      };

      const { container } = render(
        <ChatMessage message={message} isStreaming={true} />
      );

      const cursor = container.querySelector(".animate-pulse");
      expect(cursor).not.toBeInTheDocument();
    });
  });

  describe("Message layout", () => {
    it("should limit message width to 80%", () => {
      const message: ChatMessageType = {
        role: "user",
        content: "Test",
      };

      const { container } = render(<ChatMessage message={message} />);

      const messageDiv = container.querySelector(".max-w-\\[80\\%\\]");
      expect(messageDiv).toBeInTheDocument();
    });

    it("should have proper spacing between messages", () => {
      const message: ChatMessageType = {
        role: "user",
        content: "Test",
      };

      const { container } = render(<ChatMessage message={message} />);

      const flexContainer = container.querySelector(".mb-4");
      expect(flexContainer).toBeInTheDocument();
    });
  });
});
