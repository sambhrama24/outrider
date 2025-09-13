const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const { RuleEngine } = require('../engine/ruleEngine');
const { MLAnalyzer } = require('../engine/mlAnalyzer');
const { FileAnalyzer } = require('../engine/fileAnalyzer');
const { ConfigLoader } = require('../utils/configLoader');
const { CodeFixer } = require('../utils/codeFixer');

/**
 * Main fix command handler
 * @param {Object} argv - Command line arguments
 */
async function fixCommand(argv) {
  try {
    const { directory, config: configPath, dryRun, backup } = argv;

    console.log(chalk.blue('Starting Outrider code fixing...'));
    console.log(chalk.gray(`Target directory: ${directory}`));
    console.log(chalk.gray(`Config file: ${configPath}`));
    console.log(chalk.gray(`Dry run: ${dryRun ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`Backup: ${backup ? 'Yes' : 'No'}`));

    // Load configuration
    const config = await ConfigLoader.load(configPath);

    // Initialize engines
    const ruleEngine = new RuleEngine(config.rules);
    const mlAnalyzer = new MLAnalyzer(config.ml);
    const fileAnalyzer = new FileAnalyzer();
    const codeFixer = new CodeFixer();

    // Scan directory for code files
    const codeFiles = await scanCodeFiles(directory, config.fileTypes);
    console.log(chalk.gray(`Found ${codeFiles.length} code files to analyze`));

    // Analyze each file and collect fixable issues
    const allResults = [];
    const fixableResults = [];

    for (const file of codeFiles) {
      console.log(chalk.gray(`Analyzing: ${file}`));

      const fileResults = await analyzeFile(file, ruleEngine, mlAnalyzer, fileAnalyzer, config);
      allResults.push(...fileResults);

      // Filter for fixable issues
      const fileFixableResults = fileResults.filter(result =>
        codeFixer.isFixable(result.rule)
      );
      fixableResults.push(...fileFixableResults);
    }

    if (fixableResults.length === 0) {
      console.log(chalk.green('No fixable issues found!'));
      return;
    }

    // Group fixable results by file
    const resultsByFile = groupResultsByFile(fixableResults);

    console.log(chalk.blue(`\nFound ${fixableResults.length} fixable issues:`));

    // Process each file
    let totalFixed = 0;
    let totalFiles = 0;

    for (const [filePath, fileResults] of Object.entries(resultsByFile)) {
      console.log(chalk.cyan(`\nProcessing: ${path.basename(filePath)}`));

      try {
        const fileStats = await processFile(filePath, fileResults, codeFixer, dryRun, backup);
        totalFixed += fileStats.fixed;
        totalFiles++;

        if (fileStats.fixed > 0) {
          console.log(chalk.green(`   Fixed ${fileStats.fixed} issues`));
        } else {
          console.log(chalk.yellow(`   No issues fixed`));
        }
      } catch (error) {
        console.error(chalk.red(`   Error processing file: ${error.message}`));
      }
    }

    // Summary
    console.log(chalk.blue('\nFix Summary:'));
    console.log(chalk.green(`Files processed: ${totalFiles}`));
    console.log(chalk.green(`Total issues fixed: ${totalFixed}`));
    console.log(chalk.gray(`Target directory: ${directory}`));

    if (dryRun) {
      console.log(chalk.yellow('\nThis was a dry run - no files were modified'));
      console.log(chalk.yellow('Run without --dry-run to apply the fixes'));
    } else {
      console.log(chalk.green('\nAll fixable issues have been resolved!'));
    }

  } catch (error) {
    console.error(chalk.red('Error during fix operation:'), error.message);
    process.exit(1);
  }
}

/**
 * Scan directory for code files
 * @param {string} directory - Directory to scan
 * @param {Array} fileTypes - File extensions to include
 * @returns {Promise<Array>} Array of file paths
 */
async function scanCodeFiles(directory, fileTypes = ['js', 'ts', 'jsx', 'tsx']) {
  const patterns = fileTypes.map(ext => `**/*.${ext}`);
  const files = [];

  for (const pattern of patterns) {
    const matches = glob.sync(pattern, {
      cwd: directory,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
    });
    files.push(...matches);
  }

  return files;
}

/**
 * Analyze a single file
 * @param {string} filePath - Path to the file
 * @param {RuleEngine} ruleEngine - Rule-based analysis engine
 * @param {MLAnalyzer} mlAnalyzer - ML-based analysis engine
 * @param {FileAnalyzer} fileAnalyzer - File parsing and analysis utilities
 * @param {Object} config - Configuration object
 * @returns {Promise<Array>} Array of analysis results
 */
async function analyzeFile(filePath, ruleEngine, mlAnalyzer, fileAnalyzer, config) {
  const results = [];

  try {
    // Parse file content
    const content = fs.readFileSync(filePath, 'utf8');
    const ast = await fileAnalyzer.parseFile(content, path.extname(filePath));

    // Rule-based analysis
    const ruleResults = await ruleEngine.analyze(ast, content, filePath);
    results.push(...ruleResults);

    // ML-based analysis
    const mlResults = await mlAnalyzer.analyze(ast, content, filePath);
    results.push(...mlResults);

  } catch (error) {
    results.push({
      type: 'error',
      severity: 'error',
      file: filePath,
      line: 1,
      column: 1,
      message: `Failed to analyze file: ${error.message}`,
      rule: 'file-parsing-error'
    });
  }

  return results;
}

/**
 * Process a single file for fixing
 * @param {string} filePath - Path to the file
 * @param {Array} fileResults - Analysis results for the file
 * @param {CodeFixer} codeFixer - Code fixing utility
 * @param {boolean} dryRun - Whether this is a dry run
 * @param {boolean} backup - Whether to create backups
 * @returns {Promise<Object>} File processing statistics
 */
async function processFile(filePath, fileResults, codeFixer, dryRun, backup) {
  let fixed = 0;

  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;

    // Create backup if requested
    if (backup && !dryRun) {
      const backupPath = `${filePath}.outrider-backup`;
      fs.writeFileSync(backupPath, content, 'utf8');
      console.log(chalk.gray(`   Backup created: ${path.basename(backupPath)}`));
    }

    // Apply fixes for each issue
    for (const result of fileResults) {
      if (codeFixer.isFixable(result.rule)) {
        const fixResult = codeFixer.applyFix(result, modifiedContent);
        if (fixResult.fixed) {
          modifiedContent = fixResult.content;
          fixed++;
          console.log(chalk.green(`     Fixed: ${result.message} (Line ${result.line})`));
        }
      }
    }

    // Write modified content if not dry run
    if (!dryRun && fixed > 0) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
    }

    return { fixed, total: fileResults.length };

  } catch (error) {
    throw new Error(`Failed to process file: ${error.message}`);
  }
}

/**
 * Group results by file
 * @param {Array} results - Analysis results
 * @returns {Object} Results grouped by file
 */
function groupResultsByFile(results) {
  return results.reduce((acc, result) => {
    if (!acc[result.file]) {
      acc[result.file] = [];
    }
    acc[result.file].push(result);
    return acc;
  }, {});
}

module.exports = {
  fixCommand
};
