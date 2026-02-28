// components/panels/SlackPanel/SlackMessageItem.tsx — Single Slack message display

import type { SlackMessage } from '@/levels/schema';

/** Character avatar config: initials + background color */
const CHARACTER_CONFIG: Record<
  SlackMessage['from'],
  { initials: string; color: string; displayName: string }
> = {
  alex: { initials: 'A', color: 'bg-blue-500', displayName: 'Alex' },
  sarah: { initials: 'S', color: 'bg-green-500', displayName: 'Sarah' },
  marcus: { initials: 'M', color: 'bg-purple-500', displayName: 'Marcus' },
};

interface SlackMessageItemProps {
  message: SlackMessage;
}

export function SlackMessageItem({ message }: SlackMessageItemProps) {
  const config = CHARACTER_CONFIG[message.from];

  return (
    <div className="flex gap-2 px-3 py-2 hover:bg-gray-750/50">
      {/* Avatar */}
      <div
        className={`${config.color} w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5`}
      >
        {config.initials}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-bold text-gray-100">
          {config.displayName}
        </span>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </p>
      </div>
    </div>
  );
}
