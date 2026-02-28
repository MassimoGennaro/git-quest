// components/panels/Terminal/TerminalInput.tsx — Command input line

interface TerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function TerminalInput({ value, onChange, onKeyDown }: TerminalInputProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-700">
      <span className="text-green-400 font-mono text-sm select-none">$</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="flex-1 bg-transparent text-gray-100 font-mono text-sm outline-none placeholder-gray-600"
        placeholder="git ..."
        autoFocus
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}
