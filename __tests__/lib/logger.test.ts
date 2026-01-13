import { logger, createLogger } from "@/lib/logger";

describe("logger", () => {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    debug: console.debug,
    warn: console.warn,
    error: console.error,
  };

  // Mock console methods
  beforeEach(() => {
    console.log = jest.fn();
    console.debug = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.debug = originalConsole.debug;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    jest.clearAllMocks();
  });

  describe("basic logging", () => {
    it("should log info messages", () => {
      logger.info("Test info message");
      expect(console.log).toHaveBeenCalledTimes(1);
      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain("INFO");
      expect(loggedMessage).toContain("Test info message");
    });

    it("should log warn messages", () => {
      logger.warn("Test warn message");
      expect(console.warn).toHaveBeenCalledTimes(1);
      const loggedMessage = (console.warn as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain("WARN");
      expect(loggedMessage).toContain("Test warn message");
    });

    it("should log error messages", () => {
      logger.error("Test error message");
      expect(console.error).toHaveBeenCalledTimes(1);
      const loggedMessage = (console.error as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain("ERROR");
      expect(loggedMessage).toContain("Test error message");
    });

    it("should include timestamp in log messages", () => {
      logger.info("Test message");
      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      // Check for ISO timestamp format
      expect(loggedMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });
  });

  describe("logging with context", () => {
    it("should log messages with context object", () => {
      const context = { userId: "123", action: "test" };
      logger.info(context, "Test with context");

      expect(console.log).toHaveBeenCalledTimes(1);
      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain("Test with context");
      expect(loggedMessage).toContain(JSON.stringify(context));
    });

    it("should handle complex context objects", () => {
      const context = {
        user: { id: "123", name: "John" },
        metadata: { timestamp: Date.now() },
      };
      logger.info(context, "Complex context");

      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain("Complex context");
      expect(loggedMessage).toContain(JSON.stringify(context));
    });

    it("should handle empty context", () => {
      logger.info({}, "Empty context");

      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain("Empty context");
      expect(loggedMessage).toContain("{}");
    });
  });

  describe("child logger", () => {
    it("should create child logger with parent context", () => {
      const parentContext = { requestId: "abc-123" };
      const childLogger = logger.child(parentContext);

      childLogger.info("Child log message");

      expect(console.log).toHaveBeenCalledTimes(1);
      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain("Child log message");
      expect(loggedMessage).toContain(JSON.stringify(parentContext));
    });

    it("should merge child context with parent context", () => {
      const parentContext = { requestId: "abc-123" };
      const childLogger = logger.child(parentContext);
      const additionalContext = { userId: "user-456" };

      childLogger.info(additionalContext, "Merged context");

      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain("Merged context");
      expect(loggedMessage).toContain("abc-123");
      expect(loggedMessage).toContain("user-456");
    });

    it("should override parent context with child context for same keys", () => {
      const parentContext = { key: "parent-value" };
      const childLogger = logger.child(parentContext);
      const additionalContext = { key: "child-value" };

      childLogger.info(additionalContext, "Override test");

      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain("child-value");
      expect(loggedMessage).not.toContain("parent-value");
    });
  });

  describe("createLogger helper", () => {
    it("should create a child logger using helper function", () => {
      const context = { component: "test-component" };
      const childLogger = createLogger(context);

      childLogger.info("Helper test");

      expect(console.log).toHaveBeenCalledTimes(1);
      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain("Helper test");
      expect(loggedMessage).toContain("test-component");
    });
  });

  describe("log levels", () => {
    it("should support all log levels", () => {
      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warn message");
      logger.error("Error message");

      // Depending on LOG_LEVEL, debug might not be called
      // But info, warn, and error should be called
      expect(console.log).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("message format", () => {
    it("should format messages correctly", () => {
      logger.info("Formatted message");

      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      // Format: [timestamp] LEVEL: message
      expect(loggedMessage).toMatch(/\[.*\] INFO: Formatted message/);
    });

    it("should handle special characters in messages", () => {
      const specialMessage = 'Message with "quotes" and \\backslashes\\';
      logger.info(specialMessage);

      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain(specialMessage);
    });

    it("should handle empty messages", () => {
      logger.info("");

      expect(console.log).toHaveBeenCalledTimes(1);
      const loggedMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(loggedMessage).toContain("INFO:");
    });
  });

  describe("child logger log levels", () => {
    it("should support all log levels in child logger", () => {
      const childLogger = logger.child({ component: "test" });

      childLogger.debug("Child debug");
      childLogger.info("Child info");
      childLogger.warn("Child warn");
      childLogger.error("Child error");

      expect(console.log).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledTimes(1);
    });
  });
});
