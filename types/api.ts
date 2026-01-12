/**
 * API error codes
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR"
  | "RATE_LIMIT"
  | "SESSION_EXPIRED";

/**
 * API error response
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * Generic success response
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * API response type (union of error and success)
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response: ApiResponse): response is ErrorResponse {
  return "error" in response;
}

/**
 * Create an error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown
): ErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}
