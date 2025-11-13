export interface RiskPrediction {
  module: string;
  risk_score: number;
  risk_category: 'no-risk' | 'low-risk' | 'medium-risk' | 'high-risk';
}
