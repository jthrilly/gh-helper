#!/usr/bin/env node

import { callOllamaForFileAnalysis, SYSTEM_PROMPTS } from './ollama.ts';
import { categorizeFile, getFileDiff } from './git.ts';
import type { FileChange, FileCategory } from './git.ts';

export interface FileAnalysis {
  file: FileChange;
  category: FileCategory;
  summary: string;
  impact: 'major' | 'minor' | 'trivial';
}

export interface AnalysisResult {
  fileAnalyses: FileAnalysis[];
  overallScope: string;
  suggestedCommitType: string;
}

export async function analyzeChanges(
  files: FileChange[],
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<AnalysisResult> {
  const fileAnalyses: FileAnalysis[] = [];

  // Process files sequentially to avoid overwhelming Ollama with concurrent requests
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Report progress
    if (onProgress) {
      onProgress(i + 1, files.length, file.path);
    }
    
    const category = categorizeFile(file.path);

    if (!category.needsAnalysis) {
      fileAnalyses.push({
        file,
        category,
        summary: category.summary || 'File updated',
        impact: 'trivial'
      });
      continue;
    }

    try {
      const diff = await getFileDiff(file.path);
      const analysis = await analyzeFileChange(file, category, diff);
      fileAnalyses.push(analysis);
    } catch (error) {
      console.warn(`Warning: Could not analyze ${file.path}: ${error}`);
      fileAnalyses.push({
        file,
        category,
        summary: `${file.status} ${category.type} file`,
        impact: 'minor'
      });
    }
  }

  const overallScope = determineOverallScope(fileAnalyses);
  const suggestedCommitType = suggestCommitType(fileAnalyses);

  return {
    fileAnalyses,
    overallScope,
    suggestedCommitType
  };
}

async function analyzeFileChange(
  file: FileChange,
  category: FileCategory,
  diff: string
): Promise<FileAnalysis> {
  if (!diff || diff.trim().length === 0) {
    return {
      file,
      category,
      summary: `${file.status} ${file.path}`,
      impact: 'trivial'
    };
  }

  const { prompt, systemPrompt } = createAnalysisPrompt(file, category, diff);

  try {
    const response = await callOllamaForFileAnalysis(prompt, systemPrompt);
    return parseAnalysisResponse(file, category, response);
  } catch (error) {
    console.warn(`Failed to analyze ${file.path}, using fallback`);
    return createFallbackAnalysis(file, category, diff);
  }
}

function createAnalysisPrompt(file: FileChange, category: FileCategory, diff: string): { prompt: string; systemPrompt: string } {
  const truncatedDiff = diff.length > 5000
    ? diff.substring(0, 5000) + '\n... (diff truncated)'
    : diff;

  // Select appropriate system prompt based on file category
  let systemPrompt: string;
  switch (category.type) {
    case 'code':
      systemPrompt = SYSTEM_PROMPTS.codeAnalysis;
      break;
    case 'test':
      systemPrompt = SYSTEM_PROMPTS.testAnalysis;
      break;
    case 'documentation':
      systemPrompt = SYSTEM_PROMPTS.documentationAnalysis;
      break;
    case 'configuration':
      systemPrompt = SYSTEM_PROMPTS.configurationAnalysis;
      break;
    default:
      systemPrompt = SYSTEM_PROMPTS.codeAnalysis; // fallback
  }

  const prompt = `Analyze this ${category.type} file change:

File: ${file.path}
Status: ${file.status}
${file.oldPath ? `Old path: ${file.oldPath}` : ''}

Diff:
${truncatedDiff}

Respond with exactly this format:
SUMMARY: [Brief description of what changed]
IMPACT: [major/minor/trivial - based on scope and importance]

Guidelines for IMPACT:
- major: New features, breaking changes, significant refactoring
- minor: Bug fixes, small enhancements, documentation updates  
- trivial: Formatting, comments, minor config tweaks`;

  return { prompt, systemPrompt };
}

function parseAnalysisResponse(file: FileChange, category: FileCategory, response: string): FileAnalysis {
  const lines = response.split('\n');
  let summary = '';
  let impact: 'major' | 'minor' | 'trivial' = 'minor';

  for (const line of lines) {
    if (line.startsWith('SUMMARY:')) {
      summary = line.replace('SUMMARY:', '').trim();
    } else if (line.startsWith('IMPACT:')) {
      const impactStr = line.replace('IMPACT:', '').trim().toLowerCase();
      if (impactStr === 'major' || impactStr === 'minor' || impactStr === 'trivial') {
        impact = impactStr;
      }
    }
  }

  if (!summary) {
    summary = createFallbackSummary(file, category);
  }

  return { file, category, summary, impact };
}

function createFallbackAnalysis(file: FileChange, category: FileCategory, diff: string): FileAnalysis {
  const summary = createFallbackSummary(file, category);
  const impact = estimateImpactFromDiff(diff);

  return { file, category, summary, impact };
}

function createFallbackSummary(file: FileChange, category: FileCategory): string {
  const action = file.status === 'added' ? 'Add' :
                file.status === 'deleted' ? 'Remove' :
                file.status === 'renamed' ? 'Rename' : 'Update';

  return `${action} ${category.type} file ${file.path}`;
}

function estimateImpactFromDiff(diff: string): 'major' | 'minor' | 'trivial' {
  const lines = diff.split('\n');
  const changedLines = lines.filter(line => line.startsWith('+') || line.startsWith('-')).length;

  if (changedLines > 100) return 'major';
  if (changedLines > 10) return 'minor';
  return 'trivial';
}

function determineOverallScope(analyses: FileAnalysis[]): string {
  const codeChanges = analyses.filter(a => a.category.type === 'code');
  const testChanges = analyses.filter(a => a.category.type === 'test');
  const docChanges = analyses.filter(a => a.category.type === 'documentation');
  const configChanges = analyses.filter(a => a.category.type === 'configuration');
  const toolingChanges = analyses.filter(a => a.category.type === 'tooling');

  const majorChanges = analyses.filter(a => a.impact === 'major');

  if (majorChanges.length > 0) {
    if (codeChanges.length > 3) return 'large feature implementation';
    if (codeChanges.length > 1) return 'feature implementation';
    return 'significant change';
  }

  if (codeChanges.length > 0) {
    if (testChanges.length > 0) return 'implementation with tests';
    return 'code changes';
  }

  if (testChanges.length > 0) return 'test updates';
  if (docChanges.length > 0) return 'documentation updates';
  if (configChanges.length > 0) return 'configuration changes';
  if (toolingChanges.length > 0) return 'tooling updates';

  return 'misc changes';
}

function suggestCommitType(analyses: FileAnalysis[]): string {
  const codeChanges = analyses.filter(a => a.category.type === 'code');
  const testOnlyChanges = analyses.filter(a => a.category.type === 'test');
  const docOnlyChanges = analyses.filter(a => a.category.type === 'documentation');
  const majorChanges = analyses.filter(a => a.impact === 'major');

  // Check for new files (likely new features)
  const newFiles = analyses.filter(a => a.file.status === 'added' && a.category.type === 'code');
  if (newFiles.length > 0) return 'feat';

  // Check for major changes
  if (majorChanges.length > 0) return 'feat';

  // Check for code changes (likely fixes or improvements)
  if (codeChanges.length > 0) return 'fix';

  // Check for test-only changes
  if (testOnlyChanges.length > 0 && codeChanges.length === 0) return 'test';

  // Check for doc-only changes
  if (docOnlyChanges.length > 0 && codeChanges.length === 0) return 'docs';

  // Default fallback
  return 'chore';
}