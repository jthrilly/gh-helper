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

export async function generateCommitMessageFromAnalysis(
  analysisResult: import('./analysis.ts').AnalysisResult
): Promise<string> {
  const { fileAnalyses, overallScope, suggestedCommitType } = analysisResult;

  // Group analyses by impact and category
  const majorChanges = fileAnalyses.filter(a => a.impact === 'major');
  const minorChanges = fileAnalyses.filter(a => a.impact === 'minor');
  const trivialChanges = fileAnalyses.filter(a => a.impact === 'trivial');

  const codeChanges = fileAnalyses.filter(a => a.category.type === 'code');
  const testChanges = fileAnalyses.filter(a => a.category.type === 'test');
  const docChanges = fileAnalyses.filter(a => a.category.type === 'documentation');

  // Build context for Claude
  const context = buildAnalysisContext(fileAnalyses, overallScope, suggestedCommitType);

  const prompt = `You are a commit message generator. Based on the analysis of changed files, generate a clear, concise commit message.

${context}

Generate a commit message that:
1. Uses conventional commit format: ${suggestedCommitType}(scope): description
2. Focuses on the primary change and business value
3. Keeps the first line under 72 characters
4. Uses present tense imperative mood
5. If there are multiple significant changes, add a blank line and bullet points for details

Consider the overall scope: ${overallScope}

Return only the commit message, no other text.`;

  try {
    return await callClaude(prompt);
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

function buildAnalysisContext(
  analyses: import('./analysis.ts').FileAnalysis[],
  overallScope: string,
  suggestedCommitType: string
): string {
  let context = `Analysis Summary:
- Overall scope: ${overallScope}
- Suggested type: ${suggestedCommitType}
- Total files changed: ${analyses.length}

File Changes:\n`;

  // Group by impact for better organization
  const majorChanges = analyses.filter(a => a.impact === 'major');
  const minorChanges = analyses.filter(a => a.impact === 'minor');
  const trivialChanges = analyses.filter(a => a.impact === 'trivial');

  if (majorChanges.length > 0) {
    context += `\nMajor Changes:\n`;
    majorChanges.forEach(analysis => {
      context += `- ${analysis.file.path} (${analysis.file.status}): ${analysis.summary}\n`;
    });
  }

  if (minorChanges.length > 0) {
    context += `\nMinor Changes:\n`;
    minorChanges.forEach(analysis => {
      context += `- ${analysis.file.path} (${analysis.file.status}): ${analysis.summary}\n`;
    });
  }

  if (trivialChanges.length > 0 && trivialChanges.length <= 5) {
    context += `\nTrivial Changes:\n`;
    trivialChanges.forEach(analysis => {
      context += `- ${analysis.file.path}: ${analysis.summary}\n`;
    });
  } else if (trivialChanges.length > 5) {
    context += `\nTrivial Changes: ${trivialChanges.length} files (tooling, generated files, etc.)\n`;
  }

  return context;
}

export async function callClaude(prompt: string): Promise<string> {
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