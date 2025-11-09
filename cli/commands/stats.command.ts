import { Command } from 'commander';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { GitCommitCollector } from '../../src/services/git-commit-collector';
import { XGBoostPredictor } from '../../src/services/xgboost-predictor';
import { getPackageRoot } from '../utils/find-package-json';

interface StatsOptions {
  branch?: string;
  maxCommits?: number;
  detailed?: boolean;
}

export function createStatsCommand(): Command {
  const command = new Command('stats');

  command
    .description('Show detailed statistics about repository maintenance risk')
    .argument('[path]', 'Path to git repository (default: current directory)', '.')
    .option('-b, --branch <branch>', 'Git branch to analyze', 'main')
    .option('-n, --max-commits <number>', 'Maximum number of commits to analyze', '300')
    .option('-d, --detailed', 'Show detailed statistics', false)
    .action(async (repoPath: string, options: StatsOptions) => {
      const spinner = ora('Loading model...').start();

      try {
        // Resolve paths
        const resolvedPath = path.resolve(repoPath);
        // Find model path relative to package root
        const packageRoot = getPackageRoot();
        const modelPath = path.join(packageRoot, 'models', 'model.json');

        // Initialize services
        const predictor = new XGBoostPredictor();
        await predictor.loadModel(modelPath);

        // Collect git data
        spinner.text = `Analyzing repository...`;
        const gitCollector = new GitCommitCollector(resolvedPath, options.branch);
        const commitData = gitCollector.fetchCommitData(options.maxCommits || 300);

        if (commitData.length === 0) {
          spinner.fail('No source files found in git history');
          process.exit(1);
        }

        // Run predictions
        const predictions = predictor.predict(commitData);
        spinner.succeed('Analysis complete');

        // Display statistics
        displayStatistics(predictions, commitData, resolvedPath, options.detailed || false);
      } catch (error) {
        spinner.fail(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  return command;
}

function displayStatistics(
  predictions: any[],
  commitData: any[],
  repoPath: string,
  detailed: boolean,
): void {
  const repoName = path.basename(repoPath);

  console.log(chalk.cyan(`\n📊 Repository Statistics: ${repoName}`));
  console.log(chalk.gray('─'.repeat(50)));

  // Basic statistics
  const totalFiles = predictions.length;
  const avgRiskScore = predictions.reduce((sum, p) => sum + p.risk_score, 0) / totalFiles;
  const stdDev = Math.sqrt(
    predictions.reduce((sum, p) => sum + Math.pow(p.risk_score - avgRiskScore, 2), 0) / totalFiles,
  );

  console.log(`\n${chalk.bold('Overview:')}`);
  console.log(`  Files analyzed: ${chalk.white(totalFiles)}`);
  console.log(`  Average risk score: ${chalk.white(avgRiskScore.toFixed(3))}`);
  console.log(`  Standard deviation: ${chalk.white(stdDev.toFixed(3))}`);

  // Risk distribution
  const riskDist = predictions.reduce(
    (acc, p) => {
      acc[p.risk_category] = (acc[p.risk_category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(`\n${chalk.bold('Risk Distribution:')}`);
  const categories = ['high-risk', 'medium-risk', 'low-risk', 'no-risk'];
  categories.forEach((cat) => {
    const count = riskDist[cat] || 0;
    const pct = ((count / totalFiles) * 100).toFixed(1);
    const color =
      cat === 'high-risk'
        ? chalk.red
        : cat === 'medium-risk'
          ? chalk.yellow
          : cat === 'low-risk'
            ? chalk.green
            : chalk.gray;
    console.log(`  ${color(cat.padEnd(12))}: ${count.toString().padStart(4)} files (${pct}%)`);
  });

  // Commit statistics
  const totalCommits = commitData.reduce((sum, d) => sum + d.prs, 0);
  const totalAuthors = new Set(commitData.map((d) => d.unique_authors)).size;
  const totalBugFixes = commitData.reduce((sum, d) => sum + d.bug_prs, 0);

  console.log(`\n${chalk.bold('Commit Statistics:')}`);
  console.log(`  Total commits: ${chalk.white(totalCommits)}`);
  console.log(`  Total authors: ${chalk.white(totalAuthors)}`);
  console.log(
    `  Bug fix commits: ${chalk.white(totalBugFixes)} (${((totalBugFixes / totalCommits) * 100).toFixed(1)}%)`,
  );

  // Top risky files
  const topRisky = [...predictions].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10);

  console.log(`\n${chalk.bold('Top 10 High-Risk Files:')}`);
  topRisky.forEach((file, idx) => {
    const color =
      file.risk_category === 'high-risk'
        ? chalk.red
        : file.risk_category === 'medium-risk'
          ? chalk.yellow
          : file.risk_category === 'low-risk'
            ? chalk.green
            : chalk.gray;
    console.log(
      `  ${(idx + 1).toString().padStart(2)}. ${color(file.module)} (${file.risk_score.toFixed(3)})`,
    );
  });

  if (detailed) {
    // File type statistics
    const fileTypes = commitData.reduce(
      (acc, d) => {
        const ext = path.extname(d.module).toLowerCase();
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log(`\n${chalk.bold('File Types:')}`);
    Object.entries(fileTypes)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .forEach(([ext, count]) => {
        console.log(`  ${ext.padEnd(8)}: ${count} files`);
      });

    // Risk by file type
    console.log(`\n${chalk.bold('Average Risk by File Type:')}`);
    const riskByType = predictions.reduce(
      (acc, p) => {
        const ext = path.extname(p.module).toLowerCase();
        if (!acc[ext]) acc[ext] = { sum: 0, count: 0 };
        acc[ext].sum += p.risk_score;
        acc[ext].count += 1;
        return acc;
      },
      {} as Record<string, { sum: number; count: number }>,
    );

    Object.entries(riskByType)
      .map(([ext, data]) => ({
        ext,
        avg: (data as any).sum / (data as any).count,
        count: (data as any).count,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10)
      .forEach(({ ext, avg, count }) => {
        const color =
          avg >= 0.65
            ? chalk.red
            : avg >= 0.47
              ? chalk.yellow
              : avg >= 0.22
                ? chalk.green
                : chalk.gray;
        console.log(`  ${ext.padEnd(8)}: ${color(avg.toFixed(3))} (${count} files)`);
      });
  }

  console.log(chalk.gray('\n─'.repeat(50)));
}
