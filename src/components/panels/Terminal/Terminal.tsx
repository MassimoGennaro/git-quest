// components/panels/Terminal/Terminal.tsx — Complete terminal component

import type { TerminalLine } from '@/hooks/useGitEngine';
import { useTerminal } from '@/hooks/useTerminal';
import { TerminalInput } from './TerminalInput';
import { TerminalOutput } from './TerminalOutput';

interface TerminalProps {
  lines: TerminalLine[];
  onExecute: (input: string) => void;
}

export function Terminal({ lines, onExecute }: TerminalProps) {
  const { input, setInput, handleKeyDown } = useTerminal(onExecute);

  return (
    <div className="flex flex-col bg-gray-950 border-t border-gray-700 h-56">
      <TerminalOutput lines={lines} />
      <TerminalInput
        value={input}
        onChange={setInput}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
