#!/usr/bin/env node

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = promisify(execFile);

describe('gh-helper integration tests', () => {
  const ghHelperPath = path.join(__dirname, '..', 'gh-helper.ts');

  describe('help command', () => {
    it('should display help message', async () => {
      const { stdout } = await execFileAsync('node', ['--experimental-strip-types', ghHelperPath, 'help']);
      assert(stdout.includes('GitHub Helper - AI-Assisted Commit Tool'));
      assert(stdout.includes('commit'));
      assert(stdout.includes('auth'));
    });

    it('should display help with --help flag', async () => {
      const { stdout } = await execFileAsync('node', ['--experimental-strip-types', ghHelperPath, '--help']);
      assert(stdout.includes('GitHub Helper - AI-Assisted Commit Tool'));
    });

    it('should display help with -h flag', async () => {
      const { stdout } = await execFileAsync('node', ['--experimental-strip-types', ghHelperPath, '-h']);
      assert(stdout.includes('GitHub Helper - AI-Assisted Commit Tool'));
    });
  });

  describe('no command specified', () => {
    it('should show error and help when no command given', async () => {
      try {
        await execFileAsync('node', ['--experimental-strip-types', ghHelperPath]);
        assert.fail('Should have thrown an error');
      } catch (error: any) {
        assert(error.stderr.includes('Error: No command specified'));
        assert(error.stdout.includes('GitHub Helper - AI-Assisted Commit Tool'));
      }
    });
  });

  describe('unknown command', () => {
    it('should show error for unknown command', async () => {
      try {
        await execFileAsync('node', ['--experimental-strip-types', ghHelperPath, 'unknown']);
        assert.fail('Should have thrown an error');
      } catch (error: any) {
        assert(error.stderr.includes('Error: Unknown command "unknown"'));
        assert(error.stdout.includes('GitHub Helper - AI-Assisted Commit Tool'));
      }
    });
  });

  describe('command validation', () => {
    it('should accept commit command', async () => {
      // This test would normally fail since we don't have git or API key setup
      // But we can verify the command is recognized by checking for specific error messages
      try {
        await execFileAsync('node', ['--experimental-strip-types', ghHelperPath, 'commit'], { timeout: 5000 });
        assert.fail('Should have thrown an error');
      } catch (error: any) {
        // Should get a specific error about git repo or API key, not unknown command
        assert(!error.stderr.includes('Unknown command'));
        assert(
          error.stderr.includes('Not a git repository') ||
          error.stderr.includes('No API key found') ||
          error.stdout.includes('API key')
        );
      }
    });

    it('should accept auth command', async () => {
      // Test that auth command is recognized by checking it doesn't give unknown command error
      try {
        await execFileAsync('node', ['--experimental-strip-types', ghHelperPath, 'auth'], {
          timeout: 5000
        });
      } catch (error: any) {
        // Should not get unknown command error
        assert(!error.stderr.includes('Unknown command'));
      }
    });
  });

  describe('CLI argument parsing', () => {
    it('should handle multiple arguments for auth command', async () => {
      try {
        await execFileAsync('node', ['--experimental-strip-types', ghHelperPath, 'auth', '--check'], { timeout: 5000 });
      } catch (error: any) {
        // Should not get unknown command error
        assert(!error.stderr.includes('Unknown command'));
      }
    });
  });

  describe('TypeScript execution', () => {
    it('should run TypeScript files directly with Node', async () => {
      const { stdout } = await execFileAsync('node', ['--experimental-strip-types', ghHelperPath, 'help']);
      assert(stdout.includes('GitHub Helper'));
      // Verify that TypeScript syntax is being handled correctly
    });
  });
});