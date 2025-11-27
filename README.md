# gh-helper

A GitHub CLI extension written in TypeScript that provides AI-assisted commit message generation using Claude.

## Features

- Automatically stages all changes
- Generates commit messages using Claude AI (Haiku 3.5)
- Interactive workflow: accept, edit, regenerate, or cancel
- Secure API key storage using GitHub CLI extension config
- Optional push to remote after commit
- Comprehensive test coverage

## Prerequisites

- Node.js 20.6.0 or higher (required for `--experimental-strip-types`)
- GitHub CLI (`gh`) installed and authenticated
- Claude API key from Anthropic

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

3. Make the extension executable:
```bash
chmod +x gh-helper.ts
```

4. Install as a GitHub CLI extension:
```bash
gh extension install .
```

## Setup

Before first use, configure your Claude API key:

```bash
gh helper auth
```

Enter your Claude API key when prompted. The key will be securely stored using GitHub CLI's extension config.

## Usage

### Generate and create a commit

```bash
gh helper commit
```

This command will:
1. Check for changes in your repository
2. Stage all changes
3. Generate a commit message using Claude AI
4. Present options to accept, edit, regenerate, or cancel
5. Create the commit
6. Optionally push to remote

### Manage authentication

```bash
# Set or update API key
gh helper auth

# Check if API key is configured
gh helper auth --check

# Remove stored API key
gh helper auth --clear
```

### Get help

```bash
gh helper help
```

## How it works

1. **Authentication**: Your Claude API key is stored securely using `gh extension config`
2. **Diff extraction**: The tool stages all changes and extracts the diff
3. **AI generation**: Claude Haiku 3.5 analyzes the diff and generates a conventional commit message
4. **Interactive review**: You can accept, edit, regenerate, or cancel the commit
5. **Git operations**: Uses safe `execFile` wrappers for all git commands

## Security

- API keys are stored securely using GitHub CLI's extension configuration system
- Never committed to the repository
- All git operations use `execFile` to prevent command injection

## Troubleshooting

### "Not a git repository" error
Make sure you're running the command inside a git repository.

### "No API key found" error
Run `gh helper auth` to configure your Claude API key.

### "Invalid API key" error
Verify your API key is correct and has valid permissions. You can update it with `gh helper auth`.

### No changes to commit
Make sure you have uncommitted changes in your repository. The tool will stage them automatically.

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
- Unit tests for all library modules (git, ai, config) written in TypeScript
- Integration tests for CLI commands
- Mock-based testing to avoid external dependencies
- Full type safety in test code

## Development

This project uses:
- **TypeScript** - Type-safe JavaScript with Node.js native type stripping
- **pnpm** - Fast, disk space efficient package manager
- **Node.js built-in test runner** - Native testing without external frameworks
- **ESM modules** - Modern JavaScript module system

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

## License

MIT# Test change for Claude integration
