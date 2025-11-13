export interface FileStats {
  lines_added: number;
  lines_removed: number;
  commits: number;
  authors: Set<string>;
  bug_commits: number;
  first_commit: Date;
  last_commit: Date;
}
