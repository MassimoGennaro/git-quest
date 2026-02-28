// components/panels/Terminal/Terminal.tsx — Complete terminal component

import { useState, useCallback } from 'react';

import type { TerminalLine } from '@/hooks/useGitEngine';
import { useTerminal } from '@/hooks/useTerminal';
import { TerminalInput } from './TerminalInput';
import { TerminalOutput } from './TerminalOutput';

interface TerminalProps {
  lines: TerminalLine[];
  onExecute: (input: string) => void;
}

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 288; // ~h-72

export function Terminal({ lines, onExecute }: TerminalProps) {
  const { input, setInput, handleKeyDown } = useTerminal(onExecute);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = height;

      const onMove = (moveEvent: MouseEvent) => {
        const delta = startY - moveEvent.clientY;
        const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + delta));
        setHeight(newHeight);
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [height],
  );

  return (
    <div
      className="flex flex-col bg-panel-950 border-t border-accent-400/20 relative"
      style={{ height }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize z-10 group flex items-center justify-center"
      >
        <div className="w-12 h-0.5 rounded-full bg-panel-600 group-hover:bg-accent-400/50 transition-colors" />
      </div>

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline pointer-events-none z-0" />

      <TerminalOutput lines={lines} />
      <TerminalInput
        value={input}
        onChange={setInput}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
