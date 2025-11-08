# MaintSight API Reference

MaintSight provides a programmatic API for integrating maintenance risk prediction into your applications.

## Installation

```bash
npm install maintsight
```

## Basic Usage

```typescript
import { GitCommitCollector, FeatureEngineer, XGBoostPredictor } from 'maintsight';

async function analyzeMaintenance(repoPath: string) {
  // Load the model
  const predictor = new XGBoostPredictor();
  await predictor.loadModel('./node_modules/maintsight/models/model.json');

  // Collect git data
  const collector = new GitCommitCollector(repoPath);
  const commitData = collector.fetchCommitData(300);

  // Run predictions
  const predictions = predictor.predict(commitData);

  return predictions;
}
```

## API Classes

### GitCommitCollector

Collects and processes git commit history.

```typescript
class GitCommitCollector {
  constructor(repoPath: string, branch?: string = 'main');

  fetchCommitData(maxCommits?: number = 300): FileCommitData[];
}
```

### FeatureEngineer

Transforms commit data into ML features (used internally by XGBoostPredictor).

```typescript
class FeatureEngineer {
  generateFeatures(fileCommitData: FileCommitData[]): Features[];
}
```

### XGBoostPredictor

Loads the model and makes predictions.

```typescript
class XGBoostPredictor {
  async loadModel(modelPath: string): Promise<void>;

  predict(fileCommitData: FileCommitData[]): RiskPrediction[];

  predictSingle(features: Features): RiskPrediction;
}
```

## Types

```typescript
interface FileCommitData {
  file: string;
  commits: CommitInfo[];
}

interface CommitInfo {
  hash: string;
  author: string;
  date: Date;
  message: string;
  linesAdded: number;
  linesDeleted: number;
}

interface RiskPrediction {
  module: string;
  risk_score: number;
  risk_category: 'no-risk' | 'low-risk' | 'medium-risk' | 'high-risk';
}

interface Features {
  module: string;
  total_commits: number;
  unique_authors: number;
  total_lines_added: number;
  total_lines_removed: number;
  file_age_days: number;
  days_since_last_update: number;
  bug_fix_commits: number;
  avg_commit_size: number;
  commit_frequency: number;
  author_concentration: number;
  recent_activity_score: number;
  collaboration_factor: number;
  change_consistency: number;
  bug_density: number;
  refactoring_score: number;
  maintenance_burden: number;
}
```

## Example: Custom Integration

```typescript
import { GitCommitCollector, XGBoostPredictor } from 'maintsight';
import * as fs from 'fs/promises';

async function analyzeAndSaveResults(repoPath: string, outputPath: string) {
  try {
    // Initialize predictor
    const predictor = new XGBoostPredictor();
    await predictor.loadModel('./node_modules/maintsight/models/model.json');

    // Collect commit data
    const collector = new GitCommitCollector(repoPath);
    const commitData = collector.fetchCommitData(500);

    if (commitData.length === 0) {
      throw new Error('No source files found in repository');
    }

    // Get predictions
    const predictions = predictor.predict(commitData);

    // Filter high-risk files
    const highRiskFiles = predictions.filter((p) => p.risk_score > 0.65);

    // Save results
    await fs.writeFile(outputPath, JSON.stringify(highRiskFiles, null, 2), 'utf-8');

    console.log(`Found ${highRiskFiles.length} high-risk files`);

    return highRiskFiles;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}
```

## Error Handling

All API methods throw errors with descriptive messages:

```typescript
try {
  const predictor = new XGBoostPredictor();
  await predictor.loadModel('invalid-path.json');
} catch (error) {
  // Error: Model file not found: invalid-path.json
}
```

## Environment Variables

- `MAINTSIGHT_MODEL_PATH`: Override default model path
- `MAINTSIGHT_LOG_LEVEL`: Set logging verbosity (ERROR, WARN, INFO, DEBUG)
