import { Command } from 'commander';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { GitCommitCollector } from '../../src/services/git-commit-collector';
import { XGBoostPredictor } from '../../src/services/xgboost-predictor';
import { getPackageRoot } from '../utils/find-package-json';

interface PredictOptions {
  branch?: string;
  maxCommits?: number;
  output?: string;
  format?: 'json' | 'csv' | 'markdown';
  threshold?: number;
  verbose?: boolean;
}

export function createPredictCommand(): Command {
  const command = new Command('predict');

  command
    .description('Run maintenance risk predictions on a git repository')
    .argument('[path]', 'Path to git repository (default: current directory)', '.')
    .option('-b, --branch <branch>', 'Git branch to analyze', 'main')
    .option('-n, --max-commits <number>', 'Maximum number of commits to analyze', '300')
    .option('-o, --output <path>', 'Output file path (default: stdout)')
    .option('-f, --format <format>', 'Output format: json, csv, markdown', 'json')
    .option('-t, --threshold <number>', 'Only show files above risk threshold (0-1)', '0')
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (repoPath: string, options: PredictOptions) => {
      const spinner = ora('Initializing...').start();

      try {
        // Resolve paths
        const resolvedPath = path.resolve(repoPath);
        // Find model path relative to package root
        const packageRoot = getPackageRoot();
        const modelPath = path.join(packageRoot, 'models', 'model.json');

        // Initialize services
        spinner.text = 'Loading XGBoost model...';
        const predictor = new XGBoostPredictor();
        await predictor.loadModel(modelPath);

        // Collect git data
        spinner.text = `Analyzing git history (branch: ${options.branch})...`;
        const gitCollector = new GitCommitCollector(resolvedPath, options.branch);
        const commitData = gitCollector.fetchCommitData(options.maxCommits || 300);

        if (commitData.length === 0) {
          spinner.fail('No source files found in git history');
          process.exit(1);
        }

        spinner.text = `Running predictions on ${commitData.length} files...`;

        // Run predictions
        const predictions = predictor.predict(commitData);

        // Filter by threshold if specified
        let results = predictions;
        const threshold = options.threshold ?? 0;
        if (threshold > 0) {
          results = predictions.filter((p) => p.risk_score >= threshold);
        }

        spinner.succeed(`Predictions complete: ${results.length} files analyzed`);

        // Save results to .maintsight folder
        await saveResultsToMaintSight(results, resolvedPath);

        // Format and output results
        const output = formatResults(results, options.format || 'json', resolvedPath);

        if (options.output) {
          const fs = await import('fs/promises');
          await fs.writeFile(options.output, output, 'utf-8');
          console.log(chalk.green(`✓ Results saved to: ${options.output}`));
        } else {
          console.log(output);
        }

        // Show summary
        if (options.format !== 'json') {
          showSummary(results);
        }
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        if (options.verbose && error instanceof Error) {
          console.error(chalk.red(error.stack));
        }
        process.exit(1);
      }
    });

  return command;
}

function formatResults(predictions: any[], format: string, repoPath: string): string {
  switch (format) {
    case 'csv':
      return formatAsCSV(predictions);
    case 'markdown':
      return formatAsMarkdown(predictions, repoPath);
    case 'json':
    default:
      return JSON.stringify(predictions, null, 2);
  }
}

function formatAsCSV(predictions: any[]): string {
  const headers = ['file', 'risk_score', 'risk_category'];
  const rows = predictions.map((p) => [p.module, p.risk_score.toFixed(4), p.risk_category]);

  return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join(
    '\n',
  );
}

