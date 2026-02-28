// engine/types.ts — Core data types for the git simulation engine

/** An immutable commit object in the object store */
export interface Commit {
  hash: string;
  message: string;
  parentHashes: string[];
  tree: FileTree;
  timestamp: number;
}

/** A snapshot of all tracked files */
export type FileTree = Record<string, FileContent>;

export interface FileContent {
  content: string;
}

/** The complete simulated repository state */
export interface RepoState {
  commits: Record<string, Commit>;
  branches: Record<string, string>;
  head: HeadState;
  index: StagedChanges;
  workingTree: WorkingTreeState;
  remote: RemoteState;
  stash: StashEntry[];
}

export type HeadState =
  | { type: 'branch'; name: string }
  | { type: 'detached'; hash: string };

export interface WorkingTreeState {
  files: Record<string, WorkingFile>;
}

export interface WorkingFile {
  status: 'untracked' | 'modified' | 'deleted' | 'conflicted';
  content: string;
  conflictOurs?: string;
  conflictTheirs?: string;
  conflictAncestor?: string;
}

/** Staging area: filename -> content to be committed */
export type StagedChanges = Record<string, string>;

export interface RemoteState {
  name: string;
  branches: Record<string, string>;
}

export interface StashEntry {
  index: StagedChanges;
  workingTree: WorkingTreeState;
  message: string;
}

/** Result of parsing a command string */
export interface ParsedCommand {
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
  raw: string;
}

/** Error returned when a command can't be parsed */
export interface ParseError {
  success: false;
  error: string;
  raw: string;
}

export type ParseResult =
  | { success: true; parsed: ParsedCommand }
  | ParseError;

/** Result of executing a command against the repo state */
export interface CommandResult {
  success: boolean;
  output: string;
  newState: RepoState;
  conflictsTriggered?: ConflictSet;
}

/** Set of files with merge conflicts */
export type ConflictSet = Record<string, ConflictInfo>;

export interface ConflictInfo {
  ours: string;
  theirs: string;
  ancestor: string;
}

/** Type for a command handler function */
export type CommandHandler = (
  args: string[],
  flags: Record<string, string | boolean>,
  state: RepoState,
) => CommandResult;
