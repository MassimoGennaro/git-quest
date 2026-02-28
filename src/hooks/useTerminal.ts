// hooks/useTerminal.ts — Input history and keyboard handling for the terminal

import { useState, useCallback, useRef } from 'react';

export interface UseTerminalResult {
  input: string;
  setInput: (value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useTerminal(onSubmit: (input: string) => void): UseTerminalResult {
  const [input, setInput] = useState('');
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const trimmed = input.trim();
        if (trimmed.length === 0) return;

        onSubmit(trimmed);
        historyRef.current = [trimmed, ...historyRef.current];
        setInput('');
        historyIndexRef.current = -1;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const history = historyRef.current;
        const next = Math.min(historyIndexRef.current + 1, history.length - 1);
        const entry = history[next];
        if (entry !== undefined) {
          setInput(entry);
          historyIndexRef.current = next;
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = historyIndexRef.current - 1;
        if (next < 0) {
          setInput('');
          historyIndexRef.current = -1;
        } else {
          const entry = historyRef.current[next];
          if (entry !== undefined) {
            setInput(entry);
            historyIndexRef.current = next;
          }
        }
      }
    },
    [input, onSubmit],
  );

  return { input, setInput, handleKeyDown };
}
