import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { CommitData, FileStats } from '@interfaces';
import { Logger } from '../utils/simple-logger';

export class GitCommitCollector {
  private logger: Logger;

  private updateOrCreateFileStats(
    filepath: string,
    fileStats: Map<string, FileStats>,
    added: number,
    removed: number,
    currentAuthor: string,
    currentDate: Date,
    isBugFix: boolean,
    isFeature: boolean,
    isRefactor: boolean,
  ): void {
    const existingStats = fileStats.get(filepath);

    if (existingStats) {
      // Update existing stats
      existingStats.lines_added += added;
      existingStats.lines_deleted += removed;
      existingStats.commits += 1;
      existingStats.authors.add(currentAuthor);

      if (isBugFix) existingStats.bug_commits += 1;
      if (isFeature) existingStats.feature_commits += 1;
      if (isRefactor) existingStats.refactor_commits += 1;

      if (currentDate < existingStats.first_commit) existingStats.first_commit = currentDate;
      if (currentDate > existingStats.last_commit) existingStats.last_commit = currentDate;
    } else {
      fileStats.set(filepath, {
        lines_added: added,
        lines_deleted: removed,
        commits: 1,
        authors: new Set([currentAuthor]),
        bug_commits: isBugFix ? 1 : 0,
        feature_commits: isFeature ? 1 : 0,
        refactor_commits: isRefactor ? 1 : 0,
        first_commit: currentDate,
        last_commit: currentDate,
      });
    }
  }
  private sourceExtensions = new Set([
    // JavaScript/TypeScript ecosystem
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.mjs',
    '.cjs',
    '.vue',
    '.svelte',

    // Python
    '.py',
    '.pyx',
    '.pyi',
    '.pyw',

    // Java ecosystem
    '.java',
    '.kt',
    '.kts',
    '.scala',
    '.groovy',
    '.gradle',

    // C/C++ family
    '.c',
    '.cpp',
    '.cxx',
    '.cc',
    '.c++',
    '.h',
    '.hpp',
    '.hxx',
    '.hh',
    '.h++',

    // C# and .NET
    '.cs',
    '.vb',
    '.fs',
    '.fsx',
    '.fsi',

    // Mobile development
    '.swift',
    '.m',
    '.mm',
    '.dart',

    // Web languages
    '.php',
    '.rb',
    '.perl',
    '.pl',
    '.pm',

    // Systems programming
    '.go',
    '.rs',
    '.zig',
    '.nim',
    '.d',

    // Functional languages
    '.hs',
    '.lhs',
    '.elm',
    '.ml',
    '.mli',
    '.clj',
    '.cljs',
    '.cljc',

    // Statistical/Data science
    '.r',
    '.R',
    '.jl',
    '.ipynb',

    // Database languages
    '.sql',
    '.mysql',
    '.pgsql',
    '.plsql',
    '.tsql',
    '.ddl',
    '.dml',

    // Database migration files
    '.migration',
    '.up.sql',
    '.down.sql',

    // NoSQL query languages
    '.cypher',
    '.gql',
    '.graphql',

    // Shell scripting
    '.sh',
    '.bash',
    '.zsh',
    '.fish',
    '.ps1',
    '.bat',
    '.cmd',

    // Configuration as code (contains logic)
    '.tf',
    '.hcl',
    '.yaml',
    '.yml',
    '.toml',

    // Blockchain/Web3
    '.sol',
    '.cairo',
    '.move',
    '.vy',

    // Other programming languages
    '.lua',
    '.crystal',
    '.ex',
    '.exs',
    '.erl',
    '.hrl',
    '.pas',
    '.pp',
    '.inc',
    '.dpr',
    '.dpk',
    '.asm',
    '.s',
    '.S',
    '.rkt',
    '.scm',
    '.lisp',
    '.cl',

    // Template languages (with logic)
    '.erb',
    '.ejs',
    '.handlebars',
    '.hbs',
    '.mustache',
    '.twig',

    // CSS preprocessing (contains logic)
    '.scss',
    '.sass',
    '.less',
    '.styl',

    // Markup with embedded code
    '.asp',
    '.aspx',
    '.jsp',
    '.cfm',
    '.cfml',

    // Protocol buffers and IDL
    '.proto',
    '.thrift',
    '.avsc',
    '.avdl',

    // Build scripts (with logic)
    '.sbt',
    '.mill',
    '.bazel',
    '.bzl',
    '.buck',

    // Package specs (with code/logic)
    '.podspec',
    '.gemspec',
    '.nuspec',
  ]);

