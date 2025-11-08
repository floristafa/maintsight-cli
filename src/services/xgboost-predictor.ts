import * as fs from 'fs/promises';
import { Logger } from '../utils/simple-logger';
import { FeatureEngineer } from './feature-engineer';

interface XGBoostTree {
  nodeid: number;
  depth: number;
  split?: string;
  split_condition?: number;
  yes?: number;
  no?: number;
  missing?: number;
  children?: XGBoostTree[];
  leaf?: number;
}

interface XGBoostModel {
  model_type: string;
  model_data: {
    learner: {
      gradient_booster: {
        model: {
          trees: Array<{
            tree: XGBoostTree;
          }>;
        };
      };
    };
  };
  feature_names: string[];
  feature_count: number;
  risk_thresholds: {
    no_risk: number;
    low_risk: number;
    medium_risk: number;
    high_risk: number;
  };
}

export interface RiskPrediction {
  module: string;
  risk_score: number;
  risk_category: 'no-risk' | 'low-risk' | 'medium-risk' | 'high-risk';
}

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
      this.logger.info(`✅ Model loaded successfully`, '✅');
      this.logger.info(`Feature count: ${this.model?.feature_count}`, '📊');
    } catch (error) {
      throw new Error(`Failed to load model: ${error}`);
    }
  }

  /**
   * Predict risk scores for commit data
   */
  predict(commitData: Array<any>): RiskPrediction[] {
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

    // Get trees - handle different model structures
    const trees = this.model.model_data?.learner?.gradient_booster?.model?.trees || [];

    if (trees.length === 0) {
      this.logger.warn('No trees found in model - using base score only');
      return score;
    }

    for (const treeData of trees) {
      const tree = treeData.tree || treeData;
      score += this.predictTree(tree, features);
    }

    // Apply sigmoid transformation (for binary classification)
    return 1 / (1 + Math.exp(-score));
  }

  /**
   * Traverse a single tree to get prediction
   */
  private predictTree(tree: any, features: number[]): number {
    // Handle different tree structures
    if (Array.isArray(tree)) {
      // Tree is an array of nodes
      return this.predictTreeArray(tree, features, 0);
    } else if (tree.nodes) {
      // Tree has a nodes array
      return this.predictTreeArray(tree.nodes, features, 0);
    } else {
      // Tree is a single node structure
      return this.predictTreeNode(tree, features);
    }
  }

  /**
   * Traverse tree represented as array of nodes
   */
  private predictTreeArray(nodes: any[], features: number[], nodeId: number): number {
    const node = nodes[nodeId];

    if (node.leaf !== undefined) {
      return node.leaf;
    }

    const featureIndex = node.split || 0;
    const featureValue = features[featureIndex];

    if (featureValue < (node.split_condition || 0)) {
      return this.predictTreeArray(nodes, features, node.yes || 0);
    } else {
      return this.predictTreeArray(nodes, features, node.no || 0);
    }
  }

  /**
   * Traverse tree represented as nested node structure
   */
  private predictTreeNode(node: XGBoostTree, features: number[]): number {
    // If it's a leaf node, return the value
    if (node.leaf !== undefined) {
      return node.leaf;
    }

    // Get feature index from split name (e.g., "f5" -> 5)
    const featureIndex = parseInt(node.split?.replace('f', '') || '0');
    const featureValue = features[featureIndex];

    // Determine which child to follow
    if (featureValue < (node.split_condition || 0)) {
      // Go to 'yes' child (left)
      if (node.yes !== undefined && node.children) {
        const yesChild = node.children.find((c) => c.nodeid === node.yes);
        if (yesChild) {
          return this.predictTreeNode(yesChild, features);
        }
      }
    } else {
      // Go to 'no' child (right)
      if (node.no !== undefined && node.children) {
        const noChild = node.children.find((c) => c.nodeid === node.no);
        if (noChild) {
          return this.predictTreeNode(noChild, features);
        }
      }
    }

    // Fallback
    return 0;
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
