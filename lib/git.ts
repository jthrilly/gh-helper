#!/usr/bin/env node

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function getStagedDiff(): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--cached'], {
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer
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

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  oldPath?: string; // for renamed files
}

export interface FileCategory {
  type: 'code' | 'tooling' | 'documentation' | 'configuration' | 'test';
  needsAnalysis: boolean;
  summary?: string; // for files that don't need analysis
}

export async function getStatusChanges(): Promise<FileChange[]> {
  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain']);
    const lines = stdout.trim().split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      const status = line.substring(0, 2);
      const path = line.substring(3);
      
      // Handle renamed files (R<score> oldpath -> newpath)
      if (status.startsWith('R')) {
        const parts = path.split(' -> ');
        return {
          path: parts[1],
          status: 'renamed' as const,
          oldPath: parts[0]
        };
      }
      
      // Map git status codes to our simplified statuses
      const statusMap: Record<string, FileChange['status']> = {
        'A ': 'added',
        'M ': 'modified',
        'D ': 'deleted',
        'C ': 'copied',
        'MM': 'modified',
        'AM': 'added',
        'AD': 'added'
      };
      
      return {
        path,
        status: statusMap[status] || 'modified'
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get git status: ${errorMessage}`);
  }
}

export function categorizeFile(filePath: string): FileCategory {
  const fileName = filePath.split('/').pop()?.toLowerCase() || '';
  const extension = fileName.split('.').pop() || '';
  
  // Tooling/generated files that don't need detailed analysis
  const toolingPatterns = [
    /^pnpm-lock\.yaml$/,
    /^package-lock\.json$/,
    /^yarn\.lock$/,
    /^\.gitignore$/,
    /^sitemap\.xml$/,
    /^robots\.txt$/,
    /^manifest\.json$/,
    /^bundle\./,
    /^dist\//,
    /^build\//,
    /\.map$/,
    /\.min\.(js|css)$/
  ];
  
  for (const pattern of toolingPatterns) {
    if (pattern.test(fileName) || pattern.test(filePath)) {
      return {
        type: 'tooling',
        needsAnalysis: false,
        summary: getToolingSummary(fileName)
      };
    }
  }
  
  // Configuration files
  const configExtensions = ['json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config'];
  const configFiles = ['dockerfile', 'makefile', '.env', '.env.example'];
  
  if (configExtensions.includes(extension) || 
      configFiles.some(f => fileName.includes(f))) {
    return {
      type: 'configuration',
      needsAnalysis: true
    };
  }
  
  // Documentation files
  const docExtensions = ['md', 'txt', 'rst', 'adoc'];
  if (docExtensions.includes(extension)) {
    return {
      type: 'documentation',
      needsAnalysis: true
    };
  }
  
  // Test files
  if (fileName.includes('test') || fileName.includes('spec') || 
      filePath.includes('/test/') || filePath.includes('/tests/') ||
      filePath.includes('/__tests__/')) {
    return {
      type: 'test',
      needsAnalysis: true
    };
  }
  
  // Code files (default)
  return {
    type: 'code',
    needsAnalysis: true
  };
}

function getToolingSummary(fileName: string): string {
  const summaryMap: Record<string, string> = {
    'pnpm-lock.yaml': 'Update package dependencies',
    'package-lock.json': 'Update package dependencies', 
    'yarn.lock': 'Update package dependencies',
    'sitemap.xml': 'Regenerate sitemap',
    'robots.txt': 'Update robots.txt',
    'manifest.json': 'Update web manifest'
  };
  
  for (const [pattern, summary] of Object.entries(summaryMap)) {
    if (fileName.includes(pattern)) {
      return summary;
    }
  }
  
  if (fileName.includes('.min.')) {
    return 'Update minified assets';
  }
  
  if (fileName.includes('bundle')) {
    return 'Update build bundle';
  }
  
  return 'Update generated files';
}

export async function getFileDiff(filePath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['diff', '--cached', '--', filePath], {
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer per file
    });
    return stdout.trim();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get diff for ${filePath}: ${errorMessage}`);
  }
}
