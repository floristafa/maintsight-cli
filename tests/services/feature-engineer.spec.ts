import { FeatureEngineer } from '../../src/services/feature-engineer';

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
        },
      ];

      const result = featureEngineer.transform(inputData);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        module: 'src/test.ts',
        lines_added: 100,
        lines_removed: 50,
        churn: 150,
        prs: 10,
        unique_authors: 3,
        bug_prs: 2,
        bug_ratio: 0.2,
        churn_per_pr: 15,
        lines_per_pr: 15,
        lines_per_author: 50,
        author_concentration: 1 / 3,
        add_del_ratio: 2,
        deletion_ratio: 1 / 3,
        bug_density: 2 / 150,
        collaboration_complexity: 45,
        feedback_count: 0,
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
        },
      ];

      const result = featureEngineer.transform(inputData);

      expect(result[0]).toMatchObject({
        prs: 0,
        unique_authors: 0,
        bug_ratio: 0,
        churn_per_pr: 0,
        lines_per_pr: 0,
        lines_per_author: 0,
        author_concentration: 1,
        add_del_ratio: 0,
        deletion_ratio: 0,
        bug_density: 0,
        collaboration_complexity: 0,
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
        },
        {
          module: 'src/file2.ts',
          lines_added: 200,
          lines_removed: 100,
          prs: 5,
          unique_authors: 1,
          bug_prs: 4,
          churn: 300,
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
        lines_added: 1,
        lines_removed: 2,
        churn: 3,
        prs: 4,
        unique_authors: 5,
        bug_prs: 6,
        bug_ratio: 7,
        churn_per_pr: 8,
        lines_per_pr: 9,
        lines_per_author: 10,
        author_concentration: 11,
        add_del_ratio: 12,
        deletion_ratio: 13,
        bug_density: 14,
        collaboration_complexity: 15,
        feedback_count: 16,
      };

      const vector = featureEngineer.extractFeatureVector(features);

      expect(vector).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    });
  });

  describe('getFeatureNames', () => {
    it('should return feature names in correct order', () => {
      const names = featureEngineer.getFeatureNames();

      expect(names).toEqual([
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
      ]);
    });
  });
});
