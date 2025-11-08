import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../utils/simple-logger';

interface CommitData {
  module: string;
  filename: string;
  repo_name: string;
  lines_added: number;
  lines_removed: number;
  prs: number;
  unique_authors: number;
  bug_prs: number;
  churn: number;
  created_at: Date;
  last_modified: Date;
}

interface FileStats {
  lines_added: number;
  lines_removed: number;
  commits: number;
  authors: Set<string>;
  bug_commits: number;
  first_commit: Date;
  last_commit: Date;
}

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
  ) {
    this.logger = new Logger('GitCommitCollector');

    if (!fs.existsSync(repoPath)) {
      throw new Error(`Repository path does not exist: ${repoPath}`);
    }

    // Verify it's a git repository
    try {
      execSync('git rev-parse --git-dir', { cwd: repoPath, stdio: 'ignore' });
    } catch (e) {
      throw new Error(`Invalid git repository: ${repoPath}`);
    }

    // Verify branch exists
    try {
      const branches = execSync('git branch -a', { cwd: repoPath, encoding: 'utf-8' });
      if (!branches.includes(branch)) {
        throw new Error(`Branch '${branch}' not found`);
      }
    } catch (e) {
      throw new Error(`Failed to verify branch: ${e}`);
    }

    this.logger.info(`Initialized git repository: ${repoPath}`, '📁');
    this.logger.info(`Using branch: ${branch}`, '🌿');
  }

  private isSourceFile(filepath: string): boolean {
    const ext = path.extname(filepath).toLowerCase();
    return this.sourceExtensions.has(ext);
  }

  fetchCommitData(maxCommits: number = 300): CommitData[] {
    this.logger.info(`Fetching commits from ${this.repoPath} (branch: ${this.branch})`, '🔄');
    this.logger.info(`Max commits: ${maxCommits}`, '📊');

    // Get commit list with file stats
    const gitLogCmd = `git log ${this.branch} --numstat --format="%H|%ae|%at|%s" -n ${maxCommits}`;
    const logOutput = execSync(gitLogCmd, { cwd: this.repoPath, encoding: 'utf-8' });

    const fileStats: Map<string, FileStats> = new Map();
    const lines = logOutput.split('\n');

    let currentAuthor = '';
    let currentDate = new Date();
    let isBugFix = false;

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
              lines_removed: 0,
              commits: 0,
              authors: new Set(),
              bug_commits: 0,
              first_commit: currentDate,
              last_commit: currentDate,
            });
          }

          const stats = fileStats.get(filepath)!;
          stats.lines_added += added;
          stats.lines_removed += removed;
          stats.commits += 1;
          stats.authors.add(currentAuthor);
          if (isBugFix) {
            stats.bug_commits += 1;
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

    // Convert to CommitData array
    const repoName = path.basename(this.repoPath);
    const results: CommitData[] = [];

    for (const [filepath, stats] of fileStats) {
      results.push({
        module: filepath,
        filename: filepath,
        repo_name: repoName,
        lines_added: stats.lines_added,
        lines_removed: stats.lines_removed,
        prs: stats.commits,
        unique_authors: stats.authors.size,
        bug_prs: stats.bug_commits,
        churn: stats.lines_added + stats.lines_removed,
        created_at: stats.first_commit,
        last_modified: stats.last_commit,
      });
    }

    this.logger.info(`Fetched data for ${results.length} files`, '✅');
    return results;
  }
}
