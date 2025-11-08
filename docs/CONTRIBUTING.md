# Contributing to MaintSight

Thank you for your interest in contributing to MaintSight! We welcome contributions of all kinds, from bug reports and documentation improvements to new features and code optimizations.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Git**
- **TypeScript** knowledge

### Setup

1. **Fork & Clone**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/maintsight-cli.git
   cd maintsight-cli
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Build the Project**:

   ```bash
   npm run build
   ```

4. **Run Tests**:
   ```bash
   npm test
   ```

## 📋 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Changes

Follow our coding standards:

- Use 2 spaces for indentation
- Include semicolons
- Use TypeScript types explicitly
- Write descriptive commit messages

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run specific test
npm test path/to/test.spec.ts

# Run with coverage
npm run test:cov
```

### 4. Lint Your Code

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

### 5. Build and Test CLI

```bash
npm run build
npm run cli:dev predict -- --help
```

## 🏗️ Project Structure

```
src/
├── services/           # Core services
│   ├── git-commit-collector.ts
│   ├── feature-engineer.ts
│   └── xgboost-predictor.ts
├── utils/              # Utilities
│   └── simple-logger.ts
└── index.ts           # Public API exports

cli/
├── commands/          # CLI commands
│   ├── predict.command.ts
│   └── stats.command.ts
└── maintsight-cli.ts  # CLI entry point

tests/                 # Test files
models/               # XGBoost model
docs/                 # Documentation
```

## 🧪 Testing Guidelines

### Writing Tests

- Place tests in `tests/` mirroring the source structure
- Name test files with `.spec.ts` suffix
- Use descriptive test names
- Mock external dependencies

Example:

```typescript
describe('GitCommitCollector', () => {
  it('should fetch commit data for valid repository', () => {
    // Test implementation
  });
});
```

### Test Coverage

We aim for high test coverage:

- Services: >80%
- Utils: >90%
- New features must include tests

## 📝 Code Style

### TypeScript Guidelines

```typescript
// Good: Explicit types
export function calculateRisk(score: number): RiskCategory {
  // Implementation
}

// Bad: Implicit any
export function calculateRisk(score) {
  // Implementation
}
```

### Logging

Use our simple-logger utility:

```typescript
import { Logger } from '../utils/simple-logger';

const logger = new Logger('ComponentName');
logger.info('Processing files...', '📁');
logger.error('Failed to load model');
```

## 📚 Documentation

### Code Documentation

Add JSDoc comments for public APIs:

```typescript
/**
 * Analyzes git repository and predicts maintenance risk
 * @param repoPath - Path to the git repository
 * @param maxCommits - Maximum number of commits to analyze
 * @returns Array of risk predictions for each file
 */
export function analyzeRepository(repoPath: string, maxCommits: number = 300): RiskPrediction[] {
  // Implementation
}
```

### Updating Documentation

When adding features, update:

1. README.md (if affecting usage)
2. docs/API.md (if changing public API)
3. docs/USER_GUIDE.md (if adding CLI options)

## 🐛 Reporting Issues

### Bug Reports

Include:

1. MaintSight version (`maintsight --version`)
2. Node.js version (`node --version`)
3. Operating system
4. Steps to reproduce
5. Expected vs actual behavior
6. Error messages/stack traces

### Feature Requests

Describe:

1. The problem you're trying to solve
2. Proposed solution
3. Alternative solutions considered
4. Impact on existing functionality

## 🔄 Pull Request Process

1. **Update Documentation**: Include relevant docs changes
2. **Add Tests**: Cover new functionality
3. **Pass CI**: Ensure all checks pass
4. **Clear Description**: Explain what and why
5. **Link Issues**: Reference related issues

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Updated documentation

## Related Issues

Fixes #123
```

## 🏷️ Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 💬 Getting Help

- Open an issue for bugs/features
- Start a discussion for questions
- Check existing issues first

Thank you for contributing to MaintSight! 🎉
