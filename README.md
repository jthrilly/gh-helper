# gh-helper

A GitHub CLI extension written in TypeScript that provides AI-assisted commit message generation using local Ollama models with intelligent file change analysis.

## Features

- **Local AI Processing**: Uses local Ollama models - no cloud dependencies or API costs
- **Intelligent File Analysis**: Analyzes file types and provides context-aware commit messages
- **Multi-Model Configuration**: Uses fast models for file analysis and quality models for commit generation
- **Progress Indicators**: Real-time progress updates showing which files are being analyzed
- **Specialized Prompts**: Different analysis prompts for code, tests, documentation, and configuration files
- **Sequential Processing**: Processes files one by one with clear progress feedback
- **Privacy-First**: Each file diff is analyzed in isolation - no cross-file context leaking
- **File Categorization**: Automatically categorizes and handles tooling files (package-lock, etc.)
- Automatically stages all changes
- Interactive workflow: accept, edit, regenerate, or cancel
- Optional push to remote after commit
- Comprehensive test coverage

## Prerequisites

- Node.js 20.6.0 or higher (required for `--experimental-strip-types`)
- GitHub CLI (`gh`) installed and authenticated
- Ollama installed and running locally
- Compatible language models:
  - `llama3:latest` (for commit message generation)
  - `llama3.2:latest` (for fast file analysis)

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/gh-helper.git
cd gh-helper
```

2. Install dependencies:
```bash
pnpm install
```

3. Verify TypeScript setup:
```bash
pnpm typecheck
```

4. Make the extension executable:
```bash
chmod +x gh-helper
```

5. Install as a GitHub CLI extension:
```bash
gh extension install .
```

## Setup

Before first use, ensure Ollama is running with the required models:

```bash
# Install and start Ollama (if not already done)
# Visit: https://ollama.com

# Pull required models
ollama pull llama3:latest      # For commit message generation
ollama pull llama3.2:latest    # For faster file analysis

# Verify setup
gh helper auth --check
```

No API keys or subscriptions needed - everything runs locally!

## Usage

### Generate and create a commit

```bash
gh helper commit
```

This command will:
1. Check for changes in your repository
2. Stage all changes
3. Analyze each file individually with progress indicators:
   ```
   ⠹ Analyzing file 3/12: lib/analysis.ts
   ```
4. Generate a context-aware commit message using file analysis results
5. Present options to accept, edit, regenerate, or cancel
6. Create the commit
7. Optionally push to remote

### Check Ollama setup

```bash
# Check if Ollama and required models are available
gh helper auth --check
```

### Get help

```bash
gh helper help
```

## How it works

### Intelligent Analysis Pipeline

1. **Git Status Analysis**: Parses `git status` to understand file change types (added/modified/deleted)
2. **File Categorization**: Automatically categorizes files:
   - **Code files** (`*.ts`, `*.js`, etc.) → Full AI analysis
   - **Test files** → Test-focused analysis
   - **Documentation** (`*.md`) → Content change analysis
   - **Configuration** (`*.json`, `*.yaml`) → Setting change analysis
   - **Tooling files** (`package-lock.yaml`, etc.) → Auto-summarized, no AI needed
3. **Sequential Processing**: Analyzes files one by one with real-time progress
4. **Individual File Diffs**: Each file's diff is analyzed in isolation for privacy
5. **Multi-Model Optimization**:
   - Fast model (`llama3.2:latest`) for individual file analysis
   - Quality model (`llama3:latest`) for final commit message synthesis
6. **Context Synthesis**: Combines individual file analyses into comprehensive commit message

### Privacy & Security

- **File Isolation**: Each AI request sees only one file's changes
- **No Cross-File Context**: Files are analyzed independently
- **Local Processing**: No data sent to external services
- **Safe Git Operations**: Uses `execFile` to prevent command injection
- **Diff Truncation**: Large diffs limited to 5KB per file

## Model Configuration

The tool uses different models optimized for different tasks:

- **File Analysis**: `llama3.2:latest` - Faster model for quick file summaries
- **Commit Generation**: `llama3:latest` - Higher quality model for final output
- **Automatic Fallback**: Uses default model if specific models unavailable

You can modify the model configuration in `lib/ollama.ts`:

```typescript
const MODEL_CONFIG = {
  commitGeneration: 'llama3:latest',    // High quality for final output
  fileAnalysis: 'llama3.2:latest',      // Faster for individual files
  default: 'llama3:latest'
};
```

## Troubleshooting

### "Not a git repository" error
Make sure you're running the command inside a git repository.

### "Model not found" error
Ensure you have the required models:
```bash
ollama pull llama3:latest
ollama pull llama3.2:latest
```

### "Cannot connect to Ollama" error
- Ensure Ollama is running: `ollama list`
- Check Ollama is accessible on `localhost:11434`

### No changes to commit
Make sure you have uncommitted changes in your repository. The tool will stage them automatically.

### Slow performance
The tool processes files sequentially to avoid overwhelming Ollama. With many files, this may take time but provides better reliability and progress feedback.

## Testing

Run tests with:
```bash
pnpm test
```

Run tests with coverage:
```bash
pnpm test:coverage
```

The test suite includes:
- Unit tests for all library modules (git, ollama, analysis) written in TypeScript
- Integration tests for CLI commands
- Mock-based testing to avoid external dependencies
- Full type safety in test code

## Development

This project uses:
- **TypeScript** - Type-safe JavaScript with Node.js native type stripping
- **pnpm** - Fast, disk space efficient package manager
- **Node.js built-in test runner** - Native testing without external frameworks
- **ESM modules** - Modern JavaScript module system
- **Ollama REST API** - Direct API integration for reliability

### Running in Development

```bash
# Run with type stripping
pnpm dev

# Type check without compilation
pnpm typecheck
```

### Node.js Type Stripping

This project uses Node.js's experimental `--experimental-strip-types` flag to run TypeScript files directly without compilation. This provides:
- Faster development cycle
- No build step required
- Native Node.js execution
- Full TypeScript type safety during development

## Architecture

### Key Components

- **`lib/ollama.ts`** - Ollama API integration with multi-model support
- **`lib/analysis.ts`** - Intelligent file change analysis with progress callbacks
- **`lib/git.ts`** - Safe git operations and file categorization
- **`commands/commit.ts`** - Interactive commit workflow with progress indicators

### File Analysis Flow

```
git status → categorize files → analyze each file → synthesize commit message
     ↓              ↓                   ↓                    ↓
  Added/Modified → Code/Test/Doc → Individual diff → Context-aware message
```

## License

MIT