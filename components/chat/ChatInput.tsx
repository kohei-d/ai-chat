'use client';

import { useState, FormEvent, KeyboardEvent } from 'react';
import ImageUpload from './ImageUpload';
import type { ChatImage } from '@/types/chat';

interface ChatInputProps {
  onSend: (message: string, images?: ChatImage[]) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<ChatImage[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const trimmedMessage = message.trim();
    // Allow sending if there's either a message or images
    if ((!trimmedMessage && images.length === 0) || disabled) return;

    onSend(trimmedMessage || '画像を送信します', images.length > 0 ? images : undefined);
    setMessage('');
    setImages([]);
    setShowImageUpload(false);
  };

  const handleImagesChange = (newImages: ChatImage[]) => {
    setImages(newImages);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // IME変換中（日本語入力中など）はEnterキーでの送信を無効化
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-white p-4">
      <div className="space-y-3">
        {/* Image upload section */}
        {showImageUpload && (
          <ImageUpload
            onImagesChange={handleImagesChange}
            disabled={disabled}
          />
        )}

        {/* Input area */}
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <div className="flex items-end space-x-2">
              {/* Image upload toggle button */}
              <button
                type="button"
                onClick={() => setShowImageUpload(!showImageUpload)}
                disabled={disabled}
                className={`px-3 py-2 rounded-lg border transition-colors duration-200 h-[72px] ${
                  showImageUpload
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                title="画像を添付"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>

              {/* Text input */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder="メッセージを入力してください（Shift + Enterで改行）"
                disabled={disabled}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={disabled || (!message.trim() && images.length === 0)}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 h-[72px]"
          >
            送信
          </button>
        </div>

        {/* Image count indicator */}
        {images.length > 0 && (
          <div className="text-sm text-gray-600">
            {images.length}枚の画像が添付されています
          </div>
        )}
      </div>
    </form>
  );
}
