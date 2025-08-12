# Contributing to Toodee Birthday Demo

Thank you for considering contributing to the Toodee Birthday Demo! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Architecture Guidelines](#architecture-guidelines)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+ (managed via corepack)
- Git
- VS Code (recommended)

### First-Time Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/2DGameDemo.git
   cd 2DGameDemo
   ```

2. **Install dependencies:**
   ```bash
   pnpm i
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   cp packages/client/.env.example packages/client/.env
   cp packages/server/.env.example packages/server/.env
   ```

4. **Verify setup:**
   ```bash
   pnpm build
   pnpm test
   pnpm dev:all
   ```

5. **Open VS Code workspace:**
   ```bash
   code .vscode/toodee-birthday-demo.code-workspace
   ```

## Development Setup

### VS Code Configuration

- Install recommended extensions when prompted
- Format on save is enabled by default
- ESLint auto-fix runs on save
- TypeScript strict mode is enabled

### Git Hooks

Pre-commit hooks are automatically installed via Husky:
- **Pre-commit**: Runs ESLint and Prettier on staged files
- **Pre-push**: Runs TypeScript checking and tests

### Development Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Start development environment:**
   ```bash
   pnpm dev:all
   ```

3. **Make your changes following the guidelines below**

4. **Test your changes:**
   ```bash
   pnpm typecheck  # Check TypeScript
   pnpm test       # Run tests
   pnpm lint       # Check linting
   pnpm build      # Ensure builds work
   ```

5. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

## Code Style

### TypeScript Guidelines

- Use strict TypeScript settings
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public functions
- Avoid `any` type - use `unknown` or proper typing
- Use meaningful variable and function names

### Code Formatting

- **Prettier** handles all formatting automatically
- **ESLint** enforces code quality rules
- Run `pnpm format` to format all files
- Run `pnpm lint:fix` to fix linting issues

### File Organization

```
packages/
  client/src/
    scenes/         # Phaser game scenes
    entities/       # Game entities (Player, NPC, etc.)
    systems/        # Game systems (Movement, etc.)
    ui/            # User interface components
    utils/         # Utility functions
    assets/        # Asset loading and management
  server/src/
    room.ts        # Game room logic
    state.ts       # Game state management
    map.ts         # Map generation
  shared/src/
    index.ts       # Shared types and constants
```

### Naming Conventions

- **Files**: PascalCase for classes, camelCase for utilities
- **Classes**: PascalCase (e.g., `GameScene`, `PlayerEntity`)
- **Functions**: camelCase (e.g., `createPlayer`, `handleInput`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_PLAYERS`, `TICK_RATE`)
- **Interfaces**: PascalCase with descriptive names (e.g., `PlayerState`, `GameConfig`)

## Pull Request Process

### Before Submitting

1. **Ensure all checks pass:**
   ```bash
   pnpm typecheck
   pnpm test
   pnpm build
   pnpm lint
   ```

2. **Update documentation if needed:**
   - README.md for new features
   - Code comments for complex logic
   - API documentation for new endpoints

3. **Test manually:**
   - Start the game and verify your changes work
   - Test edge cases and error conditions
   - Verify no regression in existing functionality

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Manual testing completed
- [ ] No new linting errors

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes or properly documented
```

### Review Process

1. Automated checks must pass (CI/CD)
2. Code review by maintainers
3. Manual testing if needed
4. Approval and merge

## Issue Reporting

### Bug Reports

Include:
- **Environment**: OS, Node version, browser (if client issue)
- **Steps to reproduce**: Clear, numbered steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots/logs**: If applicable

### Feature Requests

Include:
- **Problem**: What problem does this solve?
- **Solution**: Proposed solution or approach
- **Alternatives**: Alternative solutions considered
- **Implementation**: Technical implementation details

### Templates

Use GitHub issue templates when available.

## Architecture Guidelines

### Client-Server Communication

- **Server Authority**: Server is always authoritative for game state
- **Input Validation**: Validate all inputs on server side
- **Rate Limiting**: Implement appropriate rate limits
- **Error Handling**: Graceful error handling on both sides

### Performance Considerations

- **Network**: Minimize network traffic, batch updates
- **Memory**: Avoid memory leaks, clean up resources
- **CPU**: Profile performance-critical code
- **Scalability**: Consider impact on server performance

### Security Guidelines

- **Input Sanitization**: Sanitize all user inputs
- **Authentication**: Use proper authentication if implemented
- **Rate Limiting**: Prevent abuse through rate limiting
- **Error Messages**: Don't expose sensitive information

### Testing Strategy

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows
- **Performance Tests**: Test under load conditions

## Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Discord**: Real-time community support
- **Documentation**: Check existing docs and code comments

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing! 🎮