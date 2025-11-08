import { GitCommitCollector } from '../../src/services/git-commit-collector';
import { execSync } from 'child_process';
import * as fs from 'fs';

jest.mock('child_process');
jest.mock('fs');

describe('GitCommitCollector', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync = jest.fn().mockReturnValue(true);
    mockExecSync.mockReturnValue(Buffer.from(''));
  });

  describe('constructor', () => {
    it('should initialize with valid repository path', () => {
      mockExecSync.mockReturnValueOnce(Buffer.from('')); // git rev-parse
      mockExecSync.mockReturnValueOnce(Buffer.from('main\ndevelop\n')); // git branch

      const collector = new GitCommitCollector('/path/to/repo', 'main');
      expect(collector).toBeDefined();
    });

    it('should throw error if repository path does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => {
        new GitCommitCollector('/invalid/path', 'main');
      }).toThrow('Repository path does not exist: /invalid/path');
    });

    it('should throw error if not a git repository', () => {
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('Not a git repository');
      });

      expect(() => {
        new GitCommitCollector('/path/to/repo', 'main');
      }).toThrow('Invalid git repository: /path/to/repo');
    });

    it('should throw error if branch does not exist', () => {
      mockExecSync.mockReturnValueOnce(Buffer.from('')); // git rev-parse
      mockExecSync.mockReturnValueOnce(Buffer.from('main\ndevelop\n')); // git branch

      expect(() => {
        new GitCommitCollector('/path/to/repo', 'feature/nonexistent');
      }).toThrow("Branch 'feature/nonexistent' not found");
    });
  });

  describe('fetchCommitData', () => {
    let collector: GitCommitCollector;

    beforeEach(() => {
      mockExecSync.mockReturnValueOnce(Buffer.from('')); // git rev-parse
      mockExecSync.mockReturnValueOnce(Buffer.from('main\ndevelop\n')); // git branch
      collector = new GitCommitCollector('/path/to/repo', 'main');
    });

    it('should fetch and parse commit data correctly', () => {
      const gitLogOutput = `abc123|user@example.com|1234567890|Fix bug in parser
10	5	src/parser.ts
def456|user2@example.com|1234567891|Add new feature
20	0	src/feature.ts`;

      mockExecSync.mockReturnValueOnce(Buffer.from(gitLogOutput));

      const result = collector.fetchCommitData(100);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        module: 'src/parser.ts',
        filename: 'src/parser.ts',
        repo_name: 'repo',
        lines_added: 10,
        lines_removed: 5,
        prs: 1,
        unique_authors: 1,
        bug_prs: 1,
        churn: 15,
        created_at: new Date(1234567890 * 1000),
        last_modified: new Date(1234567890 * 1000),
      });
    });

    it('should filter out non-source files', () => {
      const gitLogOutput = `abc123|user@example.com|1234567890|Update readme
5	2	README.md
def456|user@example.com|1234567891|Fix bug
10	5	src/index.ts`;

      mockExecSync.mockReturnValueOnce(Buffer.from(gitLogOutput));

      const result = collector.fetchCommitData(100);

      expect(result).toHaveLength(1);
      expect(result[0].module).toBe('src/index.ts');
    });

    it('should handle multiple commits for same file', () => {
      const gitLogOutput = `abc123|user@example.com|1234567890|Fix bug 1
10	5	src/parser.ts
def456|user2@example.com|1234567891|Fix bug 2
5	3	src/parser.ts
ghi789|user@example.com|1234567892|Refactor
15	10	src/parser.ts`;

      mockExecSync.mockReturnValueOnce(Buffer.from(gitLogOutput));

      const result = collector.fetchCommitData(100);

      expect(result).toHaveLength(1);
      expect(result[0].lines_added).toBe(30);
      expect(result[0].lines_removed).toBe(18);
      expect(result[0].prs).toBe(3);
      expect(result[0].unique_authors).toBe(2);
      expect(result[0].bug_prs).toBe(2);
      expect(result[0].churn).toBe(48);
    });

    it('should return empty array if no source files found', () => {
      const gitLogOutput = `abc123|user@example.com|1234567890|Update docs
5	2	README.md`;

      mockExecSync.mockReturnValueOnce(Buffer.from(gitLogOutput));

      const result = collector.fetchCommitData(100);

      expect(result).toHaveLength(0);
    });

    it('should identify bug fix commits correctly', () => {
      const gitLogOutput = `abc123|user@example.com|1234567890|fix: resolve parser issue
10	5	src/parser.ts
def456|user@example.com|1234567891|bugfix: handle edge case
5	2	src/handler.ts
ghi789|user@example.com|1234567892|patch security vulnerability
8	3	src/security.ts
jkl012|user@example.com|1234567893|Add new feature
20	0	src/feature.ts`;

      mockExecSync.mockReturnValueOnce(Buffer.from(gitLogOutput));

      const result = collector.fetchCommitData(100);

      const bugFixFiles = result.filter((f) => f.bug_prs > 0);
      expect(bugFixFiles).toHaveLength(3);

      const featureFile = result.find((f) => f.module === 'src/feature.ts');
      expect(featureFile?.bug_prs).toBe(0);
    });
  });

  describe('isSourceFile', () => {
    let collector: GitCommitCollector;

    beforeEach(() => {
      mockExecSync.mockReturnValueOnce(Buffer.from('')); // git rev-parse
      mockExecSync.mockReturnValueOnce(Buffer.from('main\n')); // git branch
      collector = new GitCommitCollector('/path/to/repo', 'main');
    });

    it('should identify source files correctly', () => {
      const sourceFiles = [
        'file.py',
        'file.js',
        'file.ts',
        'file.java',
        'file.cpp',
        'file.c',
        'file.h',
        'file.hpp',
        'file.cs',
        'file.rb',
        'file.go',
        'file.rs',
        'file.php',
        'file.swift',
        'file.kt',
        'file.scala',
        'file.r',
        'file.m',
        'file.jsx',
        'file.tsx',
        'file.vue',
        'file.sol',
      ];

      sourceFiles.forEach((file) => {
        expect(collector['isSourceFile'](file)).toBe(true);
      });
    });

    it('should reject non-source files', () => {
      const nonSourceFiles = [
        'README.md',
        'package.json',
        'image.png',
        'style.css',
        'data.xml',
        'config.yml',
        'document.pdf',
      ];

      nonSourceFiles.forEach((file) => {
        expect(collector['isSourceFile'](file)).toBe(false);
      });
    });
  });
});
