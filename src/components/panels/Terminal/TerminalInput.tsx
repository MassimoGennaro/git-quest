// components/panels/Terminal/TerminalInput.tsx — Command input line

interface TerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function TerminalInput({ value, onChange, onKeyDown }: TerminalInputProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-panel-700 relative z-10">
      <span className="text-accent-400 font-mono text-sm select-none text-glow-sm">
        &#x2736; gitquest &gt;
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="flex-1 bg-transparent text-gray-100 font-mono text-sm outline-none placeholder-panel-500 caret-accent-400"
        placeholder="type a git command..."
        autoFocus
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}
