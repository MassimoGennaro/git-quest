// components/panels/SlackPanel/SlackMessageItem.tsx — Single comm message display

import type { SlackMessage } from '@/levels/schema';

/** Character avatar config: initials + accent color */
const CHARACTER_CONFIG: Record<
  SlackMessage['from'],
  { initials: string; color: string; borderColor: string; displayName: string }
> = {
  alex: { initials: 'A', color: 'bg-blue-500/20', borderColor: 'border-blue-500/50', displayName: 'Alex' },
  sarah: { initials: 'S', color: 'bg-emerald-500/20', borderColor: 'border-emerald-500/50', displayName: 'Sarah' },
  marcus: { initials: 'M', color: 'bg-purple-500/20', borderColor: 'border-purple-500/50', displayName: 'Marcus' },
};

interface SlackMessageItemProps {
  message: SlackMessage;
}

export function SlackMessageItem({ message }: SlackMessageItemProps) {
  const config = CHARACTER_CONFIG[message.from];

  return (
    <div className="flex gap-2 px-3 py-2 hover:bg-panel-800/50 transition-colors">
      {/* Avatar */}
      <div
        className={`${config.color} border ${config.borderColor} w-8 h-8 rounded-full flex items-center justify-center text-gray-200 text-sm font-bold flex-shrink-0 mt-0.5`}
      >
        {config.initials}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-bold text-gray-200">
          {config.displayName}
        </span>
        <p className="text-sm text-panel-400 leading-relaxed whitespace-pre-wrap break-words">
          {message.text}
        </p>
      </div>
    </div>
  );
}
