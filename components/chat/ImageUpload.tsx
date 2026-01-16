'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import type { ChatImage } from '@/types/chat';

interface ImageUploadProps {
  onImagesChange: (images: ChatImage[]) => void;
  maxImages?: number;
  maxSize?: number;
  disabled?: boolean;
}

const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const DEFAULT_MAX_IMAGES = 4;
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function ImageUpload({
  onImagesChange,
  maxImages = DEFAULT_MAX_IMAGES,
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
}: ImageUploadProps) {
  const [images, setImages] = useState<(ChatImage & { preview: string })[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError('');

    // Check total count
    if (images.length + files.length > maxImages) {
      setError(`最大${maxImages}枚まで添付できます`);
      return;
    }

    const newImages: (ChatImage & { preview: string })[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate type
      if (!SUPPORTED_TYPES.includes(file.type)) {
        setError(`サポートされていない形式: ${file.type}`);
        continue;
      }

      // Validate size
      if (file.size > maxSize) {
        setError(`ファイルサイズが大きすぎます（最大5MB）: ${file.name}`);
        continue;
      }

      try {
        // Read file as Base64
        const base64 = await readFileAsBase64(file);
        const preview = URL.createObjectURL(file);

        newImages.push({
          data: base64,
          mimeType: file.type,
          size: file.size,
          preview,
        });
      } catch (error) {
        setError(`ファイルの読み込みに失敗しました: ${file.name}`);
        console.error('File read error:', error);
      }
    }

    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onImagesChange(updatedImages.map(({ preview, ...img }) => img));
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extract Base64 data (remove data:image/xxx;base64, prefix)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    validateAndProcessFiles(e.target.files);
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) {
      validateAndProcessFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    // Revoke object URL to prevent memory leak
    URL.revokeObjectURL(images[index].preview);

    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesChange(updatedImages.map(({ preview, ...img }) => img));
    setError('');
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      {/* Upload area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onClick={!disabled ? handleButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />
        <div className="text-sm text-gray-600">
          <p>クリックまたはドラッグ&ドロップで画像を追加</p>
          <p className="text-xs text-gray-500 mt-1">
            PNG, JPEG, WebP, GIF（最大{maxImages}枚、各5MB以内）
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image.preview}
                alt={`Upload ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                disabled={disabled}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                aria-label="画像を削除"
              >
                ×
              </button>
              <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {(image.size / 1024).toFixed(0)}KB
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
