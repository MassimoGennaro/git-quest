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
  /** Tracks the merge-in-progress parent hash (set during conflicted merge) */
  mergeHead?: string;
  /** Reflog entries tracking HEAD movements */
  reflog: ReflogEntry[];
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

/** A single reflog entry recording a HEAD movement */
export interface ReflogEntry {
  /** The hash HEAD pointed to after this action */
  hash: string;
  /** Human-readable description, e.g. "commit: add README" */
  description: string;
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
  /** If set, signals the UI to open the interactive rebase picker */
  rebaseInteractive?: RebaseInteractiveInfo;
}

/** Set of files with merge conflicts */
export type ConflictSet = Record<string, ConflictInfo>;

export interface ConflictInfo {
  ours: string;
  theirs: string;
  ancestor: string;
}

/** Info passed to the UI for interactive rebase */
export interface RebaseInteractiveInfo {
  /** Commits eligible for squash/pick/drop, oldest first */
  commits: { hash: string; message: string }[];
  /** The hash to replay onto */
  ontoHash: string;
}

/** Type for a command handler function */
export type CommandHandler = (
  args: string[],
  flags: Record<string, string | boolean>,
  state: RepoState,
) => CommandResult;
