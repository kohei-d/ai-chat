import ReactMarkdown from 'react-markdown';
import type { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {isUser ? (
          <div className="space-y-2">
            {/* Display images if present */}
            {message.images && message.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {message.images.map((image, index) => (
                  <img
                    key={index}
                    src={`data:${image.mimeType};base64,${image.data}`}
                    alt={`Uploaded image ${index + 1}`}
                    className="rounded-lg max-w-full h-auto"
                  />
                ))}
              </div>
            )}
            {message.content && (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                code: ({ inline, children, ...props }: { inline?: boolean; children?: React.ReactNode }) =>
                  inline ? (
                    <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-gray-200 p-2 rounded text-sm font-mono overflow-x-auto" {...props}>
                      {children}
                    </code>
                  ),
                pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
                h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                a: ({ children, href }) => (
                  <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-gray-900 ml-1 animate-pulse"></span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
