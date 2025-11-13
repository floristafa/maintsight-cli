import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { CommitData, FileStats } from '@interfaces';
import { Logger } from '../utils/simple-logger';

export class GitCommitCollector {
  private logger: Logger;
  private sourceExtensions = new Set([
    '.py',
    '.js',
    '.ts',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.hpp',
    '.cs',
    '.rb',
    '.go',
    '.rs',
    '.php',
    '.swift',
    '.kt',
    '.scala',
    '.r',
    '.m',
    '.jsx',
    '.tsx',
    '.vue',
    '.sol',
  ]);

  constructor(
    private repoPath: string,
    private branch: string = 'main',
    private windowSizeDays: number = 150,
  ) {
    this.logger = new Logger('GitCommitCollector');

    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    // Verify it's a git repository
    try {
      execSync('git rev-parse --git-dir', { cwd: repoPath, stdio: 'ignore' });
    } catch (_e: any) {
      throw new Error(`Invalid git repository: ${repoPath}`);
    }

    // Verify branch exists
    try {
      const branches = execSync('git branch -a', {
        cwd: repoPath,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB for branch listing
      });
      if (!branches.includes(branch)) {
        throw new Error(`Branch '${branch}' not found`);
      }
    } catch (e) {
      throw new Error(`Failed to verify branch: ${e}`);
    }

    this.logger.info(`Initialized git repository: ${repoPath}`, '📁');
    this.logger.info(`Using branch: ${branch}`, '🌿');
    this.logger.info(`Window size: ${windowSizeDays} days`, '📅');
  }

  private isSourceFile(filepath: string): boolean {
    const ext = path.extname(filepath).toLowerCase();
    return this.sourceExtensions.has(ext);
  }

  fetchCommitData(maxCommits: number = 10000): CommitData[] {
    this.logger.info(`Fetching commits from ${this.repoPath} (branch: ${this.branch})`, '🔄');
    this.logger.info(`Max commits: ${maxCommits}`, '📊');
    this.logger.info(`Time window: last ${this.windowSizeDays} days`, '📅');

    // Calculate since date for time window
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - this.windowSizeDays);
    const sinceTimestamp = Math.floor(sinceDate.getTime() / 1000);

    // Get commit list with file stats using time window
    const gitLogCmd = `git log ${this.branch} --numstat --format="%H|%ae|%at|%s" --since="${sinceTimestamp}" -n ${maxCommits}`;

    const logOutput = execSync(gitLogCmd, {
      cwd: this.repoPath,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });

    const fileStats: Map<string, FileStats> = new Map();
    const lines = logOutput.split('\n');

    let currentAuthor = '';
    let currentDate = new Date();
    let isBugFix = false;
    let isFeature = false;
    let isRefactor = false;

    for (const line of lines) {
      if (line.includes('|')) {
        // This is a commit header line
        const [, author, timestamp, message] = line.split('|');
        currentAuthor = author;
        currentDate = new Date(parseInt(timestamp) * 1000);

        const messageLower = message.toLowerCase();
        isBugFix = ['fix', 'bug', 'patch', 'hotfix', 'bugfix'].some((kw) =>
          messageLower.includes(kw),
        );
        isFeature = ['feat', 'feature', 'add', 'implement'].some((kw) => messageLower.includes(kw));
        isRefactor = ['refactor', 'clean', 'improve'].some((kw) => messageLower.includes(kw));
      } else if (line.match(/^\d+\s+\d+\s+/)) {
        // This is a file stat line
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const added = parseInt(parts[0]) || 0;
          const removed = parseInt(parts[1]) || 0;
          const filepath = parts[2];

          if (!this.isSourceFile(filepath)) {
            continue;
          }

          if (!fileStats.has(filepath)) {
            fileStats.set(filepath, {
              lines_added: 0,
              lines_deleted: 0,
              commits: 0,
              authors: new Set(),
              bug_commits: 0,
              feature_commits: 0,
              refactor_commits: 0,
              first_commit: currentDate,
              last_commit: currentDate,
            });
          }

          const stats = fileStats.get(filepath)!;
          stats.lines_added += added;
          stats.lines_deleted += removed;
          stats.commits += 1;
          stats.authors.add(currentAuthor);

          if (isBugFix) {
            stats.bug_commits += 1;
          }
          if (isFeature) {
            stats.feature_commits += 1;
          }
          if (isRefactor) {
            stats.refactor_commits += 1;
          }

          if (currentDate < stats.first_commit) {
            stats.first_commit = currentDate;
          }
          if (currentDate > stats.last_commit) {
            stats.last_commit = currentDate;
          }
        }
      }
    }

    if (fileStats.size === 0) {
      this.logger.warn('No source files found in commits', '⚠️');
      return [];
    }

    // Convert to CommitData array with enhanced features
    const repoName = path.basename(this.repoPath);
    const results: CommitData[] = [];

    for (const [filepath, stats] of fileStats) {
      const daysActive = Math.max(
        Math.ceil(
          (stats.last_commit.getTime() - stats.first_commit.getTime()) / (24 * 60 * 60 * 1000),
        ),
        1,
      );
      const numAuthors = stats.authors.size;
      const numCommits = stats.commits;
      const churn = stats.lines_added + stats.lines_deleted;

      // Calculate base features (matching Python exactly)
      results.push({
        module: filepath,
        filename: filepath,
        repo_name: repoName,
        commits: numCommits,
        authors: numAuthors,
        lines_added: stats.lines_added,
        lines_deleted: stats.lines_deleted,
        churn: churn,
        bug_commits: stats.bug_commits,
        refactor_commits: stats.refactor_commits,
        feature_commits: stats.feature_commits,
        lines_per_author: numAuthors > 0 ? stats.lines_added / numAuthors : 0,
        churn_per_commit: numCommits > 0 ? churn / numCommits : 0,
        bug_ratio: numCommits > 0 ? stats.bug_commits / numCommits : 0,
        days_active: daysActive,
        commits_per_day: numCommits / daysActive,
        created_at: stats.first_commit,
        last_modified: stats.last_commit,
      });
    }

    this.logger.info(
      `Fetched data for ${results.length} files from ${Array.from(fileStats.values()).reduce((sum, stats) => sum + stats.commits, 0)} commits`,
      '✅',
    );
    return results;
  }
}
