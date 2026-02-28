// tests/engine/parser.test.ts — Unit tests for the command parser

import { describe, it, expect } from 'vitest';
import { parseCommand } from '../../src/engine/parser';

describe('parseCommand', () => {
  it('should reject empty input', () => {
    const result = parseCommand('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('enter a command');
    }
  });

  it('should reject non-git commands', () => {
    const result = parseCommand('ls -la');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('only accepts git commands');
    }
  });

  it('should reject bare "git" with no subcommand', () => {
    const result = parseCommand('git');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Usage: git <command>');
    }
  });

  it('should reject unsupported subcommands', () => {
    const result = parseCommand('git bisect');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Unknown command');
    }
  });

  it('should parse "git status" with no args or flags', () => {
    const result = parseCommand('git status');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.command).toBe('status');
      expect(result.parsed.args).toEqual([]);
      expect(result.parsed.flags).toEqual({});
    }
  });

  it('should parse "git add ." with positional argument', () => {
    const result = parseCommand('git add .');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.command).toBe('add');
      expect(result.parsed.args).toEqual(['.']);
    }
  });

  it('should parse "git add" with multiple file args', () => {
    const result = parseCommand('git add README.md config.js');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.command).toBe('add');
      expect(result.parsed.args).toEqual(['README.md', 'config.js']);
    }
  });

  it('should parse -m flag with quoted message', () => {
    const result = parseCommand('git commit -m "fix auth bug"');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.command).toBe('commit');
      expect(result.parsed.flags['m']).toBe('fix auth bug');
    }
  });

  it('should parse -m flag with single-quoted message', () => {
    const result = parseCommand("git commit -m 'add README'");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.flags['m']).toBe('add README');
    }
  });

  it('should parse --amend flag as boolean', () => {
    const result = parseCommand('git commit --amend -m "updated message"');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.flags['amend']).toBe(true);
      expect(result.parsed.flags['m']).toBe('updated message');
    }
  });

  it('should parse "git checkout -b feature/login"', () => {
    const result = parseCommand('git checkout -b feature/login');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.command).toBe('checkout');
      expect(result.parsed.flags['b']).toBe(true);
      expect(result.parsed.args).toEqual(['feature/login']);
    }
  });

  it('should parse "git log --oneline"', () => {
    const result = parseCommand('git log --oneline');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.command).toBe('log');
      expect(result.parsed.flags['oneline']).toBe(true);
    }
  });

  it('should preserve the raw input string', () => {
    const input = '  git commit -m "hello world"  ';
    const result = parseCommand(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.raw).toBe(input.trim());
    }
  });

  it('should handle extra whitespace', () => {
    const result = parseCommand('  git   add   README.md  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.command).toBe('add');
      expect(result.parsed.args).toEqual(['README.md']);
    }
  });

  it('should parse "git cherry-pick" as a valid command', () => {
    const result = parseCommand('git cherry-pick abc1234');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.command).toBe('cherry-pick');
      expect(result.parsed.args).toEqual(['abc1234']);
    }
  });

  it('should parse --hard and --soft flags', () => {
    const result = parseCommand('git reset --hard HEAD~1');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.parsed.command).toBe('reset');
      expect(result.parsed.flags['hard']).toBe(true);
      expect(result.parsed.args).toEqual(['HEAD~1']);
    }
  });
});
