# Maintenance Predictor - Coding Agent Instructions

## Build/Test Commands

```bash
npm install                    # Install dependencies
npm run build                  # TypeScript build
npm run lint                   # ESLint check
npm run lint:fix               # Auto-fix lint issues
npm test                       # Run all tests
npm test -- path.spec.ts       # Run single test file
npm run cli:dev predict        # Run CLI in dev mode
```

## Code Style Guidelines

- **Indentation**: 2 spaces, semicolons required
- **Imports**: External → local, alphabetical within groups
- **Naming**: camelCase variables/functions, PascalCase classes/types
- **Comments**: Avoid unless complex logic
- **Logging**: Use simple-logger (not pino)
- **Errors**: Always catch and provide context

## Project Structure

```
cli/
  commands/         # CLI command implementations
  predict-cli.ts    # Main CLI entry point
src/
  services/         # Core services (GitCommitCollector, FeatureEngineer, XGBoostPredictor)
  utils/            # Utilities (simple-logger)
  index.ts          # Main exports
models/
  model.json        # XGBoost model in JSON format
```

## Key Implementation Details

- XGBoost model must be in JSON format (see models/README.md)
- Features must match model training order (16 features)
- Risk thresholds: 0.22 (low), 0.47 (medium), 0.65 (high)
- Use git command line for commit history analysis
