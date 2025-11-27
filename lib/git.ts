#!/usr/bin/env node

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function getStagedDiff(): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--cached'], {
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout.trim();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get staged diff: ${errorMessage}`);
  }
}

export async function stageAllChanges(): Promise<void> {
  try {
    await execFileAsync('git', ['add', '-A']);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to stage changes: ${errorMessage}`);
  }
}

export async function commit(message: string): Promise<void> {
  try {
    await execFileAsync('git', ['commit', '-m', message]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to commit: ${errorMessage}`);
  }
}

export async function push(): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['push']);
    return stdout;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to push: ${errorMessage}`);
  }
}

export async function hasChanges(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain']);
    return stdout.trim().length > 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to check git status: ${errorMessage}`);
  }
}

export async function isGitRepository(): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}