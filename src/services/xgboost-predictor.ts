import * as fs from 'fs/promises';
import { FeatureEngineer } from './feature-engineer';
import { CommitData, RiskPrediction, XGBoostModel, XGBoostTree } from '@interfaces';
import { Logger } from '../utils/simple-logger';

export class XGBoostPredictor {
  private logger: Logger;
  private model: XGBoostModel | null = null;
  private featureEngineer: FeatureEngineer;

  constructor() {
    this.logger = new Logger('XGBoostPredictor');
    this.featureEngineer = new FeatureEngineer();
  }

  /**
   * Load XGBoost model from JSON file
   */
  async loadModel(modelPath: string): Promise<void> {
    try {
      this.logger.info(`Loading model from ${modelPath}...`, '📁');
      const modelData = await fs.readFile(modelPath, 'utf-8');
      this.model = JSON.parse(modelData);

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
   * Predict risk scores for commit data
   */
  predict(commitData: Array<CommitData>): RiskPrediction[] {
    if (!this.model) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    // Transform raw data to features
    const features = this.featureEngineer.transform(commitData);

    this.logger.info(`Running inference on ${features.length} files...`, '🤖');

    const predictions: RiskPrediction[] = features.map((feature) => {
      const featureVector = this.featureEngineer.extractFeatureVector(feature);
      const riskScore = this.predictSingle(featureVector);
      const riskCategory = this.getRiskCategory(riskScore);

      return {
        module: feature.module,
        risk_score: riskScore,
        risk_category: riskCategory,
      };
    });

    // Log statistics
    const scores = predictions.map((p) => p.risk_score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = Math.sqrt(
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length,
    );
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    this.logger.info(`✅ Predictions complete`, '✅');
    this.logger.info(`   Mean risk score: ${mean.toFixed(3)}`, '📊');
    this.logger.info(`   Std dev: ${stdDev.toFixed(3)}`, '📊');
    this.logger.info(`   Min: ${min.toFixed(3)}, Max: ${max.toFixed(3)}`, '📊');

    return predictions;
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
   * Categorize risk score into risk levels
   */
  private getRiskCategory(score: number): 'no-risk' | 'low-risk' | 'medium-risk' | 'high-risk' {
    if (!this.model) {
      return 'medium-risk';
    }

    const thresholds = this.model.risk_thresholds;

    if (score <= thresholds.no_risk) {
      return 'no-risk';
    } else if (score <= thresholds.low_risk) {
      return 'low-risk';
    } else if (score <= thresholds.medium_risk) {
      return 'medium-risk';
    } else {
      return 'high-risk';
    }
  }
}
