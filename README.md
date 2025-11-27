# gh-helper

A GitHub CLI extension written in TypeScript that provides AI-assisted commit message generation using your Claude subscription via Claude Code CLI.

## Features

- **Subscription-based**: Uses your existing Claude Pro/Max subscription - no API keys required
- **Cost-effective**: Fixed monthly cost instead of per-token pricing
- Automatically stages all changes
- Generates commit messages using Claude AI (Sonnet 4.5) via Claude Code CLI
- Interactive workflow: accept, edit, regenerate, or cancel
- Optional push to remote after commit
- Comprehensive test coverage

## Prerequisites

- Node.js 20.6.0 or higher (required for `--experimental-strip-types`)
- GitHub CLI (`gh`) installed and authenticated
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- Claude Pro or Max subscription

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
chmod +x gh-helper
```

4. Install as a GitHub CLI extension:
```bash
gh extension install .
```

## Setup

Before first use, authenticate with Claude Code:

```bash
# Authenticate with your Claude subscription
claude login

# Verify authentication
gh helper auth --check
```

This will open your browser to authenticate with your Claude Pro or Max subscription. No API keys needed!

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
# Check Claude Code authentication status
gh helper auth

# Check if Claude Code is available and authenticated
gh helper auth --check

# Show login instructions
gh helper auth --login

# Re-authenticate if needed
claude login
```

### Get help

```bash
gh helper help
```

## How it works

1. **Authentication**: Uses Claude Code CLI with your existing Claude subscription
2. **Diff extraction**: The tool stages all changes and extracts the diff
3. **AI generation**: Claude Sonnet 4.5 analyzes the diff via `claude -p` command
4. **Interactive review**: You can accept, edit, regenerate, or cancel the commit
5. **Git operations**: Uses safe `execFile` wrappers for all git commands

## Subscription Benefits

- **Fixed Cost**: Your Claude Pro ($20/month) or Max ($200/month) covers unlimited commit generation
- **No Per-Token Charges**: Unlike API usage, subscription includes all interactions
- **Higher Limits**: Max provides 200-800 prompts every 5 hours
- **Unified Account**: Same subscription works for web interface and CLI tools

## Security

- No API keys required - uses OAuth-based Claude Code authentication
- Authentication handled by official Claude Code CLI
- All git operations use `execFile` to prevent command injection
- Subscription-based access eliminates key management risks

## Troubleshooting

### "Not a git repository" error
Make sure you're running the command inside a git repository.

### "Claude Code authentication required" error
Run `claude login` to authenticate with your Claude subscription, then verify with `gh helper auth --check`.

### "Claude Code CLI not found" error
Install Claude Code CLI: `npm install -g @anthropic-ai/claude-code`

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
- Unit tests for all library modules (git, claude) written in TypeScript
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

MIT
