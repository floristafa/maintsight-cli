import { RiskCategory } from './risk-category.enum';

export interface RiskPrediction {
  module: string;
  risk_category: RiskCategory;
  degradation_score: number;
  raw_prediction: number;
}
