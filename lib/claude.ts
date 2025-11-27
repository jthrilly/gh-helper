#!/usr/bin/env node

import { spawn } from 'child_process';

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
    return await callClaude(userPrompt);
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

async function callClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', [
      '-p',
      '--output-format', 'text',
      '--model', 'haiku'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}. stderr: ${stderr}`));
        return;
      }

      if (stderr && stderr.trim()) {
        console.warn('Claude CLI warning:', stderr.trim());
      }

      if (!stdout || !stdout.trim()) {
        reject(new Error('No commit message generated'));
        return;
      }

      resolve(sanitizeMessage(stdout.trim()));
    });

    child.on('error', (error) => {
      reject(error);
    });

    // Send the prompt via stdin and close the input
    child.stdin.write(prompt);
    child.stdin.end();

    // Set a timeout
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Claude CLI timed out after 30 seconds'));
    }, 30000);

    child.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

export async function checkClaudeAvailability(): Promise<{ available: boolean; error?: string }> {
  try {
    return new Promise((resolve) => {
      const child = spawn('claude', ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && stdout.includes('Claude Code')) {
          resolve({ available: true });
        } else {
          resolve({ available: false, error: 'Claude Code not properly installed' });
        }
      });

      child.on('error', (error) => {
        const errorMessage = error.message;
        if (errorMessage.includes('ENOENT')) {
          resolve({ available: false, error: 'Claude Code CLI not found in PATH' });
        } else {
          resolve({ available: false, error: `Claude availability check failed: ${errorMessage}` });
        }
      });

      // Set a timeout for the version check
      setTimeout(() => {
        child.kill();
        resolve({ available: false, error: 'Claude version check timed out' });
      }, 5000);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
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