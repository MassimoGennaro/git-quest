// components/panels/WorkingTreePanel/FileEntry.tsx — A single file entry

interface FileEntryProps {
  name: string;
  status?: string;
  isLast?: boolean;
}

export function FileEntry({ name, status, isLast = false }: FileEntryProps) {
  const statusColors: Record<string, string> = {
    staged: 'text-term-400',
    modified: 'text-yellow-400',
    untracked: 'text-panel-400',
    deleted: 'text-red-400',
    conflicted: 'text-red-500',
  };

  const colorClass = (status && statusColors[status]) ?? 'text-panel-400';
  const treeChar = isLast ? '\u2514\u2500\u2500' : '\u251C\u2500\u2500';

  return (
    <div className={`font-mono text-sm px-2 py-0.5 ${colorClass}`}>
      <span className="text-panel-600 mr-1">{treeChar}</span>
      {name}
    </div>
  );
}
