# gh-helper Project Overview

## Purpose
gh-helper is a GitHub CLI extension that provides AI-assisted commit message generation using Claude Code CLI. It leverages the user's existing Claude Pro/Max subscription for cost-effective commit message generation.

## Tech Stack
- **TypeScript**: Type-safe development with Node.js native type stripping
- **Node.js 24.0.0+**: Uses experimental `--experimental-strip-types` for direct TS execution
- **pnpm**: Package manager
- **GitHub CLI**: Platform for the extension
- **Claude Code CLI**: AI integration for commit message generation
- **ESM modules**: Modern JavaScript module system
- **Node.js built-in test runner**: Native testing without external frameworks

## Key Dependencies
- chalk: Terminal styling
- ora: Spinner animations
- @types/node: TypeScript definitions
- typescript: Type checking

## Architecture Overview
The project follows a clean modular architecture:

### Entry Point
- `gh-helper.ts`: Main CLI entry point that routes commands

### Commands (`commands/`)
- `commit.ts`: Interactive commit workflow (stages → generates → review → commit/push)
- `auth.ts`: Claude Code authentication management

### Core Libraries (`lib/`)
- `git.ts`: Safe git operations using execFile to prevent injection
- `claude.ts`: Claude Code CLI integration with timeout and error handling

### Current Commit Generation Flow
1. Check if git repository and Claude authentication
2. Stage all changes with `git add .`
3. Get staged diff with `git diff --cached`
4. Generate commit message using Claude with a simple prompt
5. Interactive review (accept/edit/regenerate/cancel)
6. Create commit and optionally push

## Security Features
- Uses execFile/spawn instead of exec to prevent command injection
- OAuth-based Claude authentication (no API keys)
- Subscription-based access eliminates key management risks