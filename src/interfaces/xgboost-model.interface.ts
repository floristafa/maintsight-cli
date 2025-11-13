import { XGBoostTree } from './xgboost-tree.interface';

export interface XGBoostModel {
  model_type: string;
  model_data: {
    learner: {
      feature_names?: string[];
      learner_model_param?: {
        base_score?: string;
      };
      gradient_booster: {
        model: {
          trees: XGBoostTree[];
        };
      };
    };
  };
  feature_names?: string[];
  feature_count: number;
  risk_thresholds: {
    no_risk: number;
    low_risk: number;
    medium_risk: number;
    high_risk: number;
  };
}
