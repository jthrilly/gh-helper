# Suggested Development Commands

## Installation & Setup
```bash
pnpm install                    # Install dependencies
chmod +x gh-helper             # Make executable
gh extension install .         # Install as GitHub CLI extension
claude login                   # Authenticate with Claude
```

## Development
```bash
pnpm dev                       # Run with type stripping
pnpm typecheck                 # Type check without compilation
```

## Testing
```bash
pnpm test                      # Run unit tests
pnpm test:coverage             # Run tests with coverage
```

## Usage
```bash
gh helper commit               # Generate and create commit
gh helper auth --check         # Check authentication
gh helper help                 # Show help
```

## System Commands (Darwin)
- `ls`, `cd`, `grep`, `find` - Standard Unix commands
- `git` - Version control operations
- `gh` - GitHub CLI operations

## Task Completion Checklist
When implementing changes:
1. Run `pnpm typecheck` to ensure type safety
2. Run `pnpm test` to verify all tests pass
3. Test manually with `pnpm dev`
4. Ensure code follows existing patterns and conventions