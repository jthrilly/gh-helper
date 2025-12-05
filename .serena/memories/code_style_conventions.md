# Code Style and Conventions

## TypeScript Conventions
- Use ESM modules (`import`/`export`)
- Explicit function return types for public APIs
- Interface definitions for complex types
- Prefer `const` assertions and readonly types
- Use async/await over promises for better readability

## Naming Conventions
- Functions: camelCase (`runCommit`, `generateCommitMessage`)
- Constants: UPPER_SNAKE_CASE (`SYSTEM_PROMPT`, `MAX_DIFF_LENGTH`)
- Files: kebab-case for commands (`commit.ts`, `auth.ts`)
- Exports: Explicit named exports

## Error Handling
- Use try/catch blocks with specific error types
- Provide user-friendly error messages with chalk.red()
- Include helpful guidance in error messages
- Use process.exit() with appropriate codes

## CLI Patterns
- Use ora spinners for long operations
- Use chalk for colored output (red for errors, yellow for warnings, cyan for info)
- Interactive prompts with readline
- Clear success/failure feedback

## Security Practices
- Use execFile/spawn instead of exec for shell operations
- Validate all user inputs
- No API keys - use OAuth-based authentication
- Sanitize commit messages before git operations

## Testing Approach
- Node.js built-in test runner
- Mock external dependencies (git, claude CLI)
- Type-safe test code
- Comprehensive coverage for core functions