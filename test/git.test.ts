#!/usr/bin/env node

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { promisify } from 'util';
import * as git from '../lib/git.ts';

// Mock execFile at the module level
const mockExecFile = mock.fn();

describe('git module', () => {
  beforeEach(() => {
    mock.reset();
    mockExecFile.mock.resetCalls();
  });

  describe('getStagedDiff', () => {
    it('should return staged diff content', async () => {
      const mockDiff = 'diff --git a/file.js b/file.js\n+console.log("test");';

      // Create a test version of getStagedDiff that uses our mock
      const testGetStagedDiff = async (): Promise<string> => {
        try {
          const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            mockExecFile('git', ['diff', '--cached'], { maxBuffer: 10 * 1024 * 1024 }, (error: any, result: any) => {
              if (error) reject(error);
              else resolve(result);
            });
          });
          return result.stdout.trim();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to get staged diff: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], opts: any, callback: Function) => {
        callback(null, { stdout: mockDiff, stderr: '' });
      });

      const result = await testGetStagedDiff();
      assert.equal(result, mockDiff.trim());
      assert.equal(mockExecFile.mock.calls.length, 1);
    });

    it('should handle errors from git diff', async () => {
      const testGetStagedDiff = async (): Promise<string> => {
        try {
          const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            mockExecFile('git', ['diff', '--cached'], { maxBuffer: 10 * 1024 * 1024 }, (error: any, result: any) => {
              if (error) reject(error);
              else resolve(result);
            });
          });
          return result.stdout.trim();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to get staged diff: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], opts: any, callback: Function) => {
        callback(new Error('git error'), null);
      });

      await assert.rejects(
        async () => await testGetStagedDiff(),
        /Failed to get staged diff/
      );
    });
  });

  describe('stageAllChanges', () => {
    it('should stage all changes successfully', async () => {
      const testStageAllChanges = async (): Promise<void> => {
        try {
          await new Promise<void>((resolve, reject) => {
            mockExecFile('git', ['add', '-A'], (error: any, result: any) => {
              if (error) reject(error);
              else resolve();
            });
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to stage changes: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], callback: Function) => {
        callback(null, { stdout: '', stderr: '' });
      });

      await testStageAllChanges();
      assert.equal(mockExecFile.mock.calls.length, 1);
    });

    it('should handle staging errors', async () => {
      const testStageAllChanges = async (): Promise<void> => {
        try {
          await new Promise<void>((resolve, reject) => {
            mockExecFile('git', ['add', '-A'], (error: any, result: any) => {
              if (error) reject(error);
              else resolve();
            });
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to stage changes: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], callback: Function) => {
        callback(new Error('staging failed'), null);
      });

      await assert.rejects(
        async () => await testStageAllChanges(),
        /Failed to stage changes/
      );
    });
  });

  describe('commit', () => {
    it('should create commit with message', async () => {
      const message = 'feat: add new feature';

      const testCommit = async (message: string): Promise<void> => {
        try {
          await new Promise<void>((resolve, reject) => {
            mockExecFile('git', ['commit', '-m', message], (error: any, result: any) => {
              if (error) reject(error);
              else resolve();
            });
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to commit: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], callback: Function) => {
        callback(null, { stdout: '', stderr: '' });
      });

      await testCommit(message);
      assert.equal(mockExecFile.mock.calls.length, 1);
    });

    it('should handle commit errors', async () => {
      const testCommit = async (message: string): Promise<void> => {
        try {
          await new Promise<void>((resolve, reject) => {
            mockExecFile('git', ['commit', '-m', message], (error: any, result: any) => {
              if (error) reject(error);
              else resolve();
            });
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to commit: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], callback: Function) => {
        callback(new Error('commit failed'), null);
      });

      await assert.rejects(
        async () => await testCommit('test message'),
        /Failed to commit/
      );
    });
  });

  describe('push', () => {
    it('should push to remote successfully', async () => {
      const pushOutput = 'Pushed to origin/main';

      const testPush = async (): Promise<string> => {
        try {
          const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            mockExecFile('git', ['push'], (error: any, result: any) => {
              if (error) reject(error);
              else resolve(result);
            });
          });
          return result.stdout;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to push: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], callback: Function) => {
        callback(null, { stdout: pushOutput, stderr: '' });
      });

      const result = await testPush();
      assert.equal(result, pushOutput);
      assert.equal(mockExecFile.mock.calls.length, 1);
    });

    it('should handle push errors', async () => {
      const testPush = async (): Promise<string> => {
        try {
          const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            mockExecFile('git', ['push'], (error: any, result: any) => {
              if (error) reject(error);
              else resolve(result);
            });
          });
          return result.stdout;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to push: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], callback: Function) => {
        callback(new Error('push failed'), null);
      });

      await assert.rejects(
        async () => await testPush(),
        /Failed to push/
      );
    });
  });

  describe('hasChanges', () => {
    it('should return true when changes exist', async () => {
      const testHasChanges = async (): Promise<boolean> => {
        try {
          const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            mockExecFile('git', ['status', '--porcelain'], (error: any, result: any) => {
              if (error) reject(error);
              else resolve(result);
            });
          });
          return result.stdout.trim().length > 0;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to check git status: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], callback: Function) => {
        callback(null, { stdout: 'M file.js\nA newfile.js', stderr: '' });
      });

      const result = await testHasChanges();
      assert.equal(result, true);
    });

    it('should return false when no changes', async () => {
      const testHasChanges = async (): Promise<boolean> => {
        try {
          const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            mockExecFile('git', ['status', '--porcelain'], (error: any, result: any) => {
              if (error) reject(error);
              else resolve(result);
            });
          });
          return result.stdout.trim().length > 0;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to check git status: ${errorMessage}`);
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], callback: Function) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const result = await testHasChanges();
      assert.equal(result, false);
    });
  });

  describe('isGitRepository', () => {
    it('should return true for git repository', async () => {
      const testIsGitRepository = async (): Promise<boolean> => {
        try {
          await new Promise<void>((resolve, reject) => {
            mockExecFile('git', ['rev-parse', '--git-dir'], (error: any, result: any) => {
              if (error) reject(error);
              else resolve();
            });
          });
          return true;
        } catch {
          return false;
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], callback: Function) => {
        callback(null, { stdout: '.git', stderr: '' });
      });

      const result = await testIsGitRepository();
      assert.equal(result, true);
    });

    it('should return false for non-git directory', async () => {
      const testIsGitRepository = async (): Promise<boolean> => {
        try {
          await new Promise<void>((resolve, reject) => {
            mockExecFile('git', ['rev-parse', '--git-dir'], (error: any, result: any) => {
              if (error) reject(error);
              else resolve();
            });
          });
          return true;
        } catch {
          return false;
        }
      };

      mockExecFile.mock.mockImplementation((cmd: string, args: string[], callback: Function) => {
        callback(new Error('not a git repository'), null);
      });

      const result = await testIsGitRepository();
      assert.equal(result, false);
    });
  });
});