import { FeatureEngineer } from './feature-engineer';
import { CommitData, RiskPrediction, XGBoostModel, XGBoostTree } from '@interfaces';
import { Logger } from '../utils/simple-logger';
import { RiskCategory } from '../interfaces/risk-category.enum';
import { XGBOOST_MODEL } from '../../cli/models';

export class XGBoostPredictor {
  private logger: Logger;
  private model: XGBoostModel | null = null;
  private featureEngineer: FeatureEngineer;

  constructor() {
    this.logger = new Logger('XGBoostPredictor');
    this.featureEngineer = new FeatureEngineer();
  }

  /**
   * Load XGBoost model
   */
  loadModel(): void {
    try {
      this.logger.info(`Loading XGBoost model...`, '📁');
      this.model = XGBOOST_MODEL;

      // Handle feature_names being in different locations
      if (
        this.model &&
        !this.model.feature_names &&
        this.model.model_data?.learner?.feature_names
      ) {
        this.model.feature_names = this.model.model_data.learner.feature_names;
      }

      this.logger.info(`✅ Model loaded successfully`, '✅');
      this.logger.info(`Feature count: ${this.model?.feature_count}`, '📊');
    } catch (error) {
      throw new Error(`Failed to load model: ${error}`);
    }
  }

  /**
   * Predict risk scores for commit data with calibration
   */
  predict(commitData: Array<CommitData>): RiskPrediction[] {
    if (!this.model) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    // Transform raw data to features
    const features = this.featureEngineer.transform(commitData);

    this.logger.info(`Running inference on ${features.length} files...`, '🤖');

    // Get raw predictions
    const rawPredictions = features.map((feature) => {
      const featureVector = this.featureEngineer.extractFeatureVector(feature);
      return this.predictSingle(featureVector);
    });

    // Apply prediction calibration
    const calibratedScores = this.calibratePredictions(rawPredictions);

    // Create final predictions with full feature data
    const predictions: RiskPrediction[] = features.map((feature, index) => {
      const degradationScore = calibratedScores[index];
      const rawScore = rawPredictions[index];
      const riskCategory = this.getRiskCategory(degradationScore);

      return {
        ...feature,
        degradation_score: degradationScore,
        raw_prediction: rawScore,
        risk_category: riskCategory,
      };
    });

    // Log statistics
    const rawMean = rawPredictions.reduce((a, b) => a + b, 0) / rawPredictions.length;
    const calibratedMean = calibratedScores.reduce((a, b) => a + b, 0) / calibratedScores.length;
    const calibratedStdDev = Math.sqrt(
      calibratedScores.reduce((sum, score) => sum + Math.pow(score - calibratedMean, 2), 0) /
        calibratedScores.length,
    );
    const calibratedMin = Math.min(...calibratedScores);
    const calibratedMax = Math.max(...calibratedScores);

    this.logger.info(`✅ Predictions complete`, '✅');
    this.logger.info(
      `   Raw predictions - Mean: ${rawMean.toFixed(3)}, Range: [${Math.min(...rawPredictions).toFixed(3)}, ${Math.max(...rawPredictions).toFixed(3)}]`,
      '📊',
    );
    this.logger.info(
      `   Calibrated predictions - Mean: ${calibratedMean.toFixed(3)}, Range: [${calibratedMin.toFixed(3)}, ${calibratedMax.toFixed(3)}]`,
      '📊',
    );
    this.logger.info(`   Std dev: ${calibratedStdDev.toFixed(3)}`, '📊');
    this.logger.info(
      `   📊 Calibration: Shifted mean from ${rawMean.toFixed(3)} to ${calibratedMean.toFixed(3)}`,
      '📊',
    );

    return predictions;
  }

