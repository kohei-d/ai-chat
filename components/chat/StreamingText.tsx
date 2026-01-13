'use client';

import { useEffect, useState } from 'react';
import ChatMessage from './ChatMessage';

interface StreamingTextProps {
  text: string;
}

/**
 * Component for displaying streaming text with animation
 */
export default function StreamingText({ text }: StreamingTextProps) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  return (
    <ChatMessage
      message={{ role: 'assistant', content: displayText }}
      isStreaming={true}
    />
  );
}
