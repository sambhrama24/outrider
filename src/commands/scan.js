const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const glob = require('glob');
const { RuleEngine } = require('../engine/ruleEngine');
const { MLAnalyzer } = require('../engine/mlAnalyzer');
const { FileAnalyzer } = require('../engine/fileAnalyzer');
const { ConfigLoader } = require('../utils/configLoader');
const { OutputFormatter } = require('../utils/outputFormatter');

/**
 * Main scan command handler
 * @param {Object} argv - Command line arguments
 */
async function scanCommand(argv) {
  try {
    const { directory, config: configPath, output: outputFormat } = argv;

    console.log(chalk.blue('Starting Outrider code analysis...'));
    console.log(chalk.gray(`Target directory: ${directory}`));
    console.log(chalk.gray(`Config file: ${configPath}`));

    // Load configuration
    const config = await ConfigLoader.load(configPath);
    if (argv.verbose) {
      console.log(chalk.gray('Configuration loaded:', JSON.stringify(config, null, 2)));
    }

    // Initialize engines
    const ruleEngine = new RuleEngine(config.rules);
    const mlAnalyzer = new MLAnalyzer(config.ml);
    const fileAnalyzer = new FileAnalyzer();

    // Scan directory for code files
    const codeFiles = await scanCodeFiles(directory, config.fileTypes);
    if (argv.verbose) {
      console.log(chalk.gray(`Found ${codeFiles.length} code files to analyze`));
    }

    // Analyze each file
    const results = [];
    for (const file of codeFiles) {
      if (argv.verbose) {
        console.log(chalk.gray(`Analyzing: ${file}`));
      }

      const fileResults = await analyzeFile(file, ruleEngine, mlAnalyzer, fileAnalyzer, config);
      results.push(...fileResults);
    }

    // Display results
    displayResults(results, outputFormat);

    // Summary
    const summary = generateSummary(results);
    console.log(chalk.blue('\nAnalysis Summary:'));
    console.log(chalk.green(`Files analyzed: ${codeFiles.length}`));
    console.log(chalk.yellow(`Warnings found: ${summary.warnings}`));
    console.log(chalk.red(`Errors found: ${summary.errors}`));
    console.log(chalk.blue(`Risk score: ${summary.riskScore}/100`));

  } catch (error) {
    console.error(chalk.red('Error during scan:'), error.message);
    if (argv.verbose) {
      console.error(chalk.gray(error.stack));
    }
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
 * Display analysis results
 * @param {Array} results - Analysis results
 * @param {string} outputFormat - Output format
 */
function displayResults(results, outputFormat) {
  if (outputFormat === 'console') {
    console.log(chalk.blue('\nAnalysis Results:'));

    if (results.length === 0) {
      console.log(chalk.green('No issues found! Your code looks great.'));
      return;
    }

    // Group results by file
    const resultsByFile = groupResultsByFile(results);

    for (const [file, fileResults] of Object.entries(resultsByFile)) {
      console.log(chalk.cyan(`\n${file}:`));

      fileResults.forEach(result => {
        const severityColor = result.severity === 'error' ? chalk.red : chalk.yellow;
        const severityIcon = result.severity === 'error' ? '❌' : '⚠️';

        console.log(`  ${severityIcon} ${severityColor(result.severity.toUpperCase())} Line ${result.line}:${result.column}`);
        console.log(`     ${result.message}`);
        if (result.rule) {
          console.log(`     Rule: ${chalk.gray(result.rule)}`);
        }
      });
    }
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

/**
 * Generate summary statistics
 * @param {Array} results - Analysis results
 * @returns {Object} Summary statistics
 */
function generateSummary(results) {
  const warnings = results.filter(r => r.severity === 'warning').length;
  const errors = results.filter(r => r.severity === 'error').length;

  // Calculate risk score (0-100)
  let riskScore = 0;
  if (results.length > 0) {
    const totalIssues = warnings + errors;
    const errorWeight = 3;
    const warningWeight = 1;
    const weightedScore = (errors * errorWeight) + (warnings * warningWeight);
    riskScore = Math.min(100, Math.round((weightedScore / totalIssues) * 20));
  }

  return { warnings, errors, riskScore };
}

module.exports = {
  scanCommand
};
