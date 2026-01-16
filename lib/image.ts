import { createLogger } from "./logger";

const logger = createLogger({ module: "image" });

/**
 * Supported image MIME types
 */
export const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

/**
 * Maximum file size in bytes (5MB)
 */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Maximum number of images per message
 */
export const MAX_IMAGES_PER_MESSAGE = 4;

/**
 * Image validation error types
 */
export type ImageValidationError =
  | "INVALID_TYPE"
  | "FILE_TOO_LARGE"
  | "TOO_MANY_IMAGES"
  | "INVALID_DATA";

/**
 * Image validation result
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: ImageValidationError;
  message?: string;
}

/**
 * Validate image MIME type
 */
export function isValidImageType(mimeType: string): mimeType is SupportedImageType {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType as SupportedImageType);
}

/**
 * Validate image size
 */
export function isValidImageSize(size: number): boolean {
  return size > 0 && size <= MAX_IMAGE_SIZE;
}

/**
 * Validate number of images
 */
export function isValidImageCount(count: number): boolean {
  return count > 0 && count <= MAX_IMAGES_PER_MESSAGE;
}

/**
 * Validate Base64 encoded image data format
 */
export function isValidBase64Image(data: string): boolean {
  // Check if it's a valid Base64 string
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  return base64Regex.test(data);
}

/**
 * Validate a single image
 */
export function validateImage(
  data: string,
  mimeType: string,
  size: number
): ImageValidationResult {
  // Validate MIME type
  if (!isValidImageType(mimeType)) {
    logger.warn({ mimeType }, "Invalid image MIME type");
    return {
      valid: false,
      error: "INVALID_TYPE",
      message: `Unsupported image type: ${mimeType}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(", ")}`,
    };
  }

  // Validate file size
  if (!isValidImageSize(size)) {
    logger.warn({ size, maxSize: MAX_IMAGE_SIZE }, "Image size exceeds limit");
    return {
      valid: false,
      error: "FILE_TOO_LARGE",
      message: `Image size ${size} bytes exceeds maximum of ${MAX_IMAGE_SIZE} bytes (5MB)`,
    };
  }

  // Validate Base64 data format
  if (!isValidBase64Image(data)) {
    logger.warn("Invalid Base64 image data format");
    return {
      valid: false,
      error: "INVALID_DATA",
      message: "Invalid Base64 image data format",
    };
  }

  return { valid: true };
}

/**
 * Validate an array of images
 */
export function validateImages(
  images: Array<{ data: string; mimeType: string; size: number }>
): ImageValidationResult {
  // Validate count
  if (!isValidImageCount(images.length)) {
    logger.warn({ count: images.length, maxCount: MAX_IMAGES_PER_MESSAGE }, "Too many images");
    return {
      valid: false,
      error: "TOO_MANY_IMAGES",
      message: `Too many images: ${images.length}. Maximum allowed: ${MAX_IMAGES_PER_MESSAGE}`,
    };
  }

  // Validate each image
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const result = validateImage(image.data, image.mimeType, image.size);
    if (!result.valid) {
      return {
        ...result,
        message: `Image ${i + 1}: ${result.message}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Extract Base64 data from data URL format
 * Handles formats like: "data:image/png;base64,iVBORw0KGgoAAAANS..."
 */
export function extractBase64FromDataURL(dataURL: string): {
  data: string;
  mimeType: string;
} | null {
  const match = dataURL.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    data: match[2],
  };
}

/**
 * Calculate approximate file size from Base64 string
 */
export function calculateBase64Size(base64: string): number {
  // Base64 encoding increases size by ~33%
  // Each Base64 character represents 6 bits, so 4 chars = 3 bytes
  const padding = (base64.match(/=/g) || []).length;
  return Math.floor((base64.length * 3) / 4) - padding;
}
