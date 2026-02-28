// components/panels/Terminal/TerminalOutput.tsx — Scrollable output area

import { useEffect, useRef } from 'react';

import type { TerminalLine } from '@/hooks/useGitEngine';

interface TerminalOutputProps {
  lines: TerminalLine[];
}

export function TerminalOutput({ lines }: TerminalOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines.length]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-sm leading-relaxed">
      {lines.map((line, i) => (
        <div
          key={i}
          className={
            line.type === 'error'
              ? 'text-red-400'
              : line.type === 'input'
                ? 'text-gray-400'
                : 'text-green-300'
          }
        >
          <pre className="whitespace-pre-wrap break-words m-0">{line.text}</pre>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
