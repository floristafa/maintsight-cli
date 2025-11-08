import { Logger } from '../utils/simple-logger';

export interface CommitFeatures {
  module: string;
  lines_added: number;
  lines_removed: number;
  churn: number;
  prs: number;
  unique_authors: number;
  bug_prs: number;
  bug_ratio: number;
  churn_per_pr: number;
  lines_per_pr: number;
  lines_per_author: number;
  author_concentration: number;
  add_del_ratio: number;
  deletion_ratio: number;
  bug_density: number;
  collaboration_complexity: number;
  feedback_count: number;
}

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
      // Replace 0 values to avoid division by zero
      const prs = Math.max(record.prs, 1);
      const unique_authors = Math.max(record.unique_authors, 1);
      const lines_removed = Math.max(record.lines_removed, 1);
      const churn = record.churn || record.lines_added + record.lines_removed;

      const total_lines = record.lines_added + record.lines_removed;
      const total_lines_safe = Math.max(total_lines, 1);

      const features: CommitFeatures = {
        module: record.module,
        lines_added: record.lines_added,
        lines_removed: record.lines_removed,
        churn: churn,
        prs: record.prs,
        unique_authors: record.unique_authors,
        bug_prs: record.bug_prs,
        bug_ratio: record.bug_prs / prs,
        churn_per_pr: churn / prs,
        lines_per_pr: total_lines / prs,
        lines_per_author: total_lines / unique_authors,
        author_concentration: 1 / unique_authors, // Inverse of unique authors
        add_del_ratio: record.lines_added / lines_removed,
        deletion_ratio: record.lines_removed / total_lines_safe,
        bug_density: record.bug_prs / total_lines_safe,
        collaboration_complexity: unique_authors * (churn / prs),
        feedback_count: 0, // Default to 0 as we don't have feedback data
      };

      return features;
    });
  }

  /**
   * Extract feature vector for model prediction
   * Order must match the model's expected feature order
   */
  extractFeatureVector(features: CommitFeatures): number[] {
    // This order must match the feature_names from the model exactly
    return [
      features.lines_added,
      features.lines_removed,
      features.churn,
      features.prs,
      features.unique_authors,
      features.bug_prs,
      features.bug_ratio,
      features.churn_per_pr,
      features.lines_per_pr,
      features.lines_per_author,
      features.author_concentration,
      features.add_del_ratio,
      features.deletion_ratio,
      features.bug_density,
      features.collaboration_complexity,
      features.feedback_count,
    ];
  }

  /**
   * Get feature names in the order expected by the model
   */
  getFeatureNames(): string[] {
    return [
      'lines_added',
      'lines_removed',
      'churn',
      'prs',
      'unique_authors',
      'bug_prs',
      'bug_ratio',
      'churn_per_pr',
      'lines_per_pr',
      'lines_per_author',
      'author_concentration',
      'add_del_ratio',
      'deletion_ratio',
      'bug_density',
      'collaboration_complexity',
      'feedback_count',
    ];
  }
}
