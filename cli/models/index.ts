import modelData from './xgboost-model.json';
import { XGBoostModel } from '@interfaces';

export const XGBOOST_MODEL: XGBoostModel = modelData as XGBoostModel;

export const MODEL_INFO = {
  featureCount: modelData.feature_count || 26,
  modelType: 'xgboost',
  version: '1.0.0',
  size: JSON.stringify(modelData).length,
} as const;