function formatAsMarkdown(predictions: any[], repoPath: string): string {
  const repoName = path.basename(repoPath);
  const timestamp = new Date().toISOString();

  const sortedPredictions = [...predictions].sort((a, b) => b.risk_score - a.risk_score);

  const riskDist = predictions.reduce(
    (acc, p) => {
      acc[p.risk_category] = (acc[p.risk_category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return `# Maintenance Risk Analysis Report

**Repository:** ${repoName}
**Date:** ${timestamp}
**Files Analyzed:** ${predictions.length}

## Risk Distribution

| Risk Level | Count | Percentage |
|------------|-------|------------|
| High Risk | ${riskDist['high-risk'] || 0} | ${(((riskDist['high-risk'] || 0) / predictions.length) * 100).toFixed(1)}% |
| Medium Risk | ${riskDist['medium-risk'] || 0} | ${(((riskDist['medium-risk'] || 0) / predictions.length) * 100).toFixed(1)}% |
| Low Risk | ${riskDist['low-risk'] || 0} | ${(((riskDist['low-risk'] || 0) / predictions.length) * 100).toFixed(1)}% |
| No Risk | ${riskDist['no-risk'] || 0} | ${(((riskDist['no-risk'] || 0) / predictions.length) * 100).toFixed(1)}% |

## Top 20 High-Risk Files

| File | Risk Score | Category |
|------|------------|----------|
${sortedPredictions
  .slice(0, 20)
  .map((p) => `| \`${p.module}\` | ${p.risk_score.toFixed(4)} | ${p.risk_category} |`)
  .join('\n')}

## Risk Categories

- **High Risk (0.65-1.00)**: Critical maintenance needed
- **Medium Risk (0.47-0.65)**: Moderate attention required  
- **Low Risk (0.22-0.47)**: Minor maintenance needs
- **No Risk (0.00-0.22)**: Well-maintained code

---
*Generated by Maintenance Predictor using XGBoost*`;
}

function showSummary(predictions: any[]): void {
  const riskDist = predictions.reduce(
    (acc, p) => {
      acc[p.risk_category] = (acc[p.risk_category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(chalk.cyan('\nSummary:'));
  console.log(`Total files: ${predictions.length}`);
  console.log(`High risk: ${chalk.red(riskDist['high-risk'] || 0)}`);
  console.log(`Medium risk: ${chalk.yellow(riskDist['medium-risk'] || 0)}`);
  console.log(`Low risk: ${chalk.green(riskDist['low-risk'] || 0)}`);
  console.log(`No risk: ${chalk.gray(riskDist['no-risk'] || 0)}`);
}

async function saveResultsToMaintSight(predictions: any[], repoPath: string): Promise<void> {
  try {
    const fs = await import('fs/promises');

    // Get repository name
    const repoName = path.basename(repoPath);

    // Create timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // Determine .maintsight directory path
    const dataDir = process.env.MAINTSIGHT_DATA_DIR || path.join(os.homedir(), '.maintsight');
    const repoDir = path.join(dataDir, repoName);

    // Create directories if they don't exist
    await fs.mkdir(repoDir, { recursive: true });

    // Create CSV filename
    const csvFilename = `${timestamp}.csv`;
    const csvPath = path.join(repoDir, csvFilename);

    // Add timestamp to each prediction
    const predictionsWithTimestamp = predictions.map((p) => ({
      ...p,
      timestamp: new Date().toISOString(),
    }));

    // Format as CSV
    const csvContent = formatAsCSVWithTimestamp(predictionsWithTimestamp);

    // Save the file
    await fs.writeFile(csvPath, csvContent, 'utf-8');

    console.log(chalk.dim(`Results saved to: ${csvPath}`));
  } catch (error) {
    // Log error but don't fail the command
    console.error(
      chalk.yellow(
        `Warning: Could not save results to .maintsight: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}

function formatAsCSVWithTimestamp(predictions: any[]): string {
  const headers = ['module', 'risk_score', 'risk_category', 'timestamp'];
  const rows = predictions.map((p) => [
    p.module,
    p.risk_score.toFixed(6),
    p.risk_category,
    p.timestamp,
  ]);

  return [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join(
    '\n',
  );
}
