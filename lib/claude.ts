#!/usr/bin/env node

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const MAX_DIFF_LENGTH = 20000;
const SYSTEM_PROMPT = `You are a commit message generator. Generate clear, concise commit messages following conventional commit format.
Focus on WHAT changed and WHY, not implementation details.
Use present tense imperative mood (e.g., "Add", "Fix", "Update").
Keep the first line under 72 characters.
If needed, add a blank line and then more detailed explanation.`;

export async function generateCommitMessage(diff: string): Promise<string> {
  if (!diff || diff.trim().length === 0) {
    throw new Error('No diff content provided');
  }

  const truncatedDiff = diff.length > MAX_DIFF_LENGTH
    ? diff.substring(0, MAX_DIFF_LENGTH) + '\n... (diff truncated)'
    : diff;

  const userPrompt = `${SYSTEM_PROMPT}

Generate a commit message for the following git diff:

${truncatedDiff}

Return only the commit message, no other text.`;

  try {
    const { stdout, stderr } = await execFileAsync('claude', [
      '-p',
      userPrompt,
      '--output-format', 'text',
      '--model', 'sonnet'
    ], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000 // 30 second timeout
    });

    if (stderr && stderr.trim()) {
      console.warn('Claude CLI warning:', stderr.trim());
    }

    if (!stdout || !stdout.trim()) {
      throw new Error('No commit message generated');
    }

    return sanitizeMessage(stdout.trim());
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('ENOENT')) {
      throw new Error('Claude Code CLI not found. Please ensure Claude Code is installed and available in PATH.');
    }

    if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
      throw new Error('Claude authentication required. Please run: claude login');
    }

    throw new Error(`Failed to generate commit message: ${errorMessage}`);
  }
}

export async function checkClaudeAvailability(): Promise<{ available: boolean; error?: string }> {
  try {
    const { stdout } = await execFileAsync('claude', ['--version'], { timeout: 5000 });
    if (stdout && stdout.includes('Claude Code')) {
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
}

function sanitizeMessage(message: string): string {
  return message
    .replace(/^```[a-z]*\n?/gm, '')
    .replace(/```$/gm, '')
    .replace(/^\s*```\s*$/gm, '')
    .trim();
}