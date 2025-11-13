export interface CommitData {
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
