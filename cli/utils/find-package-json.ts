import * as fs from 'fs';
import * as path from 'path';

/**
 * Find package.json by traversing up the directory tree
 * This handles both development and production environments correctly
 */
export function findPackageJson(startDir: string = __dirname): any {
  let currentDir = startDir;

  // Traverse up the directory tree
  while (currentDir !== path.parse(currentDir).root) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      try {
        return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      } catch {
        // Invalid package.json, continue searching
      }
    }

    currentDir = path.dirname(currentDir);
  }

  throw new Error('Could not find package.json');
}

/**
 * Get the package root directory
 */
export function getPackageRoot(startDir: string = __dirname): string {
  let currentDir = startDir;

  // First, try to escape from dist directory if we're in one
  // This handles the case where dist/package.json exists
  while (currentDir.includes('/dist/') || currentDir.endsWith('/dist')) {
    currentDir = path.dirname(currentDir);
  }

  // Now find package.json from here
  while (currentDir !== path.parse(currentDir).root) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      // Additional check: the package root should have a dist folder or models folder
      const distPath = path.join(currentDir, 'dist');
      const modelsPath = path.join(currentDir, 'models');

      if (fs.existsSync(distPath) || fs.existsSync(modelsPath)) {
        return currentDir;
      }
    }

    currentDir = path.dirname(currentDir);
  }

  throw new Error('Could not find package root');
}
