import { FeatureEngineer } from '@services';

describe('FeatureEngineer', () => {
  let featureEngineer: FeatureEngineer;

  beforeEach(() => {
    featureEngineer = new FeatureEngineer();
  });

  describe('transform', () => {
    it('should transform commit data into features correctly', () => {
      const inputData = [
        {
          module: 'src/test.ts',
          lines_added: 100,
          lines_removed: 50,
          prs: 10,
          unique_authors: 3,
          bug_prs: 2,
          churn: 150,
          created_at: new Date('2024-01-01'),
          last_modified: new Date('2024-01-31'),
        },
      ];

      const result = featureEngineer.transform(inputData);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        module: 'src/test.ts',
        commits: 10,
        authors: 3,
        lines_added: 100,
        lines_deleted: 50,
        churn: 150,
        bug_commits: 2,
        refactor_commits: 0,
        feature_commits: 8,
        lines_per_author: 50,
        churn_per_commit: 15,
        bug_ratio: 0.2,
        days_active: 31,
        commits_per_day: 10 / 31,
        degradation_days: 0,
        net_lines: 50,
        code_stability: 1 / (1 + 15),
        is_high_churn_commit: 0,
        bug_commit_rate: 2 / 31,
        commits_squared: 100,
        author_concentration: 1 / 3,
        lines_per_commit: 15,
        churn_rate: 150 / 50,
        modification_ratio: 0.5,
        churn_per_author: 50,
        deletion_rate: 1 / 3,
        commit_density: 10 / 31,
      });
    });

    it('should handle zero values to avoid division by zero', () => {
      const inputData = [
        {
          module: 'src/test.ts',
          lines_added: 0,
          lines_removed: 0,
          prs: 0,
          unique_authors: 0,
          bug_prs: 0,
          churn: 0,
          created_at: new Date('2024-01-01'),
          last_modified: new Date('2024-01-01'),
        },
      ];

      const result = featureEngineer.transform(inputData);

      expect(result[0]).toMatchObject({
        commits: 1, // Minimum 1 to avoid division by zero
        authors: 1, // Minimum 1 to avoid division by zero
        lines_added: 0,
        lines_deleted: 0,
        churn: 0,
        bug_commits: 0,
        bug_ratio: 0,
        churn_per_commit: 0,
        lines_per_commit: 0,
        lines_per_author: 0,
        author_concentration: 1,
        deletion_rate: 0,
        churn_rate: 0,
        modification_ratio: 0,
      });
    });

    it('should calculate churn if not provided', () => {
      const inputData = [
        {
          module: 'src/test.ts',
          lines_added: 100,
          lines_removed: 50,
          prs: 5,
          unique_authors: 2,
          bug_prs: 1,
          created_at: new Date('2024-01-01'),
          last_modified: new Date('2024-01-05'),
        },
      ];

      const result = featureEngineer.transform(inputData);

      expect(result[0].churn).toBe(150);
    });

    it('should handle multiple files', () => {
      const inputData = [
        {
          module: 'src/file1.ts',
          lines_added: 100,
          lines_removed: 50,
          prs: 10,
          unique_authors: 3,
          bug_prs: 2,
          churn: 150,
          created_at: new Date('2024-01-01'),
          last_modified: new Date('2024-01-10'),
        },
        {
          module: 'src/file2.ts',
          lines_added: 200,
          lines_removed: 100,
          prs: 5,
          unique_authors: 1,
          bug_prs: 4,
          churn: 300,
          created_at: new Date('2024-01-01'),
          last_modified: new Date('2024-01-05'),
        },
      ];

      const result = featureEngineer.transform(inputData);

      expect(result).toHaveLength(2);
      expect(result[0].module).toBe('src/file1.ts');
      expect(result[1].module).toBe('src/file2.ts');
      expect(result[1].bug_ratio).toBe(0.8);
      expect(result[1].author_concentration).toBe(1);
    });
  });

  describe('extractFeatureVector', () => {
    it('should extract feature vector in correct order', () => {
      const features = {
        module: 'test.ts',
        commits: 1,
        authors: 2,
        lines_added: 3,
        lines_deleted: 4,
        churn: 5,
        bug_commits: 6,
        refactor_commits: 7,
        feature_commits: 8,
        lines_per_author: 9,
        churn_per_commit: 10,
        bug_ratio: 11,
        days_active: 12,
        commits_per_day: 13,
        degradation_days: 14,
        net_lines: 15,
        code_stability: 16,
        is_high_churn_commit: 17,
        bug_commit_rate: 18,
        commits_squared: 19,
        author_concentration: 20,
        lines_per_commit: 21,
        churn_rate: 22,
        modification_ratio: 23,
        churn_per_author: 24,
        deletion_rate: 25,
        commit_density: 26,
      };

      const vector = featureEngineer.extractFeatureVector(features);

      expect(vector).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
        26,
      ]);
    });
  });

  describe('getFeatureNames', () => {
    it('should return feature names in correct order', () => {
      const names = featureEngineer.getFeatureNames();

      expect(names).toEqual([
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
      ]);
    });
  });
});
