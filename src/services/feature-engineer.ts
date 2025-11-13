import { CommitFeatures } from '@interfaces';
import { Logger } from '../utils/simple-logger';

export class FeatureEngineer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('FeatureEngineer');
  }

  /**
   * Transform raw commit data into ML features
   */
  transform(data: Array<any>): CommitFeatures[] {
    this.logger.info(`Generating features for ${data.length} files...`, '⚙️');

    return data.map((record) => {
      // Basic counts
      const commits = Math.max(record.prs || 0, 1);
      const authors = Math.max(record.unique_authors || 0, 1);
      const lines_added = record.lines_added || 0;
      const lines_deleted = record.lines_removed || 0;
      const churn = lines_added + lines_deleted;
      const bug_commits = record.bug_prs || 0;

      // Calculate days active (difference between first and last commit)
      const created = new Date(record.created_at);
      const modified = new Date(record.last_modified);
      const days_active = Math.max(
        1,
        Math.floor((modified.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      );

      // Derived features
      const lines_per_author = (lines_added + lines_deleted) / authors;
      const churn_per_commit = churn / commits;
      const bug_ratio = bug_commits / commits;
      const commits_per_day = commits / days_active;
      const net_lines = lines_added - lines_deleted;

      // Code stability (lower churn per commit = more stable)
      const code_stability = commits > 0 ? 1 / (1 + churn_per_commit) : 0;

      // High churn indicator (1 if churn per commit > median, 0 otherwise)
      // For now, using a threshold
      const is_high_churn_commit = churn_per_commit > 50 ? 1 : 0;

      const bug_commit_rate = days_active > 0 ? bug_commits / days_active : 0;
      const commits_squared = commits * commits;
      const author_concentration = 1 / authors;
      const lines_per_commit = (lines_added + lines_deleted) / commits;
      const churn_rate = churn / Math.max(1, net_lines);
      const modification_ratio = lines_deleted / Math.max(1, lines_added);
      const churn_per_author = churn / authors;
      const deletion_rate = lines_deleted / Math.max(1, churn);
      const commit_density = commits / days_active;

      // We don't have data for these, so setting to 0
      const refactor_commits = 0;
      const feature_commits = commits - bug_commits; // Assume non-bug commits are features
      const degradation_days = 0; // Would need performance metrics over time

      const features: CommitFeatures = {
        module: record.module,
        commits,
        authors,
        lines_added,
        lines_deleted,
        churn,
        bug_commits,
        refactor_commits,
        feature_commits,
        lines_per_author,
        churn_per_commit,
        bug_ratio,
        days_active,
        commits_per_day,
        degradation_days,
        net_lines,
        code_stability,
        is_high_churn_commit,
        bug_commit_rate,
        commits_squared,
        author_concentration,
        lines_per_commit,
        churn_rate,
        modification_ratio,
        churn_per_author,
        deletion_rate,
        commit_density,
      };

      return features;
    });
  }

  /**
   * Extract feature vector for model prediction
   * Order must match the model's expected feature order
   */
  extractFeatureVector(features: CommitFeatures): number[] {
    // This order must match the feature_names from the model exactly:
    // ['commits', 'authors', 'lines_added', 'lines_deleted', 'churn', 'bug_commits',
    //  'refactor_commits', 'feature_commits', 'lines_per_author', 'churn_per_commit',
    //  'bug_ratio', 'days_active', 'commits_per_day', 'degradation_days', 'net_lines',
    //  'code_stability', 'is_high_churn_commit', 'bug_commit_rate', 'commits_squared',
    //  'author_concentration', 'lines_per_commit', 'churn_rate', 'modification_ratio',
    //  'churn_per_author', 'deletion_rate', 'commit_density']
    return [
      features.commits,
      features.authors,
      features.lines_added,
      features.lines_deleted,
      features.churn,
      features.bug_commits,
      features.refactor_commits,
      features.feature_commits,
      features.lines_per_author,
      features.churn_per_commit,
      features.bug_ratio,
      features.days_active,
      features.commits_per_day,
      features.degradation_days,
      features.net_lines,
      features.code_stability,
      features.is_high_churn_commit,
      features.bug_commit_rate,
      features.commits_squared,
      features.author_concentration,
      features.lines_per_commit,
      features.churn_rate,
      features.modification_ratio,
      features.churn_per_author,
      features.deletion_rate,
      features.commit_density,
    ];
  }

  /**
   * Get feature names in the order expected by the model
   */
  getFeatureNames(): string[] {
    return [
      'commits',
      'authors',
      'lines_added',
      'lines_deleted',
      'churn',
      'bug_commits',
      'refactor_commits',
      'feature_commits',
      'lines_per_author',
      'churn_per_commit',
      'bug_ratio',
      'days_active',
      'commits_per_day',
      'degradation_days',
      'net_lines',
      'code_stability',
      'is_high_churn_commit',
      'bug_commit_rate',
      'commits_squared',
      'author_concentration',
      'lines_per_commit',
      'churn_rate',
      'modification_ratio',
      'churn_per_author',
      'deletion_rate',
      'commit_density',
    ];
  }
}
