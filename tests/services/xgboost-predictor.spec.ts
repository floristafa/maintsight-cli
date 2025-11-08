import { XGBoostPredictor } from '../../src/services/xgboost-predictor';
import * as fs from 'fs/promises';
import { FeatureEngineer } from '../../src/services/feature-engineer';

jest.mock('fs/promises');
jest.mock('../../src/services/feature-engineer');

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
            gradient_booster: {
              model: { trees: [] },
            },
          },
        },
        feature_names: ['f1', 'f2', 'f3'],
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
          gradient_booster: {
            model: {
              trees: [
                {
                  tree: [
                    {
                      nodeid: 0,
                      split: 0,
                      split_condition: 50,
                      yes: 1,
                      no: 2,
                    },
                    {
                      nodeid: 1,
                      leaf: 0.1,
                    },
                    {
                      nodeid: 2,
                      leaf: -0.1,
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      feature_names: ['lines_added', 'lines_removed'],
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
          lines_added: 100,
          lines_removed: 50,
          prs: 10,
          unique_authors: 3,
          bug_prs: 2,
        },
      ];

      // Mock the transform method to return features
      const mockFeatures = [
        {
          module: 'test.ts',
          lines_added: 100,
          lines_removed: 50,
          prs: 10,
          unique_authors: 3,
          bug_prs: 2,
          churn: 150,
          bug_ratio: 0.2,
          churn_per_pr: 15,
          lines_per_pr: 15,
          lines_per_author: 50,
          author_concentration: 0.333,
          add_del_ratio: 2,
          deletion_ratio: 0.333,
          bug_density: 0.013,
          collaboration_complexity: 0.3,
          feedback_count: 0,
        },
      ];

      mockFeatureEngineer.prototype.transform.mockReturnValue(mockFeatures);
      mockFeatureEngineer.prototype.extractFeatureVector.mockReturnValue([100, 50, 150]);

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
        { module: 'file1.ts' },
        { module: 'file2.ts' },
        { module: 'file3.ts' },
        { module: 'file4.ts' },
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
        { module: 'file1.ts' },
        { module: 'file2.ts' },
        { module: 'file3.ts' },
        { module: 'file4.ts' },
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
      model_data: { learner: { gradient_booster: { model: { trees: [] } } } },
      feature_names: [],
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
    it('should handle array-based tree structure', async () => {
      const modelWithArrayTree = {
        model_type: 'xgboost',
        model_data: {
          learner: {
            gradient_booster: {
              model: {
                trees: [
                  {
                    tree: [
                      {
                        nodeid: 0,
                        split: 0,
                        split_condition: 50,
                        yes: 1,
                        no: 2,
                      },
                      {
                        nodeid: 1,
                        leaf: 0.1,
                      },
                      {
                        nodeid: 2,
                        leaf: -0.1,
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
        feature_names: ['lines_added'],
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
