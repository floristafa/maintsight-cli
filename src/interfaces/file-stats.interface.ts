export interface FileStats {
  lines_added: number;
  lines_deleted: number;
  commits: number;
  authors: Set<string>;
  bug_commits: number;
  first_commit: Date;
  last_commit: Date;
  feature_commits: number;
  refactor_commits: number;
}
