/**
 * ML Analyzer for predictive code analysis
 * Uses pre-trained models to identify potential bug patterns
 */

class MLAnalyzer {
  constructor(config = {}) {
    this.config = {
      enabled: true,
      confidenceThreshold: 0.7,
      maxWarningsPerFile: 10,
      ...config
    };

    this.model = null;
    this.features = null;
    this.initializeModel();
  }

  /**
   * Initialize the ML model
   * For MVP, we'll use a simple heuristic-based approach
   * In future versions, this will load a pre-trained model
   */
  async initializeModel() {
    try {
      // TODO: Load pre-trained model from package
      // For now, we'll use heuristic patterns based on common bug research
      this.model = {
        type: 'heuristic',
        version: '1.0.0',
        patterns: this.getHeuristicPatterns()
      };

      this.features = this.extractFeatures;
    } catch (error) {
      console.warn('ML model initialization failed, falling back to heuristic analysis:', error.message);
      this.model = {
        type: 'heuristic',
        version: '1.0.0',
        patterns: this.getHeuristicPatterns()
      };
    }
  }

  /**
   * Get heuristic patterns for common bug types
   * @returns {Object} Pattern definitions
   */
  getHeuristicPatterns() {
    return {
      // Race condition patterns
      'race-condition': {
        description: 'Potential race condition detected',
        severity: 'warning',
        confidence: 0.8,
        patterns: [
          {
            type: 'async-await-misuse',
            pattern: /async\s+function\s*\w*\s*\([^)]*\)\s*\{\s*[^}]*await\s+[^;]+;\s*[^}]*\}/gs,
            message: 'Async function with await but no proper error handling'
          },
          {
            type: 'promise-chain-missing-catch',
            pattern: /\.then\s*\([^)]*\)\s*(?!\.catch)/g,
            message: 'Promise chain missing error handling (.catch)'
          }
        ]
      },

      // Memory leak patterns
      'memory-leak': {
        description: 'Potential memory leak detected',
        severity: 'warning',
        confidence: 0.75,
        patterns: [
          {
            type: 'event-listener-no-removal',
            pattern: /addEventListener\s*\([^)]*\)\s*(?!.*removeEventListener)/g,
            message: 'Event listener added but no removal mechanism visible'
          },
          {
            type: 'setinterval-no-clear',
            pattern: /setInterval\s*\([^)]*\)\s*(?!.*clearInterval)/g,
            message: 'setInterval called but no clearInterval visible'
          }
        ]
      },

      // Null/undefined access patterns
      'null-access': {
        description: 'Potential null/undefined access',
        severity: 'warning',
        confidence: 0.85,
        patterns: [
          {
            type: 'optional-chaining-missing',
            pattern: /(\w+\.\w+\.\w+)/g,
            message: 'Deep property access without null checks'
          },
          {
            type: 'array-access-no-bounds-check',
            pattern: /(\w+)\[(\w+)\]/g,
            message: 'Array access without bounds checking'
          }
        ]
      },

      // Type safety issues
      'type-safety': {
        description: 'Potential type safety issue',
        severity: 'warning',
        confidence: 0.8,
        patterns: [
          {
            type: 'loose-equality',
            pattern: /==\s*[^=]/g,
            message: 'Use strict equality (===) instead of loose equality (==)'
          },
          {
            type: 'loose-inequality',
            pattern: /!=\s*[^=]/g,
            message: 'Use strict inequality (!==) instead of loose inequality (!=)'
          }
        ]
      },

      // Performance anti-patterns
      'performance': {
        description: 'Performance anti-pattern detected',
        severity: 'warning',
        confidence: 0.7,
        patterns: [
          {
            type: 'nested-loops',
            pattern: /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)/g,
            message: 'Nested loops detected - consider optimization'
          },
          {
            type: 'string-concatenation-in-loop',
            pattern: /for\s*\([^)]*\)\s*\{[^}]*\+\s*=/g,
            message: 'String concatenation in loop - consider using array.join()'
          }
        ]
      }
    };
  }

  /**
   * Analyze code using ML-based analysis
   * @param {Object} ast - Abstract Syntax Tree
   * @param {string} content - Raw file content
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Promise<Array>} Array of ML-based warnings
   */
  async analyze(ast, content, filePath) {
    if (!this.config.enabled || !this.model) {
      return [];
    }

    const results = [];

    try {
      if (this.model.type === 'heuristic') {
        const heuristicResults = this.analyzeWithHeuristics(content, filePath);
        results.push(...heuristicResults);
      } else {
        // TODO: Implement actual ML model inference
        const mlResults = await this.analyzeWithMLModel(ast, content, filePath);
        results.push(...mlResults);
      }
    } catch (error) {
      console.warn('ML analysis failed:', error.message);
    }

    // Limit warnings per file
    return results.slice(0, this.config.maxWarningsPerFile);
  }

  /**
   * Analyze code using heuristic patterns
   * @param {string} content - Raw file content
   * @param {string} filePath - Path to the file
   * @returns {Array} Array of heuristic-based warnings
   */
  analyzeWithHeuristics(content, filePath) {
    const results = [];
    const lines = content.split('\n');

    for (const [category, categoryConfig] of Object.entries(this.model.patterns)) {
      for (const pattern of categoryConfig.patterns) {
        const matches = this.findPatternMatches(pattern.pattern, content, lines);

        for (const match of matches) {
          if (match.confidence >= this.config.confidenceThreshold) {
            results.push({
              type: 'ml',
              severity: categoryConfig.severity,
              file: filePath,
              line: match.line,
              column: match.column,
              message: pattern.message,
              rule: `${category}-${pattern.type}`,
              confidence: match.confidence,
              category: category,
              suggestion: this.getMLSuggestion(category, pattern.type)
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Find pattern matches in content
   * @param {RegExp} pattern - Pattern to search for
   * @param {string} content - File content
   * @param {Array} lines - Array of lines
   * @returns {Array} Array of matches with line/column info
   */
  findPatternMatches(pattern, content, lines) {
    const matches = [];
    let match;

    // Reset regex state
    pattern.lastIndex = 0;

    while ((match = pattern.exec(content)) !== null) {
      const { line, column } = this.getLineAndColumn(content, match.index);

      // Calculate confidence based on context
      const confidence = this.calculateConfidence(match, lines[line - 1], line);

      matches.push({
        line,
        column,
        confidence,
        match: match[0]
      });
    }

    return matches;
  }

  /**
   * Calculate confidence score for a match
   * @param {Object} match - Regex match object
   * @param {string} lineContent - Content of the line
   * @param {number} lineNumber - Line number
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(match, lineContent, lineNumber) {
    let confidence = 0.5; // Base confidence

    // Increase confidence for more specific patterns
    if (match[0].length > 20) {
      confidence += 0.2;
    }

    // Decrease confidence if line has disable comments
    if (lineContent.includes('// outrider-disable') || 
        lineContent.includes('// eslint-disable')) {
      confidence -= 0.3;
    }

    // Increase confidence for common bug patterns
    if (match[0].includes('setInterval') || match[0].includes('addEventListener')) {
      confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get line and column numbers from character index
   * @param {string} content - File content
   * @param {number} index - Character index
   * @returns {Object} Line and column numbers
   */
  getLineAndColumn(content, index) {
    const beforeMatch = content.substring(0, index);
    const lines = beforeMatch.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    return { line, column };
  }

  /**
   * Get suggestion for ML-detected issues
   * @param {string} category - Issue category
   * @param {string} type - Issue type
   * @returns {string} Suggestion for fixing
   */
  getMLSuggestion(category, type) {
    const suggestions = {
      'race-condition': {
        'async-await-misuse': 'Wrap await calls in try-catch blocks',
        'promise-chain-missing-catch': 'Add .catch() to handle promise rejections'
      },
      'memory-leak': {
        'event-listener-no-removal': 'Store reference to listener and remove it when no longer needed',
        'setinterval-no-clear': 'Store interval ID and call clearInterval when appropriate'
      },
      'null-access': {
        'optional-chaining-missing': 'Use optional chaining (?.) or add null checks',
        'array-access-no-bounds-check': 'Check array bounds before accessing elements'
      },
      'type-safety': {
        'loose-equality': 'Replace == with === for strict equality comparison',
        'loose-inequality': 'Replace != with !== for strict inequality comparison'
      },
      'performance': {
        'nested-loops': 'Consider using more efficient algorithms or data structures',
        'string-concatenation-in-loop': 'Use array.push() and array.join() instead of string concatenation'
      }
    };

    return suggestions[category]?.[type] || 'Review and optimize according to best practices';
  }

  /**
   * Analyze code using actual ML model (future implementation)
   * @param {Object} ast - Abstract Syntax Tree
   * @param {string} content - Raw file content
   * @param {string} filePath - Path to the file
   * @returns {Promise<Array>} Array of ML-based warnings
   */
  async analyzeWithMLModel(ast, content, filePath) {
    // TODO: Implement actual ML model inference
    // This would involve:
    // 1. Feature extraction from AST
    // 2. Model inference
    // 3. Post-processing of results

    return [];
  }

  /**
   * Get model information
   * @returns {Object} Model information
   */
  getModelInfo() {
    return {
      type: this.model?.type || 'none',
      version: this.model?.version || 'unknown',
      enabled: this.config.enabled,
      confidenceThreshold: this.config.confidenceThreshold
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

module.exports = {
  MLAnalyzer
};
