import {
  isValidImageType,
  isValidImageSize,
  isValidImageCount,
  validateImage,
  validateImages,
  extractBase64FromDataURL,
  calculateBase64Size,
  MAX_IMAGE_SIZE,
  MAX_IMAGES_PER_MESSAGE,
} from '@/lib/image';

describe('Image Utilities', () => {
  describe('isValidImageType', () => {
    it('should accept valid image MIME types', () => {
      expect(isValidImageType('image/png')).toBe(true);
      expect(isValidImageType('image/jpeg')).toBe(true);
      expect(isValidImageType('image/webp')).toBe(true);
      expect(isValidImageType('image/gif')).toBe(true);
    });

    it('should reject invalid MIME types', () => {
      expect(isValidImageType('image/svg+xml')).toBe(false);
      expect(isValidImageType('application/pdf')).toBe(false);
      expect(isValidImageType('text/plain')).toBe(false);
    });
  });

  describe('isValidImageSize', () => {
    it('should accept sizes within the limit', () => {
      expect(isValidImageSize(1024)).toBe(true);
      expect(isValidImageSize(MAX_IMAGE_SIZE)).toBe(true);
      expect(isValidImageSize(MAX_IMAGE_SIZE - 1)).toBe(true);
    });

    it('should reject sizes exceeding the limit', () => {
      expect(isValidImageSize(MAX_IMAGE_SIZE + 1)).toBe(false);
      expect(isValidImageSize(10 * 1024 * 1024)).toBe(false);
    });

    it('should reject zero or negative sizes', () => {
      expect(isValidImageSize(0)).toBe(false);
      expect(isValidImageSize(-1)).toBe(false);
    });
  });

  describe('isValidImageCount', () => {
    it('should accept counts within the limit', () => {
      expect(isValidImageCount(1)).toBe(true);
      expect(isValidImageCount(MAX_IMAGES_PER_MESSAGE)).toBe(true);
    });

    it('should reject counts exceeding the limit', () => {
      expect(isValidImageCount(0)).toBe(false);
      expect(isValidImageCount(MAX_IMAGES_PER_MESSAGE + 1)).toBe(false);
      expect(isValidImageCount(10)).toBe(false);
    });
  });

  describe('validateImage', () => {
    const validBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    it('should validate a correct image', () => {
      const result = validateImage(validBase64, 'image/png', 1024);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid MIME type', () => {
      const result = validateImage(validBase64, 'image/svg+xml', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_TYPE');
    });

    it('should reject oversized image', () => {
      const result = validateImage(validBase64, 'image/png', MAX_IMAGE_SIZE + 1);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('FILE_TOO_LARGE');
    });

    it('should reject invalid Base64 data', () => {
      const result = validateImage('not-valid-base64!@#', 'image/png', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_DATA');
    });
  });

  describe('validateImages', () => {
    const validImage = {
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      mimeType: 'image/png',
      size: 1024,
    };

    it('should validate an array of valid images', () => {
      const result = validateImages([validImage, validImage]);
      expect(result.valid).toBe(true);
    });

    it('should reject too many images', () => {
      const images = Array(MAX_IMAGES_PER_MESSAGE + 1).fill(validImage);
      const result = validateImages(images);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOO_MANY_IMAGES');
    });

    it('should reject if any image is invalid', () => {
      const invalidImage = { ...validImage, mimeType: 'image/svg+xml' };
      const result = validateImages([validImage, invalidImage]);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_TYPE');
    });
  });

  describe('extractBase64FromDataURL', () => {
    it('should extract Base64 data from data URL', () => {
      const dataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
      const result = extractBase64FromDataURL(dataURL);
      expect(result).toEqual({
        mimeType: 'image/png',
        data: 'iVBORw0KGgoAAAANSUhEUg==',
      });
    });

    it('should return null for invalid data URL', () => {
      expect(extractBase64FromDataURL('invalid-url')).toBeNull();
      expect(extractBase64FromDataURL('data:text/plain,hello')).toBeNull();
    });
  });

  describe('calculateBase64Size', () => {
    it('should calculate approximate file size', () => {
      // Base64 "AAAA" = 3 bytes (4 chars = 3 bytes)
      const size = calculateBase64Size('AAAA');
      expect(size).toBe(3);
    });

    it('should handle padding correctly', () => {
      // "AA==" = 1 byte
      expect(calculateBase64Size('AA==')).toBe(1);
      // "AAA=" = 2 bytes
      expect(calculateBase64Size('AAA=')).toBe(2);
    });
  });
});
