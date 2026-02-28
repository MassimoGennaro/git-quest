// components/panels/SlackPanel/SlackPanel.tsx — Mission comms panel

import { useState, useEffect, useRef } from 'react';

import type { SlackMessage } from '@/levels/schema';
import { SlackMessageItem } from './SlackMessageItem';

interface SlackPanelProps {
  messages: SlackMessage[];
  channelName?: string;
}

export function SlackPanel({
  messages,
  channelName = '#mission-comms',
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
      <div className="border-b border-panel-700 bg-panel-900">
        <button
          onClick={() => setCollapsed(false)}
          className="w-full px-3 py-2 flex items-center gap-2 text-sm text-panel-400 hover:text-accent-400 transition-colors"
        >
          <span className="text-accent-400/70 text-xs">&#x23FA;</span>
          <span className="font-medium">{channelName}</span>
          <span className="text-panel-500">
            &mdash; {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-b border-panel-700 bg-panel-900 max-h-48">
      {/* Channel header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-panel-700">
        <div className="flex items-center gap-2">
          <span className="text-accent-400/70 text-xs">&#x23FA;</span>
          <span className="text-sm font-bold text-accent-300/80">
            {channelName}
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-panel-500 hover:text-accent-400 transition-colors text-xs font-mono"
          title="Collapse"
        >
          &#x25BC;
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-1">
        {messages.length === 0 ? (
          <p className="px-3 py-2 text-sm text-panel-500 italic">
            Awaiting transmission...
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
