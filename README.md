# Outrider

> A predictive code analysis tool that learns from universal bug patterns

Outrider is a hybrid, predictive code analyzer that combines traditional rule-based linting with machine learning to identify potential bugs and code quality issues. It learns from millions of bug-fix commits from the public open-source ecosystem, providing intelligent, contextual warnings directly in your development workflow.

## Features

- **Hybrid Analysis**: Combines rule-based and ML-based analysis for comprehensive code review
- **Predictive Warnings**: Identifies patterns statistically likely to contain bugs
- **Instant Feedback**: Runs automatically on file save or compilation
- **Risk Scoring**: Provides holistic risk assessment for code quality
- **Configurable Rules**: Extensible rule engine with customizable patterns
- **Multiple Output Formats**: Console, JSON, and CSV output options
- **Universal Learning**: Pre-trained on public open-source bug patterns

## Quick Start

### Installation

```bash
# Install globally
npm install -g outrider

# Or install locally in your project
npm install --save-dev outrider
```

### Basic Usage

```bash
# Scan current directory
outrider scan .

# Scan specific directory
outrider scan /path/to/your/project

# Use custom configuration
outrider scan . --config ./custom-outrider.json

# Output in JSON format
outrider scan . --output json

# Enable verbose output
outrider scan . --verbose
```

### Initialize Configuration

```bash
# Create default configuration file
outrider init
```

## Commands

### `outrider scan <directory>`

Analyze code in the specified directory for potential issues.

**Options:**
- `--config, -c`: Path to configuration file (default: `./outrider.json`)
- `--output, -o`: Output format: `console`, `json`, or `csv` (default: `console`)
- `--verbose, -v`: Enable verbose output

**Examples:**
```bash
# Basic scan
outrider scan .

# Custom config and JSON output
outrider scan src --config ./config/outrider.json --output json

# Verbose scan for debugging
outrider scan . --verbose
```

### `outrider init`

Initialize Outrider configuration in the current directory.

### `outrider rules`

List available analysis rules and their configurations.

### `outrider --help`

Show help information and available commands.

## Configuration

Outrider uses a JSON configuration file (`outrider.json`) to customize analysis behavior. Here's a sample configuration:

```json
{
  "version": "1.0.0",
  "fileTypes": ["js", "ts", "jsx", "tsx"],
  "ignorePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.min.js"
  ],
  "rules": {
    "no-console-log": {
      "enabled": true,
      "severity": "warning"
    },
    "no-debugger": {
      "enabled": true,
      "severity": "error"
    }
  },
  "ml": {
    "enabled": true,
    "confidenceThreshold": 0.7,
    "maxWarningsPerFile": 10
  },
  "thresholds": {
    "maxWarnings": 100,
    "maxErrors": 10,
    "minRiskScore": 70
  }
}
```

### Configuration Options

#### `fileTypes`
Array of file extensions to analyze. Default: `["js", "ts", "jsx", "tsx"]`

#### `ignorePatterns`
Glob patterns for files/directories to ignore during analysis.

#### `rules`
Configuration for rule-based analysis. Each rule can have:
- `enabled`: Boolean to enable/disable the rule
- `severity`: `"error"`, `"warning"`, or `"info"`

#### `ml`
Machine learning analysis configuration:
- `enabled`: Enable/disable ML analysis
- `confidenceThreshold`: Minimum confidence for ML warnings (0.0-1.0)
- `maxWarningsPerFile`: Maximum ML warnings per file

#### `thresholds`
Quality thresholds for CI/CD integration:
- `maxWarnings`: Maximum allowed warnings
- `maxErrors`: Maximum allowed errors
- `minRiskScore`: Minimum required risk score (0-100)

## Analysis Types

### Rule-Based Analysis

Traditional linting rules that catch common anti-patterns:

- **Code Quality**: Unused variables, empty blocks, trailing spaces
- **Best Practices**: Prefer const over let, no var usage
- **Security**: No eval, no debugger statements
- **Style**: Consistent indentation, no multiple empty lines

### ML-Based Analysis

Predictive analysis using heuristic patterns and machine learning:

- **Race Conditions**: Async/await misuse, missing error handling
- **Memory Leaks**: Event listeners without removal, intervals without cleanup
- **Null Access**: Deep property access without null checks
- **Type Safety**: Loose equality comparisons
- **Performance**: Nested loops, string concatenation in loops

## Output Formats

### Console Output (Default)
Human-readable output:
```
Analysis Results:

/path/to/file.js:
  ⚠️ WARNING Line 15:3
     Console.log statements should be removed in production
     Rule: no-console-log
     Remove console.log statement or use a proper logging library

Analysis Summary:
Files analyzed: 5
Warnings found: 3
Errors found: 0
Risk score: 25/100
```

### JSON Output
Structured data for programmatic processing:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "summary": {
    "total": 3,
    "errors": 0,
    "warnings": 3,
    "riskScore": 25
  },
  "results": [...]
}
```

### CSV Output
Comma-separated values for spreadsheet import:
```csv
File,Line,Column,Severity,Type,Rule,Message,Suggestion,Confidence,Category
/path/to/file.js,15,3,warning,rule,no-console-log,Console.log statements should be removed in production,Remove console.log statement or use a proper logging library,,
```

## Examples

### Example 1: Basic Project Scan
```bash
# Navigate to your project
cd /path/to/your/project

# Run analysis
outrider scan .

# Output will show all issues found
```

### Example 2: CI/CD Integration
```bash
# Run with JSON output for CI
outrider scan . --output json > analysis-results.json

# Check exit code for CI failure
if [ $? -eq 0 ]; then
  echo "Analysis passed"
else
  echo "Analysis failed"
  exit 1
fi
```

### Example 3: Custom Configuration
```bash
# Create custom config
cat > custom-outrider.json << EOF
{
  "rules": {
    "no-console-log": { "enabled": false }
  },
  "ml": {
    "confidenceThreshold": 0.8
  }
}
EOF

# Run with custom config
outrider scan . --config custom-outrider.json
```

## Development

### Prerequisites
- Node.js 16.0.0 or higher
- npm 7.0.0 or higher

### Setup
```bash
# Clone the repository
git clone https://github.com/your-username/outrider-cli.git
cd outrider-cli

# Install dependencies
npm install

# Link the CLI locally
npm link

# Run tests
npm test
```

### Project Structure
```
outrider-cli/
├── src/
│   ├── commands/          # CLI command implementations
│   ├── engine/            # Core analysis engines
│   └── utils/             # Utility functions
├── index.js               # Main CLI entry point
├── package.json           # Package configuration
├── outrider.json          # Sample configuration
└── README.md             # This file
```

## Roadmap

### Stage 1: MVP
- [x] Standalone CLI tool
- [x] Rule-based analysis engine
- [x] ML/heuristic analysis engine
- [x] Configurable rules and patterns
- [x] Multiple output formats

### Stage 2: Enhancements & Integrations
- [ ] VS Code extension
- [ ] GitHub Actions integration
- [ ] Git hooks integration
- [ ] Real-time file monitoring

### Stage 3: Scaling & Monetization
- [ ] Enterprise features
- [ ] Managed cloud service
- [ ] Custom ML model training
- [ ] Team collaboration tools

---
