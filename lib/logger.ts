/**
 * Simple logger for Next.js environment
 * Using console-based logging to avoid pino worker thread issues in Next.js
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const currentPriority = LOG_LEVEL_PRIORITY[currentLogLevel];

interface LogContext {
  [key: string]: unknown;
}

interface LogFn {
  (message: string): void;
  (context: LogContext, message: string): void;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= currentPriority;
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
}

function createLogFunction(level: LogLevel): LogFn {
  function logFn(message: string): void;
  function logFn(context: LogContext, message: string): void;
  function logFn(contextOrMessage: LogContext | string, message?: string): void {
    if (!shouldLog(level)) return;

    let ctx: LogContext | undefined;
    let msg: string;

    if (typeof contextOrMessage === 'string') {
      msg = contextOrMessage;
      ctx = undefined;
    } else {
      msg = message || '';
      ctx = contextOrMessage;
    }

    const consoleFn = level === 'error' ? console.error :
                      level === 'warn' ? console.warn :
                      level === 'debug' ? console.debug : console.log;

    consoleFn(formatMessage(level, msg, ctx));
  }

  return logFn;
}

interface ChildLogger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  child: (context: LogContext) => ChildLogger;
}

export const logger: Logger = {
  debug: createLogFunction('debug'),
  info: createLogFunction('info'),
  warn: createLogFunction('warn'),
  error: createLogFunction('error'),

  child: (parentContext: LogContext) => {
    function createChildLogFn(level: LogLevel): LogFn {
      function childLogFn(message: string): void;
      function childLogFn(context: LogContext, message: string): void;
      function childLogFn(contextOrMessage: LogContext | string, message?: string): void {
        if (!shouldLog(level)) return;

        let additionalCtx: LogContext | undefined;
        let msg: string;

        if (typeof contextOrMessage === 'string') {
          msg = contextOrMessage;
          additionalCtx = undefined;
        } else {
          msg = message || '';
          additionalCtx = contextOrMessage;
        }

        // Merge parent context with additional context
        const mergedContext = { ...parentContext, ...additionalCtx };

        const consoleFn = level === 'error' ? console.error :
                          level === 'warn' ? console.warn :
                          level === 'debug' ? console.debug : console.log;

        consoleFn(formatMessage(level, msg, mergedContext));
      }

      return childLogFn;
    }

    return {
      debug: createChildLogFn('debug'),
      info: createChildLogFn('info'),
      warn: createChildLogFn('warn'),
      error: createChildLogFn('error'),
    };
  },
};

/**
 * Create a child logger with additional context
 */
export function createLogger(context: LogContext) {
  return logger.child(context);
}

export default logger;
