// components/panels/SlackPanel/SlackPanel.tsx — Slack-style chat panel

import { useState, useEffect, useRef } from 'react';

import type { SlackMessage } from '@/levels/schema';
import { SlackMessageItem } from './SlackMessageItem';

interface SlackPanelProps {
  messages: SlackMessage[];
  channelName?: string;
}

export function SlackPanel({
  messages,
  channelName = '#dev-team',
}: SlackPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, collapsed]);

  if (collapsed) {
    return (
      <div className="border-b border-gray-700 bg-gray-800">
        <button
          onClick={() => setCollapsed(false)}
          className="w-full px-3 py-2 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="font-medium">{channelName}</span>
          <span className="text-gray-500">
            — {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-b border-gray-700 bg-gray-800 max-h-48">
      {/* Channel header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-sm font-bold text-gray-200">
            {channelName}
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          title="Collapse"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-1">
        {messages.length === 0 ? (
          <p className="px-3 py-2 text-sm text-gray-500 italic">
            No messages yet...
          </p>
        ) : (
          messages.map((msg, i) => (
            <SlackMessageItem key={`${msg.from}-${i}`} message={msg} />
          ))
        )}
      </div>
    </div>
  );
}
