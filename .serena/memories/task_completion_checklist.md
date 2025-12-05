# Task Completion Checklist

## After Any Code Changes

### 1. Type Safety
```bash
pnpm typecheck
```
- Ensure no TypeScript errors
- Verify all types are correctly defined
- Check for any missing type annotations

### 2. Testing
```bash
pnpm test
pnpm test:coverage
```
- All existing tests must pass
- Add new tests for new functionality
- Maintain good test coverage
- Verify mocks are working correctly

### 3. Manual Testing
```bash
pnpm dev
```
- Test the main workflow: `gh helper commit`
- Test authentication: `gh helper auth --check`
- Verify error handling paths
- Test with different git repository states

### 4. Code Quality
- Follow existing code patterns
- Use consistent naming conventions
- Add appropriate error handling
- Ensure security best practices (no exec, sanitize inputs)
- Use chalk for consistent output styling

### 5. Documentation
- Update CLAUDE.md if architecture changes
- Update README.md for user-facing changes
- Add inline comments only for complex/unusual code

### 6. Git Operations
- Test with various git states (clean, dirty, staged, unstaged)
- Verify commit message generation works correctly
- Test push functionality

## Before Release
- Full test suite passes
- Manual testing of all commands
- Verify Claude authentication works
- Check GitHub CLI extension installation