# MaintSight Architecture

This document describes the technical architecture of MaintSight, a maintenance risk prediction tool for git repositories.

## System Overview

MaintSight uses a simple, efficient architecture focused on performance and accuracy:

```
┌─────────────────────────────┐
│      CLI Interface          │
└─────────────┬───────────────┘
              │
┌─────────────┴───────────────┐
│     Core Services           │
├─────────────────────────────┤
│ • GitCommitCollector        │
│ • FeatureEngineer           │
│ • XGBoostPredictor          │
└─────────────┬───────────────┘
              │
┌─────────────┴───────────────┐
│      XGBoost Model          │
│    (models/model.json)      │
└─────────────────────────────┘
```

## Core Components

### GitCommitCollector

Responsible for extracting commit history from git repositories:

- Executes git commands to fetch commit logs
- Filters for source code files only
- Parses commit messages for bug fix identification
- Aggregates commit data by file

**Key Methods:**

- `fetchCommitData()`: Main entry point for data collection
- `isSourceFile()`: Filters non-code files
- `isBugFix()`: Identifies bug-fixing commits

### FeatureEngineer

Transforms raw commit data into 16 machine learning features:

1. **Commit Metrics**: total commits, unique authors
2. **Code Churn**: lines added/removed
3. **Temporal Features**: file age, time since last update
4. **Quality Indicators**: bug fix commits, bug density
5. **Collaboration Metrics**: author concentration, collaboration factor
6. **Activity Patterns**: commit frequency, recent activity
7. **Maintenance Indicators**: refactoring score, maintenance burden

### XGBoostPredictor

Loads and executes the pre-trained XGBoost model:

- Loads model from JSON format
- Validates feature counts
- Performs tree-based inference
- Maps scores to risk categories

**Risk Categories:**

- No Risk: 0.00 - 0.22
- Low Risk: 0.22 - 0.47
- Medium Risk: 0.47 - 0.65
- High Risk: 0.65 - 1.00

## Data Flow

1. **Input**: Git repository path and analysis parameters
2. **Git Analysis**: Extract commit history using git log
3. **Feature Engineering**: Transform commits into 16 numerical features
4. **Prediction**: Run XGBoost model inference
5. **Output**: Risk scores and categories for each file

## Implementation Details

### Pure TypeScript XGBoost

MaintSight includes a pure TypeScript implementation of XGBoost inference:

```typescript
interface XGBoostNode {
  nodeid: number;
  depth: number;
  split?: string;
  split_condition?: number;
  yes?: number;
  no?: number;
  missing?: number;
  children?: XGBoostNode[];
  leaf?: number;
}
```

This eliminates the need for Python dependencies or native bindings.

### Logging System

Uses a custom lightweight logger that:

- Writes to stderr to keep stdout clean for results
- Supports log levels (ERROR, WARN, INFO, DEBUG)
- Includes timestamps and component names
- Uses color coding for visibility

### Data Persistence

Automatically saves prediction results to `~/.maintsight/`:

- Creates repository-specific folders
- Saves timestamped CSV files
- Enables historical trend analysis

## Performance Characteristics

- **Fast**: Analyzes hundreds of files in seconds
- **Memory Efficient**: Streams git data without loading entire history
- **Scalable**: Handles repositories with thousands of commits
- **Deterministic**: Same inputs always produce same outputs

## Technology Stack

- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 18+
- **CLI Framework**: Commander.js
- **Build Tool**: TypeScript Compiler (tsc)
- **Testing**: Jest
- **Linting**: ESLint with TypeScript plugin

## Design Principles

1. **Simplicity**: Minimal dependencies, focused functionality
2. **Performance**: Efficient git data processing
3. **Reliability**: Comprehensive error handling
4. **Extensibility**: Clean interfaces for future enhancements
5. **Usability**: Intuitive CLI with helpful output formats
