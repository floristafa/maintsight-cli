import { FeatureEngineer, XGBoostPredictor } from '@services';
import { RiskCategory } from '@interfaces/risk-category.enum';
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
          feature_names: ['lines_added', 'lines_deleted'],
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
          lines_deleted: 50,
          commits: 10,
          authors: 3,
          bug_commits: 2,
          refactor_commits: 1,
          feature_commits: 7,
          churn: 150,
          lines_per_author: 50,
          churn_per_commit: 15,
          bug_ratio: 0.2,
          days_active: 30,
          commits_per_day: 0.333,
          created_at: new Date('2024-01-01'),
          last_modified: new Date('2024-01-31'),
        },
      ];

      // Mock the transform method to return features
      const mockFeatures = [
        {
          module: 'test.ts',
          filename: 'test.ts',
          repo_name: 'test-repo',
          created_at: new Date('2024-01-01'),
          last_modified: new Date('2024-01-31'),
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
      expect(predictions[0].risk_score).toBeGreaterThanOrEqual(-1);
      expect(predictions[0].risk_score).toBeLessThanOrEqual(1);
    });

    it('should categorize risks correctly', () => {
      // Mock transform to return features with module names
      const mockFeatures = [
        {
          module: 'file1.ts',
          filename: 'file1.ts',
          repo_name: 'test-repo',
          created_at: new Date(),
          last_modified: new Date(),
          commits: 1,
          authors: 1,
          lines_added: 10,
          lines_deleted: 5,
          churn: 15,
          bug_commits: 0,
          refactor_commits: 0,
          feature_commits: 1,
          lines_per_author: 10,
          churn_per_commit: 15,
          bug_ratio: 0,
          days_active: 1,
          commits_per_day: 1,
        },
        {
          module: 'file2.ts',
          filename: 'file2.ts',
          repo_name: 'test-repo',
          created_at: new Date(),
          last_modified: new Date(),
          commits: 2,
          authors: 1,
          lines_added: 20,
          lines_deleted: 10,
          churn: 30,
          bug_commits: 1,
          refactor_commits: 0,
          feature_commits: 1,
          lines_per_author: 20,
          churn_per_commit: 15,
          bug_ratio: 0.5,
          days_active: 2,
          commits_per_day: 1,
        },
        {
          module: 'file3.ts',
          filename: 'file3.ts',
          repo_name: 'test-repo',
          created_at: new Date(),
          last_modified: new Date(),
          commits: 3,
          authors: 2,
          lines_added: 30,
          lines_deleted: 15,
          churn: 45,
          bug_commits: 1,
          refactor_commits: 0,
          feature_commits: 2,
          lines_per_author: 15,
          churn_per_commit: 15,
          bug_ratio: 0.33,
          days_active: 3,
          commits_per_day: 1,
        },
        {
          module: 'file4.ts',
          filename: 'file4.ts',
          repo_name: 'test-repo',
          created_at: new Date(),
          last_modified: new Date(),
          commits: 4,
          authors: 2,
          lines_added: 40,
          lines_deleted: 20,
          churn: 60,
          bug_commits: 2,
          refactor_commits: 0,
          feature_commits: 2,
          lines_per_author: 20,
          churn_per_commit: 15,
          bug_ratio: 0.5,
          days_active: 4,
          commits_per_day: 1,
        },
      ];

      mockFeatureEngineer.prototype.transform.mockReturnValue(mockFeatures);
      mockFeatureEngineer.prototype.extractFeatureVector.mockReturnValue([1, 2, 3]);

      // Mock the predictSingle method to return specific scores
      predictor['predictSingle'] = jest
        .fn()
        .mockReturnValueOnce(0.05) // stable (will be calibrated to ~0.05)
        .mockReturnValueOnce(0.15) // degraded (will be calibrated to ~0.15)
        .mockReturnValueOnce(0.25) // severely_degraded (will be calibrated to ~0.25)
        .mockReturnValueOnce(-0.05); // improved (will be calibrated to ~-0.05)

      const commitData = [
        {
          module: 'file1.ts',
          filename: 'file1.ts',
          repo_name: 'test-repo',
          lines_added: 10,
          lines_deleted: 5,
          commits: 1,
          authors: 1,
          bug_commits: 0,
          refactor_commits: 0,
          feature_commits: 1,
          churn: 15,
          lines_per_author: 10,
          churn_per_commit: 15,
          bug_ratio: 0,
          days_active: 1,
          commits_per_day: 1,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file2.ts',
          filename: 'file2.ts',
          repo_name: 'test-repo',
          lines_added: 20,
          lines_deleted: 10,
          commits: 2,
          authors: 1,
          bug_commits: 1,
          refactor_commits: 0,
          feature_commits: 1,
          churn: 30,
          lines_per_author: 20,
          churn_per_commit: 15,
          bug_ratio: 0.5,
          days_active: 2,
          commits_per_day: 1,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file3.ts',
          filename: 'file3.ts',
          repo_name: 'test-repo',
          lines_added: 30,
          lines_deleted: 15,
          commits: 3,
          authors: 2,
          bug_commits: 1,
          refactor_commits: 0,
          feature_commits: 2,
          churn: 45,
          lines_per_author: 15,
          churn_per_commit: 15,
          bug_ratio: 0.33,
          days_active: 3,
          commits_per_day: 1,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file4.ts',
          filename: 'file4.ts',
          repo_name: 'test-repo',
          lines_added: 40,
          lines_deleted: 20,
          commits: 4,
          authors: 2,
          bug_commits: 2,
          refactor_commits: 0,
          feature_commits: 2,
          churn: 60,
          lines_per_author: 20,
          churn_per_commit: 15,
          bug_ratio: 0.5,
          days_active: 4,
          commits_per_day: 1,
          created_at: new Date(),
          last_modified: new Date(),
        },
      ];

      const predictions = predictor.predict(commitData);

      // Based on the calibration output, the scores will be:
      // Raw: [0.05, 0.15, 0.25, -0.05] -> Calibrated: range [-0.121, 0.099]
      expect(predictions[0].risk_category).toBe(RiskCategory.IMPROVED); // calibrated to negative value
      expect(predictions[1].risk_category).toBe(RiskCategory.STABLE); // calibrated to small positive value
      expect(predictions[2].risk_category).toBe(RiskCategory.STABLE); // calibrated to positive value
      expect(predictions[3].risk_category).toBe(RiskCategory.IMPROVED); // calibrated to most negative value
    });

    it('should calculate statistics correctly', () => {
      // Mock transform to return features
      const mockFeatures = [
        {
          module: 'file1.ts',
          filename: 'file1.ts',
          repo_name: 'test-repo',
          created_at: new Date(),
          last_modified: new Date(),
          commits: 1,
          authors: 1,
          lines_added: 10,
          lines_deleted: 5,
          churn: 15,
          bug_commits: 0,
          refactor_commits: 0,
          feature_commits: 1,
          lines_per_author: 10,
          churn_per_commit: 15,
          bug_ratio: 0,
          days_active: 1,
          commits_per_day: 1,
        },
        {
          module: 'file2.ts',
          filename: 'file2.ts',
          repo_name: 'test-repo',
          created_at: new Date(),
          last_modified: new Date(),
          commits: 2,
          authors: 1,
          lines_added: 20,
          lines_deleted: 10,
          churn: 30,
          bug_commits: 0,
          refactor_commits: 0,
          feature_commits: 2,
          lines_per_author: 20,
          churn_per_commit: 15,
          bug_ratio: 0,
          days_active: 2,
          commits_per_day: 1,
        },
        {
          module: 'file3.ts',
          filename: 'file3.ts',
          repo_name: 'test-repo',
          created_at: new Date(),
          last_modified: new Date(),
          commits: 3,
          authors: 2,
          lines_added: 30,
          lines_deleted: 15,
          churn: 45,
          bug_commits: 1,
          refactor_commits: 0,
          feature_commits: 2,
          lines_per_author: 15,
          churn_per_commit: 15,
          bug_ratio: 0.33,
          days_active: 3,
          commits_per_day: 1,
        },
        {
          module: 'file4.ts',
          filename: 'file4.ts',
          repo_name: 'test-repo',
          created_at: new Date(),
          last_modified: new Date(),
          commits: 4,
          authors: 2,
          lines_added: 40,
          lines_deleted: 20,
          churn: 60,
          bug_commits: 1,
          refactor_commits: 0,
          feature_commits: 3,
          lines_per_author: 20,
          churn_per_commit: 15,
          bug_ratio: 0.25,
          days_active: 4,
          commits_per_day: 1,
        },
      ];

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
          lines_deleted: 5,
          commits: 1,
          authors: 1,
          bug_commits: 0,
          refactor_commits: 0,
          feature_commits: 1,
          churn: 15,
          lines_per_author: 10,
          churn_per_commit: 15,
          bug_ratio: 0,
          days_active: 1,
          commits_per_day: 1,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file2.ts',
          filename: 'file2.ts',
          repo_name: 'test-repo',
          lines_added: 20,
          lines_deleted: 10,
          commits: 2,
          authors: 1,
          bug_commits: 0,
          refactor_commits: 0,
          feature_commits: 2,
          churn: 30,
          lines_per_author: 20,
          churn_per_commit: 15,
          bug_ratio: 0,
          days_active: 2,
          commits_per_day: 1,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file3.ts',
          filename: 'file3.ts',
          repo_name: 'test-repo',
          lines_added: 30,
          lines_deleted: 15,
          commits: 3,
          authors: 2,
          bug_commits: 1,
          refactor_commits: 0,
          feature_commits: 2,
          churn: 45,
          lines_per_author: 15,
          churn_per_commit: 15,
          bug_ratio: 0.33,
          days_active: 3,
          commits_per_day: 1,
          created_at: new Date(),
          last_modified: new Date(),
        },
        {
          module: 'file4.ts',
          filename: 'file4.ts',
          repo_name: 'test-repo',
          lines_added: 40,
          lines_deleted: 20,
          commits: 4,
          authors: 2,
          bug_commits: 1,
          refactor_commits: 0,
          feature_commits: 3,
          churn: 60,
          lines_per_author: 20,
          churn_per_commit: 15,
          bug_ratio: 0.25,
          days_active: 4,
          commits_per_day: 1,
          created_at: new Date(),
          last_modified: new Date(),
        },
      ];

      // Spy on console.log to check statistics output
      const consoleSpy = jest.spyOn(predictor['logger'], 'info');

      predictor.predict(commitData);

      // Check that statistics were logged (new format shows raw and calibrated separately)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Raw predictions - Mean: 0.500'),
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

    it('should categorize improved correctly', () => {
      expect(predictor['getRiskCategory'](-0.1)).toBe(RiskCategory.IMPROVED);
      expect(predictor['getRiskCategory'](-0.01)).toBe(RiskCategory.IMPROVED);
    });

    it('should categorize stable correctly', () => {
      expect(predictor['getRiskCategory'](0.0)).toBe(RiskCategory.STABLE);
      expect(predictor['getRiskCategory'](0.1)).toBe(RiskCategory.STABLE);
    });

    it('should categorize degraded correctly', () => {
      expect(predictor['getRiskCategory'](0.11)).toBe(RiskCategory.DEGRADED);
      expect(predictor['getRiskCategory'](0.2)).toBe(RiskCategory.DEGRADED);
    });

    it('should categorize severely degraded correctly', () => {
      expect(predictor['getRiskCategory'](0.21)).toBe(RiskCategory.SEVERELY_DEGRADED);
      expect(predictor['getRiskCategory'](0.5)).toBe(RiskCategory.SEVERELY_DEGRADED);
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
