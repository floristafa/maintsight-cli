import { RiskCategory } from './risk-category.enum';

export interface RiskPrediction {
  module: string;
  risk_score: number;
  risk_category: RiskCategory;
  degradation_score?: number;
  raw_prediction?: number;
  [key: string]: any;
}