  constructor(
    private repoPath: string,
    private branch: string = 'main',
    private windowSizeDays: number = 150,
    private onlyExistingFiles: boolean = true, // Only analyze files that currently exist
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

  private parseRenameInfo(
    filepath: string,
  ): { currentPath: string; oldPath: string | null } | null {
    if (!filepath || filepath === '/dev/null' || filepath.includes('\0')) {
      return null;
    }

    let cleanPath = filepath.trim();
    let oldPath: string | null = null;

    // Handle various git rename patterns (order matters - most specific first)

    // Pattern 1: "{old_dir => new_dir}/file.ext" (directory rename)
    if (
      cleanPath.includes('{') &&
      cleanPath.includes('}') &&
      cleanPath.includes(' => ') &&
      !cleanPath.startsWith('{')
    ) {
      const match = cleanPath.match(/\{([^}]+)\s*=>\s*([^}]+)\}(.*)$/);
      if (match) {
        const [, oldDir, newDir, restPath] = match;
        oldPath = oldDir.trim() + restPath;
        cleanPath = newDir.trim() + restPath;
      }
    }

    // Pattern 2: "{old_file => new_file}" (file rename in braces)
    else if (cleanPath.startsWith('{') && cleanPath.endsWith('}') && cleanPath.includes(' => ')) {
      const match = cleanPath.match(/^\{(.+)\s*=>\s*(.+)\}$/);
      if (match) {
        oldPath = match[1].trim();
        cleanPath = match[2].trim();
        if (cleanPath === '/dev/null') return null;
      }
    }

    // Pattern 3: "old_path => new_path" (simple rename - most general, so last)
    else if (cleanPath.includes(' => ')) {
      const parts = cleanPath.split(' => ');
      if (parts.length === 2) {
        oldPath = parts[0].trim();
        cleanPath = parts[1].trim();
        if (cleanPath === '/dev/null') return null; // File deletion
      }
    }

    // Skip obviously invalid paths that we couldn't parse
    if (cleanPath.includes('=>') || cleanPath.includes('{') || cleanPath.includes('}')) {
      return null;
    }

    return {
      currentPath: cleanPath,
      oldPath: oldPath,
    };
  }

  fetchCommitData(maxCommits: number = 10000): CommitData[] {
    this.logger.info(`Fetching commits from ${this.repoPath} (branch: ${this.branch})`, '🔄');
    this.logger.info(`Max commits: ${maxCommits}`, '📊');
    this.logger.info(`Time window: last ${this.windowSizeDays} days`, '📅');

    // Track path mappings for consolidating renamed file histories
    const pathMappings = new Map<string, string>(); // oldPath -> currentPath

    // Calculate since date for time window
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - this.windowSizeDays);
    const sinceTimestamp = Math.floor(sinceDate.getTime() / 1000);

    // Get commit list with file stats using commit limit first, then time window
    // Add --follow-renames to track files across moves
    const gitLogCmd = `git log ${this.branch} -n ${maxCommits} --numstat --find-renames --format="%H|%ae|%at|%s" --since="${sinceTimestamp}" --no-merges`;

    const logOutput = execSync(gitLogCmd, {
      cwd: this.repoPath,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });

    const fileStats: Map<string, FileStats> = new Map();
    const allRepoAuthors: Set<string> = new Set();

    // Clean up git output - remove empty lines and trim whitespace
    const lines = logOutput
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

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
        allRepoAuthors.add(author);
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
          const rawFilepath = parts[2];

          // Handle rename tracking
          const renameInfo = this.parseRenameInfo(rawFilepath);
          if (!renameInfo) {
            continue; // Invalid or deleted file
          }

          const { currentPath, oldPath } = renameInfo;

          // Track renames for path consolidation
          if (oldPath && oldPath !== currentPath) {
            pathMappings.set(oldPath, currentPath);
          }

          // Determine the canonical path (follow rename chain)
          let canonicalPath = currentPath;
          for (const [oldP, newP] of pathMappings) {
            if (currentPath === oldP) {
              canonicalPath = newP;
              break;
            }
          }

          // Skip non-source files
          if (!this.isSourceFile(canonicalPath)) {
            continue;
          }

          // Filter to only files that currently exist (if enabled)
          if (this.onlyExistingFiles) {
            const fullPath = path.join(this.repoPath, canonicalPath);
            if (!fs.existsSync(fullPath)) {
              continue; // Skip files that no longer exist
            }
          }

          // Always use the canonical path for accumulating stats
          // This consolidates history from old paths under the current path
          this.updateOrCreateFileStats(
            canonicalPath,
            fileStats,
            added,
            removed,
            currentAuthor,
            currentDate,
            isBugFix,
            isFeature,
            isRefactor,
          );
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
        author_names: Array.from(stats.authors),
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

    return results;
  }
}
