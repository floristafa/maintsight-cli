import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import { CommitData, RiskPrediction } from '@interfaces';

interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  prediction?: any;
  path?: string;
}

interface CommitStats {
  totalCommits: number;
  totalBugFixes: number;
  avgCommitsPerFile: number;
  avgAuthorsPerFile: number;
  authorNames: string[];
}

export async function generateHTMLReport(
  predictions: RiskPrediction[],
  commitData: CommitData[],
  repoPath: string,
): Promise<string | null> {
  try {
    // Get repository name
    const repoName = path.basename(repoPath);

    // Create timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // Create .maintsight directory inside the repo
    const maintSightDir = path.join(repoPath, '.maintsight');
    await fs.mkdir(maintSightDir, { recursive: true });

    // Create HTML filename with repo name and date
    const htmlFilename = `${repoName}-${timestamp}.html`;
    const htmlPath = path.join(maintSightDir, htmlFilename);

    // Generate HTML content
    const htmlContent = formatAsHTML(predictions, commitData, repoPath);

    // Save HTML file
    await fs.writeFile(htmlPath, htmlContent, 'utf-8');

    console.log(chalk.dim(`HTML report saved to: ${htmlPath}`));

    return htmlPath;
  } catch (error) {
    console.error(
      chalk.yellow(
        `Warning: Could not save HTML report: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    return null;
  }
}

function buildFileTree(predictions: RiskPrediction[]): FileTreeNode {
  const root: FileTreeNode = { name: 'root', type: 'folder', children: [] };

  predictions.forEach((prediction) => {
    const pathParts = prediction.module.split('/');
    let currentNode = root;

    pathParts.forEach((part: string, index: number) => {
      const isFile = index === pathParts.length - 1;
      const existingChild = currentNode.children?.find(
        (child: FileTreeNode) => child.name === part,
      );

      if (existingChild) {
        currentNode = existingChild;
      } else {
        const newNode: FileTreeNode = {
          name: part,
          type: isFile ? 'file' : 'folder',
          path: pathParts.slice(0, index + 1).join('/'),
          children: isFile ? undefined : [],
          prediction: isFile ? prediction : undefined,
        };

        currentNode.children = currentNode.children || [];
        currentNode.children.push(newNode);
        currentNode = newNode;
      }
    });
  });

  return root;
}

// Helper function to calculate average score for a folder
function calculateFolderStats(node: FileTreeNode): {
  avgScore: number;
  fileCount: number;
  category: string;
} {
  let totalScore = 0;
  let fileCount = 0;

  function traverse(n: FileTreeNode) {
    if (!n.children || n.children.length === 0) {
      // This is a file
      if (n.prediction) {
        totalScore += n.prediction.degradation_score;
        fileCount++;
      }
    } else {
      // This is a folder, traverse children
      n.children.forEach((child) => traverse(child));
    }
  }

  traverse(node);

  const avgScore = fileCount > 0 ? totalScore / fileCount : 0;

  // Determine category based on average score
  let category = 'stable';
  if (avgScore > 0.2) category = 'severely-degraded';
  else if (avgScore > 0.1) category = 'degraded';
  else if (avgScore > 0.0) category = 'stable';
  else category = 'improved';

  return { avgScore, fileCount, category };
}

function generateTreeHTML(node: FileTreeNode, depth: number = 0): string {
  if (!node.children || node.children.length === 0) {
    // This is a file
    if (node.prediction) {
      const score = node.prediction.degradation_score;
      const category = node.prediction.risk_category;
      const categoryClass = category.replace('_', '-');
      const indentStyle = `style="margin-left: ${depth * 20}px;"`;

      return `
        <div class="tree-file ${categoryClass}" ${indentStyle}>
          <div class="file-name">${node.name}</div>
          <div class="file-score">${score.toFixed(4)}</div>
          <div class="risk-badge ${categoryClass}">${category.replace('_', ' ')}</div>
        </div>
      `;
    }
    return '';
  }

  // This is a folder
  const sortedChildren = [...node.children].sort((a: FileTreeNode, b: FileTreeNode) => {
    // Folders first, then files
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    // Sort by name
    return a.name.localeCompare(b.name);
  });

  if (node.name === 'root') {
    // Don't render the root node itself
    return `<div class="file-tree-container">${sortedChildren.map((child: FileTreeNode) => generateTreeHTML(child, depth)).join('')}</div>`;
  }

  const childrenHTML = sortedChildren
    .map((child: FileTreeNode) => generateTreeHTML(child, depth + 1))
    .join('');

  // Calculate folder statistics
  const stats = calculateFolderStats(node);
  const folderClass = stats.category;
  const indentStyle = `style="margin-left: ${depth * 20}px;"`;

  return `
    <div class="tree-node" data-depth="${depth}">
      <div class="tree-folder ${folderClass}" onclick="toggleFolder(this)" ${indentStyle}>
        <span class="folder-toggle">▶</span>
        <span class="folder-icon">📁</span>
        <span class="folder-name">${node.name}</span>
        <span class="folder-stats">
          <span class="folder-count">${stats.fileCount} files</span>
          <span class="folder-score">${stats.avgScore.toFixed(3)}</span>
          <span class="risk-badge ${folderClass}">${stats.category.replace('-', ' ')}</span>
        </span>
      </div>
      <div class="collapsible">
        ${childrenHTML}
      </div>
    </div>
  `;
}

function calculateCommitStats(commitData: CommitData[]): CommitStats {
  if (commitData.length === 0) {
    return {
      totalCommits: 0,
      totalBugFixes: 0,
      avgCommitsPerFile: 0,
      avgAuthorsPerFile: 0,
      authorNames: [],
    };
  }

  const totalCommits = commitData.reduce((sum, d) => sum + (d.commits || 0), 0);
  const totalBugFixes = commitData.reduce((sum, d) => sum + (d.bug_commits || 0), 0);

  // Extract unique authors from author_names field in CommitData
  const uniqueAuthors = new Set<string>();
  commitData.forEach((d) => {
    if (d.author_names && Array.isArray(d.author_names)) {
      d.author_names.forEach((author: string) => uniqueAuthors.add(author));
    }
  });

  const authorNames = Array.from(uniqueAuthors);
  const avgAuthorsPerFile =
    commitData.reduce((sum, d) => sum + (d.authors || 0), 0) / commitData.length;

  return {
    totalCommits,
    totalBugFixes,
    avgCommitsPerFile: totalCommits / commitData.length,
    avgAuthorsPerFile,
    authorNames,
  };
}

export function formatAsHTML(
  predictions: RiskPrediction[],
  commitData: CommitData[],
  repoPath: string,
): string {
  const repoName = path.basename(repoPath);
  const timestamp = new Date().toISOString();

  // Calculate statistics
  const totalFiles = predictions.length;
  const meanScore = predictions.reduce((sum, p) => sum + p.degradation_score, 0) / totalFiles;
  const stdDev = Math.sqrt(
    predictions.reduce((sum, p) => sum + Math.pow(p.degradation_score - meanScore, 2), 0) /
      totalFiles,
  );

  const riskDistribution = predictions.reduce(
    (acc, p) => {
      const category = p.risk_category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const improved = riskDistribution['improved'] || 0;
  const stable = riskDistribution['stable'] || 0;
  const degraded = riskDistribution['degraded'] || 0;
  const severelyDegraded = riskDistribution['severely_degraded'] || 0;

  // Calculate commit statistics
  const commitStats = calculateCommitStats(commitData);

  // Sort predictions by risk score (highest first)
  const sortedPredictions = [...predictions].sort(
    (a, b) => b.degradation_score - a.degradation_score,
  );

  // Build file tree structure
  const fileTree = buildFileTree(sortedPredictions);

  // Calculate file type statistics
  const fileTypes = commitData.reduce(
    (acc, d) => {
      const ext = path.extname(d.module).toLowerCase() || '.no-ext';
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topFileTypes = Object.entries(fileTypes)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 8);

  // Calculate risk by file type
  const riskByType = predictions.reduce(
    (acc, p) => {
      const ext = path.extname(p.module).toLowerCase() || '.no-ext';
      if (!acc[ext]) acc[ext] = { sum: 0, count: 0 };
      acc[ext].sum += p.degradation_score;
      acc[ext].count += 1;
      return acc;
    },
    {} as Record<string, { sum: number; count: number }>,
  );

  const topRiskByType = Object.entries(riskByType)
    .map(([ext, data]) => ({
      ext,
      avg: (data as any).sum / (data as any).count,
      count: (data as any).count,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MaintSight - Maintenance Risk Analysis - ${repoName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: white;
            padding: 40px 30px;
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(22, 104, 220, 0.1);
            margin-bottom: 30px;
            text-align: center;
            border: 1px solid rgba(22, 104, 220, 0.1);
        }

        .header h1 {
            color: #1668dc;
            margin-bottom: 8px;
            font-size: 2.2em;
            font-weight: 700;
            letter-spacing: -0.02em;
        }

        .header p {
            color: #3c89e8;
            font-size: 1.1em;
            margin-bottom: 20px;
            font-weight: 500;
            opacity: 0.8;
        }

        .header .meta {
            color: #3c89e8;
            font-size: 0.9em;
            opacity: 0.7;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid rgba(22, 104, 220, 0.1);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
            max-width: 1000px;
            margin-left: auto;
            margin-right: auto;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }

        .stat-number {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .stat-label {
            color: #7f8c8d;
            font-size: 0.9em;
        }

        .stat-percentage {
            font-size: 0.8em;
            margin-top: 5px;
        }

        .improved { color: #4CAF50; }
        .stable { color: #1668dc; }
        .degraded { color: #FF9500; }
        .severely-degraded { color: #FF5757; }

        .section {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }

        .section h2 {
            color: #1668dc;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
        }

        .section h2.overview::before { content: '📊'; margin-right: 10px; }
        .section h2.commit-stats::before { content: '💻'; margin-right: 10px; }
        .section h2.file-types::before { content: '📁'; margin-right: 10px; }
        .section h2.top-files::before { content: '⚠️'; margin-right: 10px; }
        .section h2.file-tree::before { content: '🌳'; margin-right: 10px; }

        .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }

        .stat-list {
            list-style: none;
            padding: 0;
        }

        .stat-list li {
            padding: 8px 0;
            border-bottom: 1px solid #ecf0f1;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .stat-list li:last-child {
            border-bottom: none;
        }

        .file-type {
            font-family: 'Monaco', 'Menlo', monospace;
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        .risk-score {
            font-family: 'Monaco', 'Menlo', monospace;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.85em;
        }

        .risk-high { background: #fdedec; color: #e74c3c; }
        .risk-medium { background: #fef9e7; color: #f39c12; }
        .risk-low { background: #ebf3fd; color: #3498db; }
        .risk-good { background: #eafaf1; color: #27ae60; }

        .tree-node {
            margin-bottom: 10px;
        }

        .tree-folder {
            font-weight: bold;
            color: #34495e;
            margin-bottom: 10px;
            cursor: pointer;
            user-select: none;
        }

        .tree-folder:hover {
            color: #2c3e50;
        }

        .tree-folder::before {
            margin-right: 5px;
        }

        .tree-file {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            margin: 5px 0;
            border-radius: 6px;
            background: #f8f9fa;
            border-left: 4px solid #ddd;
        }

        .tree-file.improved {
            border-left-color: #4CAF50;
            background: #E8F5E8;
        }

        .tree-file.stable {
            border-left-color: #1668dc;
            background: #f0f5ff;
        }

        .tree-file.degraded {
            border-left-color: #FF9500;
            background: #FFF5E6;
        }

        .tree-file.severely-degraded {
            border-left-color: #FF5757;
            background: #FFE8E8;
        }

        .file-name {
            flex: 1;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
        }

        .file-name::before {
            content: '📄 ';
            margin-right: 5px;
        }

        .file-score {
            font-weight: bold;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.85em;
        }

        .risk-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-left: 10px;
        }

        .risk-badge.improved {
            background: #4CAF50;
            color: white;
        }

        .risk-badge.stable {
            background: #1668dc;
            color: white;
        }

        .risk-badge.degraded {
            background: #FF9500;
            color: white;
        }

        .risk-badge.severely-degraded {
            background: #FF5757;
            color: white;
        }

        .file-tree-container {
            max-height: 600px;
            overflow-y: auto;
            padding: 10px;
            background: #f0f5ff;
            border-radius: 8px;
            border: 1px solid #65a9f3;
        }

        .tree-folder {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            margin: 2px 0;
            border-radius: 6px;
            background: #e6f4ff;
            border-left: 4px solid #1668dc;
            cursor: pointer;
            user-select: none;
            transition: all 0.2s ease;
            font-weight: 500;
        }

        .tree-folder:hover {
            background: #f0f5ff;
            border-left-color: #1554ad;
        }

        .tree-folder.improved {
            border-left-color: #4CAF50;
            background: #E8F5E8;
        }

        .tree-folder.stable {
            border-left-color: #1668dc;
            background: #f0f5ff;
        }

        .tree-folder.degraded {
            border-left-color: #FF9500;
            background: #FFF5E6;
        }

        .tree-folder.severely-degraded {
            border-left-color: #FF5757;
            background: #FFE8E8;
        }

        .folder-toggle {
            margin-right: 8px;
            font-size: 12px;
            transition: transform 0.2s ease;
            color: #1668dc;
        }

        .folder-toggle.expanded {
            transform: rotate(90deg);
        }

        .folder-icon {
            margin-right: 8px;
            font-size: 14px;
        }

        .folder-name {
            flex: 1;
            font-size: 0.9em;
            color: #2D3748;
        }

        .folder-stats {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.8em;
        }

        .folder-count {
            color: #1668dc;
            background: #f0f5ff;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 500;
        }

        .folder-score {
            font-family: 'Monaco', 'Menlo', monospace;
            font-weight: bold;
            color: #2D3748;
        }

        .collapsible {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }

        .collapsible.expanded {
            max-height: 2000px;
        }

        .footer {
            text-align: center;
            color: #7f8c8d;
            font-size: 0.9em;
            margin-top: 30px;
            padding: 20px;
        }

        .top-files-list {
            max-height: 400px;
            overflow-y: auto;
        }

        .top-file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin: 5px 0;
            border-radius: 6px;
            background: #f8f9fa;
            border-left: 4px solid #ddd;
        }

        .top-file-item.severely-degraded {
            border-left-color: #FF5757;
            background: #FFE8E8;
        }

        .top-file-item.degraded {
            border-left-color: #FF9500;
            background: #FFF5E6;
        }

        .top-file-item.stable {
            border-left-color: #1668dc;
            background: #f0f5ff;
        }

        .top-file-item.improved {
            border-left-color: #4CAF50;
            background: #E8F5E8;
        }

        .authors-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
            max-height: 280px; /* Height for ~10 contributors (2 rows of 5) */
            overflow-y: auto;
            padding: 10px;
            border: 1px solid #65a9f3;
            border-radius: 8px;
            background: #f0f5ff;
        }

        .author-item {
            display: flex;
            align-items: center;
            padding: 10px 15px;
            background: #e6f4ff;
            border-radius: 8px;
            border: 1px solid #65a9f3;
            border-left: 4px solid #1668dc;
            transition: background 0.2s ease;
        }

        .author-item:hover {
            background: #e9ecef;
        }



        .author-avatar {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background: #1668dc;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            margin-right: 12px;
            flex-shrink: 0;
        }


        .author-name {
            font-size: 0.9em;
            color: #2c3e50;
            font-weight: 500;
            word-break: break-word;
        }

        @media (max-width: 1200px) {
            .stats-grid {
                grid-template-columns: repeat(4, 1fr);
                grid-template-rows: repeat(2, 1fr);
            }
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }

            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: repeat(4, 1fr);
            }

            .header {
                padding: 30px 20px;
            }

            .header h1 {
                font-size: 1.8em;
            }
        }

            .two-column {
                grid-template-columns: 1fr;
            }

            .tree-node {
                margin-left: 0;
            }

            .authors-grid {
                grid-template-columns: 1fr;
                max-height: 400px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 MaintSight - Maintenance Risk Analysis</h1>
            <p>Powered by TechDebtGPT</p>
            <div class="meta">
                <strong>Repository:</strong> ${repoName}<br>
                <strong>Generated:</strong> ${new Date(timestamp).toLocaleString()}<br>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number improved">${improved}</div>
                <div class="stat-label">Improved</div>
                <div class="stat-percentage improved">${((improved / totalFiles) * 100).toFixed(1)}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-number stable">${stable}</div>
                <div class="stat-label">Stable</div>
                <div class="stat-percentage stable">${((stable / totalFiles) * 100).toFixed(1)}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-number degraded">${degraded}</div>
                <div class="stat-label">Degraded</div>
                <div class="stat-percentage degraded">${((degraded / totalFiles) * 100).toFixed(1)}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-number severely-degraded">${severelyDegraded}</div>
                <div class="stat-label">Severely Degraded</div>
                <div class="stat-percentage severely-degraded">${((severelyDegraded / totalFiles) * 100).toFixed(1)}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalFiles}</div>
                <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${meanScore.toFixed(4)}</div>
                <div class="stat-label">Mean Risk Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stdDev.toFixed(4)}</div>
                <div class="stat-label">Standard Deviation</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${commitStats.totalCommits}</div>
                <div class="stat-label">Total Commits</div>
            </div>
        </div>

        <div class="section">
            <h2 class="overview">Analysis Overview</h2>
            <p><strong>Repository Analysis:</strong> This comprehensive report analyzes ${totalFiles} files across ${commitStats.totalCommits} commits in the ${repoName} repository to assess maintenance risk and code quality trends.</p>
            <br>
            <p><strong>Risk Categories:</strong></p>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li><strong class="improved">Improved (< 0.0):</strong> Code quality is improving - excellent maintenance practices</li>
                <li><strong class="stable">Stable (0.0-0.1):</strong> Code quality is stable - minimal degradation detected</li>
                <li><strong class="degraded">Degraded (0.1-0.2):</strong> Moderate degradation - consider refactoring</li>
                <li><strong class="severely-degraded">Severely Degraded (> 0.2):</strong> Critical attention needed - rapid quality decline</li>
            </ul>
        </div>

        <div class="section">
            <h2 class="top-files">Highest Risk Files (Top 30)</h2>
            <div class="top-files-list">
                ${sortedPredictions
                  .slice(0, 30)
                  .map((p) => {
                    const score = p.degradation_score;
                    const categoryClass = p.risk_category.replace('_', '-');
                    return `
                  <div class="top-file-item ${categoryClass}">
                    <div class="file-name">${p.module}</div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div class="file-score">${score.toFixed(4)}</div>
                      <div class="risk-badge ${categoryClass}">${p.risk_category.replace('_', ' ')}</div>
                    </div>
                  </div>
                  `;
                  })
                  .join('')}
            </div>
        </div>

        <div class="section">
            <h2 class="file-tree">Complete File Analysis Tree</h2>
            ${generateTreeHTML(fileTree)}
        </div>

        <div class="two-column">
            <div class="section">
                <h2 class="commit-stats">Commit Statistics</h2>
                <ul class="stat-list">
                    <li>
                        <span>Total Commits</span>
                        <span><strong>${commitStats.totalCommits}</strong></span>
                    </li>
                    <li>
                        <span>Total Authors</span>
                        <span><strong>${commitStats.authorNames.length}</strong></span>
                    </li>
                    <li>
                        <span>Bug Fix Commits</span>
                        <span><strong>${commitStats.totalBugFixes}</strong></span>
                    </li>
                    <li>
                        <span>Avg Commits/File</span>
                        <span><strong>${commitStats.avgCommitsPerFile.toFixed(1)}</strong></span>
                    </li>
                    <li>
                        <span>Bug Fix Rate</span>
                        <span><strong>${commitStats.totalCommits > 0 ? ((commitStats.totalBugFixes / commitStats.totalCommits) * 100).toFixed(1) : 0}%</strong></span>
                    </li>
                </ul>
            </div>

            <div class="section">
                <h2 class="file-types">File Type Distribution</h2>
                <ul class="stat-list">
                    ${topFileTypes
                      .map(
                        ([ext, count]) => `
                    <li>
                        <span class="file-type">${ext}</span>
                        <span><strong>${count}</strong> files</span>
                    </li>
                    `,
                      )
                      .join('')}
                </ul>
            </div>
        </div>

        ${
          commitStats.authorNames.length > 0
            ? `
        <div class="section">
            <h2 class="commit-stats">Repository Contributors (${commitStats.authorNames.length})</h2>
            <div class="authors-grid">
                ${commitStats.authorNames
                  .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                  .map(
                    (author) => `
                    <div class="author-item">
                        <div class="author-avatar">${author.charAt(0).toUpperCase()}</div>
                        <div class="author-name">${author}</div>
                    </div>
                `,
                  )
                  .join('')}
            </div>
        </div>
        `
            : ''
        }

        ${
          topRiskByType.length > 0
            ? `
        <div class="section">
            <h2 class="file-types">Average Risk by File Type</h2>
            <ul class="stat-list">
                ${topRiskByType
                  .map(({ ext, avg, count }) => {
                    let riskClass = 'risk-good';
                    if (avg >= 0.2) riskClass = 'risk-high';
                    else if (avg >= 0.1) riskClass = 'risk-medium';
                    else if (avg >= 0.0) riskClass = 'risk-low';

                    return `
                  <li>
                      <span class="file-type">${ext}</span>
                      <span style="display: flex; align-items: center; gap: 10px;">
                          <span class="risk-score ${riskClass}">${avg.toFixed(3)}</span>
                          <span><strong>${count}</strong> files</span>
                      </span>
                  </li>
                  `;
                  })
                  .join('')}
            </ul>
        </div>
        `
            : ''
        }

        <div class="footer">
            Generated by <strong>MaintSight</strong> using XGBoost Machine Learning<br>
            Risk scores based on commit patterns, code churn, and development activity analysis<br>
            <em>Analysis includes both prediction and statistical insights</em>
        </div>
    </div>

    <script>
        // Toggle folder function
        function toggleFolder(element) {
            const content = element.nextElementSibling;
            const toggle = element.querySelector('.folder-toggle');

            if (content && content.classList.contains('collapsible')) {
                content.classList.toggle('expanded');
                toggle.classList.toggle('expanded');
            }
        }

        // Initialize - all folders collapsed by default (no auto-expand)
        document.addEventListener('DOMContentLoaded', function() {
            // All folders start collapsed by default
            console.log('File tree initialized - all folders collapsed');
        });

        // Smooth scrolling for any internal links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });

        // Add keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.target.classList.contains('tree-folder')) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleFolder(e.target);
                }
            }
        });
    </script>
</body>
</html>`;
}
