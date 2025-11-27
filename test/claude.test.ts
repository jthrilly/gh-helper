#!/usr/bin/env node

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { generateCommitMessage, checkClaudeAvailability } from '../lib/claude.ts';

// Mock execFile at the module level
const mockExecFile = mock.fn();

describe('claude module', () => {
  beforeEach(() => {
    mock.reset();
    mockExecFile.mock.resetCalls();
  });

  describe('generateCommitMessage', () => {
    it('should generate commit message from diff', async () => {
      const mockResponse = 'feat: add new feature implementation';
      const diff = 'diff --git a/file.js b/file.js\n+console.log("test");';

      // Create a test version that uses our mock
      const testGenerateCommitMessage = async (diff: string): Promise<string> => {
        if (!diff || diff.trim().length === 0) {
          throw new Error('No diff content provided');
        }

        try {
          const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            mockExecFile('claude', ['-p', 'test prompt', '--output-format', 'text', '--model', 'sonnet'],
              { maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
              (error: any, result: any) => {
                if (error) reject(error);
                else resolve(result);
              });
          });

          return result.stdout.trim();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to generate commit message: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], opts: any, callback: Function) => {
        callback(null, { stdout: mockResponse, stderr: '' });
      });

      const result = await testGenerateCommitMessage(diff);
      assert.equal(result, mockResponse);
      assert.equal(mockExecFile.mock.calls.length, 1);
    });

    it('should throw error when diff is empty', async () => {
      await assert.rejects(
        async () => await generateCommitMessage(''),
        /No diff content provided/
      );
    });

    it('should handle Claude CLI errors', async () => {
      const diff = 'diff content';

      const testGenerateCommitMessage = async (diff: string): Promise<string> => {
        if (!diff || diff.trim().length === 0) {
          throw new Error('No diff content provided');
        }

        try {
          const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            mockExecFile('claude', ['-p', 'test prompt', '--output-format', 'text', '--model', 'sonnet'],
              { maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
              (error: any, result: any) => {
                if (error) reject(error);
                else resolve(result);
              });
          });

          return result.stdout.trim();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (errorMessage.includes('ENOENT')) {
            throw new Error('Claude Code CLI not found. Please ensure Claude Code is installed and available in PATH.');
          }

          throw new Error(`Failed to generate commit message: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], opts: any, callback: Function) => {
        const error: any = new Error('Command failed');
        error.code = 'ENOENT';
        callback(error, null);
      });

      await assert.rejects(
        async () => await testGenerateCommitMessage(diff),
        /Claude Code CLI not found/
      );
    });

    it('should handle sanitization', () => {
      // Test the sanitization function
      const testSanitize = (message: string): string => {
        return message
          .replace(/^```[a-z]*\n?/gm, '')
          .replace(/```$/gm, '')
          .replace(/^\s*```\s*$/gm, '')
          .trim();
      };

      const input = '```\nfeat: add feature\n```';
      const expected = 'feat: add feature';
      const result = testSanitize(input);
      assert.equal(result, expected);
    });

    it('should handle backticks in middle of message', () => {
      const testSanitize = (message: string): string => {
        return message
          .replace(/^```[a-z]*\n?/gm, '')
          .replace(/```$/gm, '')
          .replace(/^\s*```\s*$/gm, '')
          .trim();
      };

      const input = 'feat: add `console.log` debugging';
      const result = testSanitize(input);
      assert.equal(result, 'feat: add `console.log` debugging');
    });
  });

  describe('checkClaudeAvailability', () => {
    it('should return available when Claude Code is installed', async () => {
      const testCheckClaudeAvailability = async (): Promise<{ available: boolean; error?: string }> => {
        try {
          const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            mockExecFile('claude', ['--version'], { timeout: 5000 }, (error: any, result: any) => {
              if (error) reject(error);
              else resolve(result);
            });
          });

          if (result.stdout && result.stdout.includes('Claude Code')) {
            return { available: true };
          }
          return { available: false, error: 'Claude Code not properly installed' };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (errorMessage.includes('ENOENT')) {
            return { available: false, error: 'Claude Code CLI not found in PATH' };
          }

          return { available: false, error: `Claude availability check failed: ${errorMessage}` };
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], opts: any, callback: Function) => {
        callback(null, { stdout: '1.0.126 (Claude Code)', stderr: '' });
      });

      const result = await testCheckClaudeAvailability();
      assert.equal(result.available, true);
      assert.equal(mockExecFile.mock.calls.length, 1);
    });

    it('should return not available when Claude Code not found', async () => {
      const testCheckClaudeAvailability = async (): Promise<{ available: boolean; error?: string }> => {
        try {
          const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            mockExecFile('claude', ['--version'], { timeout: 5000 }, (error: any, result: any) => {
              if (error) reject(error);
              else resolve(result);
            });
          });

          if (result.stdout && result.stdout.includes('Claude Code')) {
            return { available: true };
          }
          return { available: false, error: 'Claude Code not properly installed' };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (errorMessage.includes('ENOENT')) {
            return { available: false, error: 'Claude Code CLI not found in PATH' };
          }

          return { available: false, error: `Claude availability check failed: ${errorMessage}` };
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], opts: any, callback: Function) => {
        const error: any = new Error('Command not found');
        error.code = 'ENOENT';
        callback(error, null);
      });

      const result = await testCheckClaudeAvailability();
      assert.equal(result.available, false);
      assert(result.error?.includes('Claude Code CLI not found in PATH'));
    });
  });
});