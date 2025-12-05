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

  codeAnalysis: `You are a code change analyzer. Analyze the provided diff and provide a DETAILED summary focusing on:
- Business logic changes and their effects
- New features or functionality and how they work
- Bug fixes or improvements and what they resolve
- Architectural changes and their implications
- Performance impacts
- API changes or new interfaces
- Error handling improvements
- Security considerations
- **Comments added/modified** - these often reveal developer intent, reasoning, and context

**IMPORTANT: Pay special attention to any comments in the diff (lines starting with +// or +/* or similar).**
Comments often directly describe:
- Developer intent and reasoning
- Why certain approaches were chosen
- Known limitations or future improvements
- Context about complex logic or business requirements
- TODOs, FIXMEs, or warnings about edge cases

For each change, explain:
1. WHAT was changed (specific functions, classes, logic)
2. WHY it was changed (purpose, problem solved) - **USE COMMENTS TO UNDERSTAND INTENT**
3. HOW it affects the system (impact, side effects)

Be comprehensive and specific about functionality that was added, modified, or removed. Include details about implementation approaches and any notable patterns used. **Quote relevant comments that explain developer reasoning.**`,

  testAnalysis: `You are a test code analyzer. Analyze the provided test diff and provide a DETAILED summary covering:
- What specific functionality is being tested and how
- New test coverage added (which scenarios, edge cases)
- Test improvements or fixes and their benefits
- Testing approach changes and rationale
- Mock/stub changes and what they simulate
- Assertion improvements and what they validate
- Test data or fixture changes
- Integration vs unit test considerations
- **Test comments and descriptions** - these often explain test intent and scenarios

**IMPORTANT: Pay special attention to any comments in test code (lines starting with +// or +/* or similar).**
Test comments often reveal:
- Test scenarios and expected behaviors being validated
- Reasoning for specific test approaches or data
- Known edge cases or regression scenarios
- Setup/teardown requirements and why they're needed
- Complex assertion logic or timing considerations

For each test change, explain:
1. WHAT is being tested (specific behaviors, edge cases, error conditions)
2. WHY the test was added/changed (coverage gaps, bugs found, requirements) - **USE COMMENTS TO UNDERSTAND TEST INTENT**
3. HOW the test validates the functionality (approach, assertions, scenarios)

Include details about testing patterns, methodologies used, and the scope of coverage provided. **Quote relevant test comments that explain scenarios or reasoning.**`,

  documentationAnalysis: `You are a documentation analyzer. Analyze the provided documentation diff and provide a DETAILED summary covering:
- What specific information was added, updated, or removed and its purpose
- Documentation improvements and their benefits to users
- Clarifications or corrections and what they address
- New sections or reorganization and the reasoning
- Examples added/changed and what they demonstrate
- API documentation changes and their implications
- Installation or setup instruction changes
- Troubleshooting information updates
- Cross-references and link updates
- **Comments in documentation code examples** - these explain usage and context

**IMPORTANT: Pay attention to any comments in code examples or configuration snippets.**
Documentation comments often provide:
- Usage context and when to apply certain approaches
- Important warnings or caveats
- Alternative approaches and trade-offs
- Real-world examples and common patterns
- Configuration explanations and parameter purposes

For each documentation change, explain:
1. WHAT content was modified (sections, examples, instructions)
2. WHY the change was made (clarity, accuracy, completeness) - **USE INLINE COMMENTS FOR CONTEXT**
3. HOW it helps users (better understanding, easier setup, clearer guidance)

Include details about the audience impact and informational value of the changes. **Quote relevant comments that provide important context or warnings.**`,

  configurationAnalysis: `You are a configuration file analyzer. Analyze the provided config diff and provide a DETAILED summary covering:
- What specific settings or behaviors changed and their effects
- New configuration options added and their purposes
- Environment or deployment changes and their implications
- Dependency or build configuration updates and their impacts
- Security configuration changes
- Performance tuning modifications
- Feature flags or toggles added/modified
- Database or service connection changes
- Logging, monitoring, or debugging configuration updates
- **Comments in configuration files** - these often explain setting purposes and constraints

**IMPORTANT: Pay special attention to any comments in configuration files (lines starting with +# or +// or +<!-- depending on format).**
Configuration comments often explain:
- Purpose and intended use of settings
- Valid value ranges and formats
- Performance or security implications
- Environment-specific considerations
- Deprecated options and migration paths
- Dependencies between different configuration options

For each configuration change, explain:
1. WHAT setting was modified (specific keys, values, sections)
2. WHY the change was made (new requirements, optimization, fixes) - **USE COMMENTS TO UNDERSTAND REASONING**
3. HOW it affects the system (runtime behavior, performance, compatibility)

Include details about the functional impact, deployment considerations, and any breaking changes introduced. **Quote relevant comments that explain setting purposes or important considerations.**`
};

export async function generateCommitMessage(diff: string): Promise<string> {
  if (!diff || diff.trim().length === 0) {
    throw new Error('No diff content provided');
  }

  // No truncation - send full diff for comprehensive analysis
  const prompt = `Generate a commit message for the following git diff:

${diff}

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
5. ALWAYS add a blank line and bullet points for details when there are multiple changes
6. Include specific bullet points for each significant file change, not just generic summaries
7. Use the detailed analysis provided to create comprehensive bullet points
8. Each bullet should describe what was changed and why

Consider the overall scope: ${overallScope}

Format example:
feat(auth): implement user authentication with session management

- Add LoginComponent with email/password validation
- Implement JWT token generation and verification service
- Create protected route middleware for authenticated routes
- Add user session persistence with localStorage
- Update API endpoints to require authentication headers

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
      if (analysis.details) {
        context += `  Details: ${analysis.details}\n`;
      }
    });
  }

  if (minorChanges.length > 0) {
    context += `\nMinor Changes:\n`;
    minorChanges.forEach(analysis => {
      context += `- ${analysis.file.path} (${analysis.file.status}): ${analysis.summary}\n`;
      if (analysis.details) {
        context += `  Details: ${analysis.details}\n`;
      }
    });
  }

  if (trivialChanges.length > 0 && trivialChanges.length <= 5) {
    context += `\nTrivial Changes:\n`;
    trivialChanges.forEach(analysis => {
      context += `- ${analysis.file.path}: ${analysis.summary}\n`;
      if (analysis.details) {
        context += `  Details: ${analysis.details}\n`;
      }
    });
  } else if (trivialChanges.length > 5) {
    context += `\nTrivial Changes: ${trivialChanges.length} files (tooling, generated files, etc.)\n`;
  }

  return context;
}
