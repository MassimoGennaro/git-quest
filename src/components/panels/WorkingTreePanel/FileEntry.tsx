// components/panels/WorkingTreePanel/FileEntry.tsx — A single file entry

interface FileEntryProps {
  name: string;
  status?: string;
}

export function FileEntry({ name, status }: FileEntryProps) {
  const statusColors: Record<string, string> = {
    staged: 'text-green-400',
    modified: 'text-yellow-400',
    untracked: 'text-gray-400',
    deleted: 'text-red-400',
    conflicted: 'text-red-500',
  };

  const colorClass = (status && statusColors[status]) ?? 'text-gray-300';

  return (
    <div className={`font-mono text-sm px-2 py-0.5 ${colorClass}`}>
      {name}
    </div>
  );
}
