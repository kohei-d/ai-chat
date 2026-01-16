'use client';

import { useState, useEffect, useRef } from 'react';
import type { ChatMessage, ChatImage } from '@/types/chat';
import { getSessionId, sendChatMessage, fetchChatHistory } from '@/lib/client-utils';
import ChatMessageComponent from './ChatMessage';
import StreamingText from './StreamingText';
import ChatInput from './ChatInput';
import Loading from '../common/Loading';

export default function ChatContainer() {
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);

    if (id) {
      setIsLoading(true);
      fetchChatHistory(id)
        .then((history) => {
          setMessages(history);
        })
        .catch((err) => {
          console.error('Failed to load chat history:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (message: string, images?: ChatImage[]) => {
    if (!sessionId || isSending) return;

    const userMessage: ChatMessage = { role: 'user', content: message, images };
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);
    setError(null);
    setStreamingText('');

    await sendChatMessage(
      sessionId,
      message,
      (chunk) => {
        setStreamingText((prev) => prev + chunk);
      },
      (errorMsg) => {
        setError(errorMsg);
        setIsSending(false);
        setStreamingText('');
      },
      (fullText) => {
        // ストリーミング完了時に最終テキストを受け取る
        if (fullText) {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: fullText,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
        setStreamingText('');
        setIsSending(false);
      },
      images
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Chat</h1>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loading />
          </div>
        ) : messages.length === 0 && !streamingText ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">チャットを開始してください</p>
              <p className="text-sm">メッセージを入力して、AIと会話を始めましょう</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {messages.map((msg, index) => (
              <ChatMessageComponent key={index} message={msg} />
            ))}
            {streamingText && <StreamingText text={streamingText} />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <div className="max-w-4xl mx-auto">
            <p className="text-red-600 text-sm">
              <span className="font-semibold">エラー:</span> {error}
            </p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSendMessage} disabled={isSending} />
        </div>
      </div>
    </div>
  );
}
