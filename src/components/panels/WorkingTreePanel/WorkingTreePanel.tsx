// components/panels/WorkingTreePanel/WorkingTreePanel.tsx — File status panel

import type { RepoState } from '@/engine/types';
import { FileEntry } from './FileEntry';

interface WorkingTreePanelProps {
  state: RepoState;
}

export function WorkingTreePanel({ state }: WorkingTreePanelProps) {
  const staged = Object.keys(state.index).sort();

  const modified: string[] = [];
  const untracked: string[] = [];
  const deleted: string[] = [];
  const conflicted: string[] = [];

  for (const [name, file] of Object.entries(state.workingTree.files)) {
    switch (file.status) {
      case 'modified':
        modified.push(name);
        break;
      case 'untracked':
        untracked.push(name);
        break;
      case 'deleted':
        deleted.push(name);
        break;
      case 'conflicted':
        conflicted.push(name);
        break;
    }
  }

  modified.sort();
  untracked.sort();
  deleted.sort();
  conflicted.sort();

  const isEmpty =
    staged.length === 0 &&
    modified.length === 0 &&
    untracked.length === 0 &&
    deleted.length === 0 &&
    conflicted.length === 0;

  return (
    <div className="w-56 bg-gray-850 border-r border-gray-700 overflow-y-auto flex flex-col text-sm">
      <div className="px-3 py-2 border-b border-gray-700 font-semibold text-gray-300 uppercase tracking-wider text-xs">
        Working Tree
      </div>

      {isEmpty && (
        <div className="px-3 py-4 text-gray-500 text-xs italic">
          Clean working tree
        </div>
      )}

      {staged.length > 0 && (
        <Section title="Staged" color="text-green-400">
          {staged.map((name) => (
            <FileEntry key={name} name={name} status="staged" />
          ))}
        </Section>
      )}

      {conflicted.length > 0 && (
        <Section title="Conflicted" color="text-red-500">
          {conflicted.map((name) => (
            <FileEntry key={name} name={name} status="conflicted" />
          ))}
        </Section>
      )}

      {modified.length > 0 && (
        <Section title="Modified" color="text-yellow-400">
          {modified.map((name) => (
            <FileEntry key={name} name={name} status="modified" />
          ))}
        </Section>
      )}

      {deleted.length > 0 && (
        <Section title="Deleted" color="text-red-400">
          {deleted.map((name) => (
            <FileEntry key={name} name={name} status="deleted" />
          ))}
        </Section>
      )}

      {untracked.length > 0 && (
        <Section title="Untracked" color="text-gray-400">
          {untracked.map((name) => (
            <FileEntry key={name} name={name} status="untracked" />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-1 py-1">
      <div
        className={`px-2 py-1 text-xs font-semibold uppercase tracking-wider ${color} border-b border-gray-700`}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
