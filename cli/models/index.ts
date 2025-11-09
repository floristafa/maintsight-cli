// This file exports the model path in a way that works with TypeScript's module resolution
import * as path from 'path';

// In development, the model is at ../../models/model.json from cli/models
// In production, it will be at the same relative path from dist/cli/models
export const MODEL_PATH = path.join(__dirname, '../../models/model.json');
