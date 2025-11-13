import { FeatureEngineer, XGBoostPredictor } from '@services';
import * as fs from 'fs/promises';

jest.mock('fs/promises');
jest.mock('@services/feature-engineer');

describe('XGBoostPredictor', () => {
  let predictor: XGBoostPredictor;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockFeatureEngineer = FeatureEngineer as jest.MockedClass<typeof FeatureEngineer>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock behavior for FeatureEngineer
    mockFeatureEngineer.prototype.transform = jest.fn();
    mockFeatureEngineer.prototype.extractFeatureVector = jest.fn();

    predictor = new XGBoostPredictor();
  });

  describe('loadModel', () => {
    it('should load model from JSON file successfully', async () => {
      const mockModel = {
        model_type: 'xgboost',
        model_data: {
          learner: {
            feature_names: ['f1', 'f2', 'f3'],
            gradient_booster: {
              model: { trees: [] },
            },
          },
        },
        feature_count: 3,
        risk_thresholds: {
          no_risk: 0.22,
          low_risk: 0.47,
          medium_risk: 0.65,
          high_risk: 1.0,
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockModel));

      await predictor.loadModel('/path/to/model.json');

      expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/model.json', 'utf-8');
    });

    it('should throw error if model file cannot be read', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(predictor.loadModel('/invalid/path.json')).rejects.toThrow(
        'Failed to load model: Error: File not found',
      );
    });

    it('should throw error if model JSON is invalid', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');

      await expect(predictor.loadModel('/path/to/model.json')).rejects.toThrow(
        'Failed to load model',
      );
    });
  });

  describe('predict', () => {
    const mockModel = {
      model_type: 'xgboost',
      model_data: {
        learner: {
          learner_model_param: {
            base_score: '[0.5]',
          },
          feature_names: ['lines_added', 'lines_removed'],
          gradient_booster: {
            model: {
              trees: [
                {
                  base_weights: [0.0, 0.1, -0.1],
                  categories: [],
                  categories_nodes: [],
                  categories_segments: [],
                  categories_sizes: [],
                  default_left: [0, 0, 0],
                  id: 0,
                  left_children: [1, -1, -1],
                  loss_changes: [0, 0, 0],
                  parents: [2147483647, 0, 0],
                  right_children: [2, -1, -1],
                  split_conditions: [50, 0, 0],
                  split_indices: [0, 0, 0],
                  split_type: [0, 0, 0],
                  sum_hessian: [0, 0, 0],
                  tree_param: {},
                },
              ],
            },
          },
        },
      },
      feature_count: 2,
      risk_thresholds: {
        no_risk: 0.22,
        low_risk: 0.47,
        medium_risk: 0.65,
        high_risk: 1.0,
      },
    };

    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockModel));
      await predictor.loadModel('/path/to/model.json');
    });

    it('should throw error if model not loaded', () => {
      const newPredictor = new XGBoostPredictor();
      expect(() => newPredictor.predict([])).toThrow('Model not loaded. Call loadModel() first.');
    });

    it('should predict risk scores for commit data', () => {
      const commitData = [
        {
          module: 'test.ts',
          filename: 'test.ts',
          repo_name: 'test-repo',
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

      // Mock the transform method to return features
      const mockFeatures = [
        {
          module: 'test.ts',
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
          days_active: 30,
          commits_per_day: 0.333,
          degradation_days: 0,
          net_lines: 50,
          code_stability: 0.0625,
          is_high_churn_commit: 0,
          bug_commit_rate: 0.067,
          commits_squared: 100,
          author_concentration: 0.333,
          lines_per_commit: 15,
          churn_rate: 3,
          modification_ratio: 0.5,
          churn_per_author: 50,
          deletion_rate: 0.333,
          commit_density: 0.333,
        },
      ];

      mockFeatureEngineer.prototype.transform.mockReturnValue(mockFeatures);
      mockFeatureEngineer.prototype.extractFeatureVector.mockReturnValue([100, 50]);

      const predictions = predictor.predict(commitData);

      expect(predictions).toHaveLength(1);
      expect(predictions[0]).toHaveProperty('module', 'test.ts');
      expect(predictions[0]).toHaveProperty('risk_score');
      expect(predictions[0]).toHaveProperty('risk_category');
      expect(predictions[0].risk_score).toBeGreaterThanOrEqual(0);
      expect(predictions[0].risk_score).toBeLessThanOrEqual(1);
    });

    it('should categorize risks correctly', () => {
      // Mock transform to return features with module names
      const mockFeatures = [
        { module: 'file1.ts' },
        { module: 'file2.ts' },
        { module: 'file3.ts' },
        { module: 'file4.ts' },
      ] as any;

      mockFeatureEngineer.prototype.transform.mockReturnValue(mockFeatures);
      mockFeatureEngineer.prototype.extractFeatureVector.mockReturnValue([1, 2, 3]);

      // Mock the predictSingle method to return specific scores
      predictor['predictSingle'] = jest
        .fn()
        .mockReturnValueOnce(0.1) // no-risk
        .mockReturnValueOnce(0.3) // low-risk
        .mockReturnValueOnce(0.5) // medium-risk
        .mockReturnValueOnce(0.8); // high-risk

      const commitData = [
        {
          module: 'file1.ts',
          filename: 'file1.ts',
          repo_name: 'test-repo',
          lines_added: 10,
          lines_removed: 5,
          prs: 1,
          unique_authors: 1,
          bug_prs: 0,
          churn: 15,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file2.ts',
          filename: 'file2.ts',
          repo_name: 'test-repo',
          lines_added: 20,
          lines_removed: 10,
          prs: 2,
          unique_authors: 1,
          bug_prs: 1,
          churn: 30,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file3.ts',
          filename: 'file3.ts',
          repo_name: 'test-repo',
          lines_added: 30,
          lines_removed: 15,
          prs: 3,
          unique_authors: 2,
          bug_prs: 1,
          churn: 45,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file4.ts',
          filename: 'file4.ts',
          repo_name: 'test-repo',
          lines_added: 40,
          lines_removed: 20,
          prs: 4,
          unique_authors: 2,
          bug_prs: 2,
          churn: 60,
          created_at: new Date(),
          last_modified: new Date(),
        },
      ];

      const predictions = predictor.predict(commitData);

      expect(predictions[0].risk_category).toBe('no-risk');
      expect(predictions[1].risk_category).toBe('low-risk');
      expect(predictions[2].risk_category).toBe('medium-risk');
      expect(predictions[3].risk_category).toBe('high-risk');
    });

    it('should calculate statistics correctly', () => {
      // Mock transform to return features
      const mockFeatures = [
        { module: 'file1.ts' },
        { module: 'file2.ts' },
        { module: 'file3.ts' },
        { module: 'file4.ts' },
      ] as any;

      mockFeatureEngineer.prototype.transform.mockReturnValue(mockFeatures);
      mockFeatureEngineer.prototype.extractFeatureVector.mockReturnValue([1, 2, 3]);

      predictor['predictSingle'] = jest
        .fn()
        .mockReturnValueOnce(0.2)
        .mockReturnValueOnce(0.4)
        .mockReturnValueOnce(0.6)
        .mockReturnValueOnce(0.8);

      const commitData = [
        {
          module: 'file1.ts',
          filename: 'file1.ts',
          repo_name: 'test-repo',
          lines_added: 10,
          lines_removed: 5,
          prs: 1,
          unique_authors: 1,
          bug_prs: 0,
          churn: 15,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file2.ts',
          filename: 'file2.ts',
          repo_name: 'test-repo',
          lines_added: 20,
          lines_removed: 10,
          prs: 2,
          unique_authors: 1,
          bug_prs: 0,
          churn: 30,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file3.ts',
          filename: 'file3.ts',
          repo_name: 'test-repo',
          lines_added: 30,
          lines_removed: 15,
          prs: 3,
          unique_authors: 2,
          bug_prs: 1,
          churn: 45,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file4.ts',
          filename: 'file4.ts',
          repo_name: 'test-repo',
          lines_added: 40,
          lines_removed: 20,
          prs: 4,
          unique_authors: 2,
          bug_prs: 1,
          churn: 60,
          created_at: new Date(),
          last_modified: new Date(),
        },
      ];

      // Spy on console.log to check statistics output
      const consoleSpy = jest.spyOn(predictor['logger'], 'info');

      predictor.predict(commitData);

      // Check that statistics were logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Mean risk score: 0.500'),
        '📊',
      );
    });
  });

  describe('getRiskCategory', () => {
    const mockModel = {
      model_type: 'xgboost',
      model_data: {
        learner: {
          feature_names: [],
          gradient_booster: {
            model: {
              trees: [],
            },
          },
        },
      },
      feature_count: 0,
      risk_thresholds: {
        no_risk: 0.22,
        low_risk: 0.47,
        medium_risk: 0.65,
        high_risk: 1.0,
      },
    };

    beforeEach(async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockModel));
      await predictor.loadModel('/path/to/model.json');
    });

    it('should categorize no-risk correctly', () => {
      expect(predictor['getRiskCategory'](0.1)).toBe('no-risk');
      expect(predictor['getRiskCategory'](0.22)).toBe('no-risk');
    });

    it('should categorize low-risk correctly', () => {
      expect(predictor['getRiskCategory'](0.23)).toBe('low-risk');
      expect(predictor['getRiskCategory'](0.47)).toBe('low-risk');
    });

    it('should categorize medium-risk correctly', () => {
      expect(predictor['getRiskCategory'](0.48)).toBe('medium-risk');
      expect(predictor['getRiskCategory'](0.65)).toBe('medium-risk');
    });

    it('should categorize high-risk correctly', () => {
      expect(predictor['getRiskCategory'](0.66)).toBe('high-risk');
      expect(predictor['getRiskCategory'](1.0)).toBe('high-risk');
    });
  });

  describe('tree prediction', () => {
    it('should handle new array-based tree structure', async () => {
      const modelWithArrayTree = {
        model_type: 'xgboost',
        model_data: {
          learner: {
            learner_model_param: {
              base_score: '[0.0]',
            },
            feature_names: ['lines_added'],
            gradient_booster: {
              model: {
                trees: [
                  {
                    base_weights: [0.0, 0.1, -0.1],
                    categories: [],
                    categories_nodes: [],
                    categories_segments: [],
                    categories_sizes: [],
                    default_left: [0, 0, 0],
                    id: 0,
                    left_children: [1, -1, -1],
                    loss_changes: [0, 0, 0],
                    parents: [2147483647, 0, 0],
                    right_children: [2, -1, -1],
                    split_conditions: [50, 0, 0],
                    split_indices: [0, 0, 0],
                    split_type: [0, 0, 0],
                    sum_hessian: [0, 0, 0],
                    tree_param: {},
                  },
                ],
              },
            },
          },
        },
        feature_count: 1,
        risk_thresholds: {
          no_risk: 0.22,
          low_risk: 0.47,
          medium_risk: 0.65,
          high_risk: 1.0,
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(modelWithArrayTree));
      await predictor.loadModel('/path/to/model.json');

      const score1 = predictor['predictSingle']([30]); // < 50, should go left
      const score2 = predictor['predictSingle']([70]); // >= 50, should go right

      // Score1 should be higher (0.1 leaf value)
      expect(score1).toBeGreaterThan(score2);
    });

    it('should handle empty trees gracefully', async () => {
      const modelWithEmptyTrees = {
        model_type: 'xgboost',
        model_data: {
          learner: {
            gradient_booster: {
              model: { trees: [] },
            },
          },
        },
        feature_names: [],
        feature_count: 0,
        risk_thresholds: {
          no_risk: 0.22,
          low_risk: 0.47,
          medium_risk: 0.65,
          high_risk: 1.0,
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(modelWithEmptyTrees));
      await predictor.loadModel('/path/to/model.json');

      const score = predictor['predictSingle']([]);

      // Should return base score transformed by sigmoid
      expect(score).toBeCloseTo(0.5, 2);
    });
  });
});
