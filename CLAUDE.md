# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is `gh-helper`, a GitHub CLI extension that provides AI-assisted commit message generation using Claude Code CLI. It's built with TypeScript and uses Node.js's native type stripping feature (`--experimental-strip-types`) for development.

## Development Commands

- `pnpm install` - Install dependencies
- `pnpm dev` - Run the tool in development mode with type stripping
- `pnpm test` - Run unit tests
- `pnpm test:coverage` - Run tests with coverage
- `pnpm typecheck` - Type check without compilation
- `chmod +x gh-helper` - Make executable (required for GitHub CLI extension)
- `gh extension install .` - Install as GitHub CLI extension

## Architecture

The project follows a clean modular architecture:

### Entry Point
- `gh-helper.ts` - Main CLI entry point that routes commands (commit, auth, help)

### Commands (commands/)
- `commit.ts` - Handles the interactive commit workflow: stages changes → generates message → user review → commit/push
- `auth.ts` - Manages Claude Code authentication status and provides login instructions

### Core Libraries (lib/)
- `git.ts` - Safe git operations using `execFile` to prevent injection attacks
- `claude.ts` - Claude Code CLI integration using `spawn` with timeout and error handling

### Testing (test/)
Uses Node.js built-in test runner with comprehensive mock-based testing to avoid external dependencies.

## Key Technical Details

- **TypeScript with Native Execution**: Uses `--experimental-strip-types` for direct TypeScript execution without compilation
- **Security**: All shell operations use `execFile`/`spawn` instead of `exec` to prevent command injection
- **Authentication**: Relies on Claude Code CLI OAuth authentication (`claude login`) - no API keys
- **Error Handling**: Comprehensive error handling with user-friendly messages and exit codes
- **Interactive CLI**: Uses readline for user input and ora for spinners

## Claude Integration

The tool integrates with Claude Code CLI using:
- Model: `haiku` (configurable in `lib/claude.ts`)
- Output format: `text`
- Diff truncation: 20KB max to stay within token limits
- Timeout: 30 seconds for commit generation, 5 seconds for availability checks

## Installation Prerequisites

- Node.js 20.6.0+ (for `--experimental-strip-types`)
- GitHub CLI (`gh`) installed and authenticated
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- Claude Pro/Max subscription for authentication