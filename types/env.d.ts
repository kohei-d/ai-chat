declare namespace NodeJS {
  interface ProcessEnv {
    // Anthropic Claude API
    ANTHROPIC_API_KEY: string;

    // Database
    DATABASE_URL: string;

    // Application
    NEXT_PUBLIC_APP_URL: string;

    // Session Configuration
    SESSION_EXPIRY: string;

    // Logging
    LOG_LEVEL: "error" | "warn" | "info" | "debug";

    // Node Environment
    NODE_ENV: "development" | "production" | "test";
  }
}