  /**
   * Calibrate predictions to match training data distribution.
   * Training data statistics (from MongoDB):
   * - Mean: -0.011
   * - Std: 0.082
   * - Range: [-0.531, 0.566]
   *
   * Strategy: Linear scaling + shift to map raw predictions to expected range
   */
  private calibratePredictions(predictions: number[]): number[] {
    // Training data statistics
    const TRAIN_MEAN = -0.011;
    const TRAIN_STD = 0.082;
    const TRAIN_MIN = -0.531;
    const TRAIN_MAX = 0.566;

    // Calculate raw prediction statistics
    const rawMean = predictions.reduce((a: number, b: number) => a + b, 0) / predictions.length;
    const rawStd = Math.sqrt(
      predictions.reduce((sum: number, pred: number) => sum + Math.pow(pred - rawMean, 2), 0) /
        predictions.length,
    );

    // Method 1: Z-score normalization then scale to training distribution
    // This preserves relative differences while matching the target distribution
    if (rawStd > 0) {
      // Standardize (z-score) and scale to training distribution
      const calibrated = predictions.map((pred) => {
        const zScore = (pred - rawMean) / rawStd;
        const scaled = zScore * TRAIN_STD + TRAIN_MEAN;
        // Clip to training data range (with small buffer for unseen cases)
        return Math.max(TRAIN_MIN - 0.1, Math.min(TRAIN_MAX + 0.1, scaled));
      });

      return calibrated;
    } else {
      // All predictions the same - just shift to training mean
      return predictions.map(() => TRAIN_MEAN);
    }
  }

  /**
   * Simple XGBoost tree prediction implementation
   * This is a basic implementation - for production use, consider using
   * a WASM-compiled XGBoost or calling a microservice
   */
  private predictSingle(features: number[]): number {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    // Base score from model or default
    let score = 0.5; // Default base score for binary classification

    // Try to get base_score from the new model format
    if (this.model.model_data?.learner?.learner_model_param?.base_score) {
      const baseScoreStr = this.model.model_data.learner.learner_model_param.base_score;
      // Handle the base_score being in array format like "[-1.201454E-2]"
      const match = baseScoreStr.match(/\[([-\d.eE]+)\]/);
      if (match) {
        score = parseFloat(match[1]);
      }
    }

    // Get trees - handle different model structures
    const trees = this.model.model_data?.learner?.gradient_booster?.model?.trees || [];

    if (trees.length === 0) {
      this.logger.warn('No trees found in model - using base score only');
      return score;
    }

    for (const tree of trees) {
      score += this.predictTree(tree, features);
    }

    // Apply sigmoid transformation (for binary classification)
    return 1 / (1 + Math.exp(-score));
  }

  /**
   * Traverse a single tree to get prediction
   */
  private predictTree(tree: XGBoostTree, features: number[]): number {
    let nodeId = 0; // Start at root node

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Check if it's a leaf node
      if (tree.left_children[nodeId] === -1) {
        return tree.base_weights[nodeId];
      }

      // Get feature value
      const featureIndex = tree.split_indices[nodeId];
      const featureValue = features[featureIndex];
      const splitCondition = tree.split_conditions[nodeId];

      // Determine next node
      if (featureValue < splitCondition) {
        nodeId = tree.left_children[nodeId];
      } else {
        nodeId = tree.right_children[nodeId];
      }
    }
  }

  /**
   * Categorize risk score into risk levels (matching Python script)
   * Training data range: -0.53 to +0.57, avg: -0.01, stdDev: 0.082
   * Bins based on actual training distribution:
   * < 0: improved, 0-0.1: stable, 0.1-0.2: degraded, > 0.2: severely degraded
   */
  private getRiskCategory(score: number): RiskCategory {
    if (score < 0) {
      return RiskCategory.IMPROVED;
    } else if (score <= 0.1) {
      return RiskCategory.STABLE;
    } else if (score <= 0.2) {
      return RiskCategory.DEGRADED;
    } else {
      return RiskCategory.SEVERELY_DEGRADED;
    }
  }
}
