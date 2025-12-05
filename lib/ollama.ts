#!/usr/bin/env node

const OLLAMA_API_URL = 'http://localhost:11434';

// Model configuration for different tasks
const MODEL_CONFIG = {
  // Main commit message generation - use high quality model
  commitGeneration: 'llama3:latest',
  // File diff analysis - use faster model for quick summaries
  fileAnalysis: 'llama3.2:latest', // Faster model for individual file analysis
  // Fallback if specific models aren't available
  default: 'llama3:latest'
};
function getModelForTask(task: 'commitGeneration' | 'fileAnalysis'): string {
  return MODEL_CONFIG[task] || MODEL_CONFIG.default;
}

interface OllamaResponse {
  response: string;
  done: boolean;
}

interface OllamaError {
  error: string;
}

export async function callOllama(
  prompt: string,
  systemPrompt: string = '',
  model: string = MODEL_CONFIG.default
): Promise<string> {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        system: systemPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OllamaResponse | OllamaError;

    if ('error' in data) {
      throw new Error(`Ollama error: ${data.error}`);
    }

    if (!data.response || data.response.trim().length === 0) {
      throw new Error('Empty response from Ollama');
    }

    return data.response.trim();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new Error('Cannot connect to Ollama. Please ensure Ollama is running on localhost:11434');
      }
      throw error;
    }
    throw new Error(`Ollama API call failed: ${String(error)}`);
  }
}

export async function callOllamaForFileAnalysis(
  prompt: string,
  systemPrompt: string = ''
): Promise<string> {
  const model = getModelForTask('fileAnalysis');
  return await callOllama(prompt, systemPrompt, model);
}

export async function callOllamaForCommitGeneration(
  prompt: string,
  systemPrompt: string = ''
): Promise<string> {
  const model = getModelForTask('commitGeneration');
  return await callOllama(prompt, systemPrompt, model);
}

export async function checkOllamaAvailability(): Promise<{available: boolean, error?: string}> {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`, {
      method: 'GET'
    });

    if (!response.ok) {
      return {
        available: false,
        error: `Ollama API returned ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    const models = data.models || [];
    const modelNames = models.map((m: any) => m.name);

    // Check if required models are available
    const commitModel = getModelForTask('commitGeneration');
    const analysisModel = getModelForTask('fileAnalysis');
    
    const hasCommitModel = modelNames.some((name: string) => 
      name.includes(commitModel.split(':')[0])
    );
    const hasAnalysisModel = modelNames.some((name: string) => 
      name.includes(analysisModel.split(':')[0])
    );

    if (!hasCommitModel) {
      return {
        available: false,
        error: `Commit generation model ${commitModel} not found. Available models: ${modelNames.join(', ')}`
      };
    }

    if (!hasAnalysisModel) {
      return {
        available: false,
        error: `File analysis model ${analysisModel} not found. Available models: ${modelNames.join(', ')}`
      };
    }

    return { available: true };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error connecting to Ollama'
    };
  }
}

// System prompts for different analysis tasks
export const SYSTEM_PROMPTS = {
  commitMessage: `You are a commit message generator. Generate clear, concise commit messages following conventional commit format.
Focus on WHAT changed and WHY, not implementation details.
Use present tense imperative mood (e.g., "Add", "Fix", "Update").
Keep the first line under 72 characters.
If needed, add a blank line and then more detailed explanation.`,

  codeAnalysis: `You are a code change analyzer. Analyze the provided diff and provide a concise summary focusing on:
- Business logic changes
- New features or functionality
- Bug fixes or improvements
- Architectural changes

Be specific about what functionality was added, modified, or removed.`,

  testAnalysis: `You are a test code analyzer. Analyze the provided test diff and summarize:
- What functionality is being tested
- New test coverage added
- Test improvements or fixes
- Testing approach changes

Focus on the testing intent and coverage rather than implementation details.`,

  documentationAnalysis: `You are a documentation analyzer. Analyze the provided documentation diff and summarize:
- What information was added, updated, or removed
- Documentation improvements
- Clarifications or corrections
- New sections or reorganization

Focus on the content and informational changes.`,

  configurationAnalysis: `You are a configuration file analyzer. Analyze the provided config diff and summarize:
- What settings or behaviors changed
- New configuration options added
- Environment or deployment changes
- Dependency or build configuration updates

Focus on the functional impact of configuration changes.`
};

export async function generateCommitMessage(diff: string): Promise<string> {
  if (!diff || diff.trim().length === 0) {
    throw new Error('No diff content provided');
  }

  const truncatedDiff = diff.length > 20000
    ? diff.substring(0, 20000) + '\n... (diff truncated)'
    : diff;

  const prompt = `Generate a commit message for the following git diff:

${truncatedDiff}

Return only the commit message, no other text.`;

  const model = getModelForTask('commitGeneration');
  return await callOllama(prompt, SYSTEM_PROMPTS.commitMessage, model);
}

export async function generateCommitMessageFromAnalysis(
  analysisResult: import('./analysis.ts').AnalysisResult
): Promise<string> {
  const { fileAnalyses, overallScope, suggestedCommitType } = analysisResult;

  // Group analyses by impact and category
  const majorChanges = fileAnalyses.filter(a => a.impact === 'major');
  const minorChanges = fileAnalyses.filter(a => a.impact === 'minor');
  const trivialChanges = fileAnalyses.filter(a => a.impact === 'trivial');

  // Build context for the LLM
  const context = buildAnalysisContext(fileAnalyses, overallScope, suggestedCommitType);

  const prompt = `Based on the analysis of changed files, generate a clear, concise commit message.

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
    return await callOllamaForCommitGeneration(prompt, SYSTEM_PROMPTS.commitMessage);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('connect')) {
        throw new Error('Cannot connect to Ollama. Please ensure Ollama is running on localhost:11434');
      }
      throw error;
    }
    throw new Error(`Failed to generate commit message: ${String(error)}`);
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
