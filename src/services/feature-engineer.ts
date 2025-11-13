import { CommitData } from '@interfaces';
import { Logger } from '../utils/simple-logger';

export class FeatureEngineer {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('FeatureEngineer');
  }

  /**
   * Generate the 12 engineered features used by the model (matches Python FeatureEngineer)
   * Note: Base features (lines_per_author, churn_per_commit, bug_ratio, commits_per_day)
   * are already calculated in GitCommitCollector to match training exactly.
   */
  transform(data: CommitData[]): CommitData[] {
    this.logger.info(`Generating features for ${data.length} files...`, '⚙️');

    return data.map((record) => {
      const enhanced = { ...record };

      // 1. net_lines - Code growth
      if (record.lines_added !== undefined && record.lines_deleted !== undefined) {
        enhanced.net_lines = record.lines_added - record.lines_deleted;
      }

      // 2. code_stability - Churn relative to additions
      if (record.lines_added !== undefined && record.churn !== undefined) {
        enhanced.code_stability = record.churn / (record.lines_added + 1);
      }

      // 3. is_high_churn_commit - Binary flag for large changes
      if (record.churn_per_commit !== undefined) {
        enhanced.is_high_churn_commit = record.churn_per_commit > 100 ? 1 : 0;
      }

      // 4. bug_commit_rate - Proportion of bug commits
      if (record.bug_commits !== undefined && record.commits !== undefined) {
        enhanced.bug_commit_rate = record.bug_commits / (record.commits + 1);
      }

      // 5. commits_squared - Non-linear commit activity
      if (record.commits !== undefined) {
        enhanced.commits_squared = record.commits * record.commits;
      }

      // 6. author_concentration - Bus factor
      if (record.authors !== undefined) {
        enhanced.author_concentration = 1.0 / (record.authors + 1);
      }

      // 7. lines_per_commit - Average code change size
      if (record.lines_added !== undefined && record.commits !== undefined) {
        enhanced.lines_per_commit = record.lines_added / (record.commits + 1);
      }

      // 8. churn_rate - Churn velocity
      if (record.churn !== undefined && record.days_active !== undefined) {
        enhanced.churn_rate = record.churn / (record.days_active + 1);
      }

      // 9. modification_ratio - Deletion relative to addition
      if (record.lines_added !== undefined && record.lines_deleted !== undefined) {
        enhanced.modification_ratio = record.lines_deleted / (record.lines_added + 1);
      }

      // 10. churn_per_author - Code change per developer
      if (record.churn !== undefined && record.authors !== undefined) {
        enhanced.churn_per_author = record.churn / (record.authors + 1);
      }

      // 11. deletion_rate - Code removal rate
      if (record.lines_deleted !== undefined && record.lines_added !== undefined) {
        enhanced.deletion_rate =
          record.lines_deleted / (record.lines_added + record.lines_deleted + 1);
      }

      // 12. commit_density - Commit frequency (same as commits_per_day)
      if (record.commits !== undefined && record.days_active !== undefined) {
        enhanced.commit_density = record.commits / (record.days_active + 1);
      }

      // 13. degradation_days - Same as days_active (temporal window for degradation)
      if (record.days_active !== undefined) {
        enhanced.degradation_days = record.days_active;
      }

      return enhanced;
    });
  }

  /**
   * Extract feature vector for model prediction
   * Order must match the model's expected feature order
   */
  extractFeatureVector(features: CommitData): number[] {
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
      features.degradation_days || 0,
      features.net_lines || 0,
      features.code_stability || 0,
      features.is_high_churn_commit || 0,
      features.bug_commit_rate || 0,
      features.commits_squared || 0,
      features.author_concentration || 0,
      features.lines_per_commit || 0,
      features.churn_rate || 0,
      features.modification_ratio || 0,
      features.churn_per_author || 0,
      features.deletion_rate || 0,
      features.commit_density || 0,
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
