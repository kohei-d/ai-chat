import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatInput from "@/components/chat/ChatInput";

describe("ChatInput", () => {
  describe("Basic rendering", () => {
    it("should render textarea and send button", () => {
      const mockOnSend = jest.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);
      expect(textarea).toBeInTheDocument();

      const sendButton = screen.getByRole("button", { name: /送信/ });
      expect(sendButton).toBeInTheDocument();
    });

    it("should have empty message by default", () => {
      const mockOnSend = jest.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/) as HTMLTextAreaElement;
      expect(textarea.value).toBe("");
    });
  });

  describe("Message input", () => {
    it("should update message when typing", async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(textarea, "Hello, world!");

      expect(textarea).toHaveValue("Hello, world!");
    });

    it("should handle multiple lines", async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(textarea, "Line 1\nLine 2\nLine 3");

      expect(textarea).toHaveValue("Line 1\nLine 2\nLine 3");
    });
  });

  describe("Message sending", () => {
    it("should send message when clicking send button", async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);
      const sendButton = screen.getByRole("button", { name: /送信/ });

      await user.type(textarea, "Test message");
      await user.click(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith("Test message");
      expect(mockOnSend).toHaveBeenCalledTimes(1);
    });

    it("should clear message after sending", async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/) as HTMLTextAreaElement;
      await user.type(textarea, "Test message");
      await user.click(screen.getByRole("button", { name: /送信/ }));

      expect(textarea.value).toBe("");
    });

    it("should trim whitespace from message", async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(textarea, "  Test message  ");
      await user.click(screen.getByRole("button", { name: /送信/ }));

      expect(mockOnSend).toHaveBeenCalledWith("Test message");
    });

    it("should not send empty message", async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole("button", { name: /送信/ });
      await user.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it("should not send whitespace-only message", async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(textarea, "   ");
      await user.click(screen.getByRole("button", { name: /送信/ }));

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe("Keyboard shortcuts", () => {
    it("should send message when pressing Enter", async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);
      await user.type(textarea, "Test message");
      await user.type(textarea, "{Enter}");

      expect(mockOnSend).toHaveBeenCalledWith("Test message");
    });

    it("should add newline when pressing Shift+Enter", async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/) as HTMLTextAreaElement;
      await user.type(textarea, "Line 1{Shift>}{Enter}{/Shift}Line 2");

      expect(mockOnSend).not.toHaveBeenCalled();
      expect(textarea.value).toContain("\n");
    });
  });

  describe("IME composition handling", () => {
    it("should not send message during IME composition", () => {
      const mockOnSend = jest.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);

      // Simulate IME composition start
      fireEvent.compositionStart(textarea);

      // Simulate typing
      fireEvent.change(textarea, { target: { value: "こんにちは" } });

      // Try to send with Enter during composition
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

      // Should not send during composition
      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it("should send message after IME composition ends", () => {
      const mockOnSend = jest.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);

      // Simulate IME composition
      fireEvent.compositionStart(textarea);
      fireEvent.change(textarea, { target: { value: "こんにちは" } });
      fireEvent.compositionEnd(textarea);

      // Now Enter should send
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
      fireEvent.submit(textarea.closest("form")!);

      expect(mockOnSend).toHaveBeenCalledWith("こんにちは");
    });
  });

  describe("Disabled state", () => {
    it("should disable textarea when disabled prop is true", () => {
      const mockOnSend = jest.fn();
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);
      expect(textarea).toBeDisabled();
    });

    it("should disable send button when disabled prop is true", () => {
      const mockOnSend = jest.fn();
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const sendButton = screen.getByRole("button", { name: /送信/ });
      expect(sendButton).toBeDisabled();
    });

    it("should not send message when disabled", async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} disabled={true} />);

      const sendButton = screen.getByRole("button", { name: /送信/ });
      await user.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it("should disable send button when message is empty", () => {
      const mockOnSend = jest.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const sendButton = screen.getByRole("button", { name: /送信/ });
      expect(sendButton).toBeDisabled();
    });

    it("should enable send button when message is not empty", async () => {
      const mockOnSend = jest.fn();
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);
      const sendButton = screen.getByRole("button", { name: /送信/ });

      expect(sendButton).toBeDisabled();

      await user.type(textarea, "Test");

      expect(sendButton).not.toBeDisabled();
    });
  });

  describe("Styling and accessibility", () => {
    it("should have proper ARIA labels", () => {
      const mockOnSend = jest.fn();
      render(<ChatInput onSend={mockOnSend} />);

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);
      const sendButton = screen.getByRole("button", { name: /送信/ });

      expect(textarea).toBeInTheDocument();
      expect(sendButton).toBeInTheDocument();
    });

    it("should have proper styling classes", () => {
      const mockOnSend = jest.fn();
      const { container } = render(<ChatInput onSend={mockOnSend} />);

      const form = container.querySelector("form");
      expect(form).toHaveClass("border-t", "border-gray-200", "bg-white", "p-4");

      const textarea = screen.getByPlaceholderText(/メッセージを入力してください/);
      expect(textarea).toHaveClass("w-full");

      const sendButton = screen.getByRole("button", { name: /送信/ });
      expect(sendButton).toHaveClass("bg-blue-600", "text-white");
    });
  });
});
