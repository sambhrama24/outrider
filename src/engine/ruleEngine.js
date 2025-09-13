/**
 * Rule Engine for traditional code analysis
 * Handles configurable rules for catching common anti-patterns and style violations
 */

class RuleEngine {
  constructor(rules = {}) {
    this.rules = this.initializeRules(rules);
    this.enabledRules = this.getEnabledRules();
  }

  /**
   * Initialize rules with defaults
   * @param {Object} customRules - Custom rule configuration
   * @returns {Object} Complete rule set
   */
  initializeRules(customRules) {
    const defaultRules = {
      // Common JavaScript/TypeScript anti-patterns
      'no-unused-variables': {
        name: 'no-unused-variables',
        enabled: false,
        severity: 'warning',
        description: 'Variables that are declared but never used',
        pattern: /const\s+(\w+)\s*=\s*[^;]+;?(?:\s*\/\/.*)?$/gm
      },
      'no-console-log': {
        name: 'no-console-log',
        enabled: true,
        severity: 'warning',
        description: 'Console.log statements should be removed in production',
        pattern: /console\.(log|warn|error|info)\(/g
      },
      'no-debugger': {
        name: 'no-debugger',
        enabled: true,
        severity: 'error',
        description: 'Debugger statements should not be in production code',
        pattern: /debugger\s*;?/g
      },
      'no-eval': {
        name: 'no-eval',
        enabled: true,
        severity: 'error',
        description: 'Eval can be dangerous and should be avoided',
        pattern: /eval\s*\(/g
      },
      'no-var': {
        name: 'no-var',
        enabled: true,
        severity: 'warning',
        description: 'Use const or let instead of var',
        pattern: /\bvar\s+\w+/g
      },
      'prefer-const': {
        name: 'prefer-const',
        enabled: true,
        severity: 'warning',
        description: 'Use const for variables that are never reassigned',
        pattern: /let\s+(\w+)\s*=\s*([^;]+);(?:\s*\/\/.*)?$/gm
      },
      'no-empty-blocks': {
        name: 'no-empty-blocks',
        enabled: true,
        severity: 'warning',
        description: 'Empty blocks should be avoided',
        pattern: /\{\s*\}/g
      },
      'no-multiple-empty-lines': {
        name: 'no-multiple-empty-lines',
        enabled: true,
        severity: 'warning',
        description: 'Multiple consecutive empty lines should be avoided',
        pattern: /\n\s*\n\s*\n/g
      },
      'no-trailing-spaces': {
        name: 'no-trailing-spaces',
        enabled: true,
        severity: 'warning',
        description: 'Trailing spaces should be removed',
        pattern: /[ \t]+$/gm
      },
      'no-mixed-spaces-and-tabs': {
        name: 'no-mixed-spaces-and-tabs',
        enabled: true,
        severity: 'warning',
        description: 'Mixed spaces and tabs should be avoided',
        pattern: /^[ \t]*\t[ \t]*[^ \t]/gm
      }
    };

    // Merge custom rules with defaults
    return { ...defaultRules, ...customRules };
  }

  /**
   * Get enabled rules
   * @returns {Array} Array of enabled rule names
   */
  getEnabledRules() {
    return Object.keys(this.rules).filter(ruleName =>
      this.rules[ruleName].enabled !== false
    );
  }

  /**
   * Analyze code using rule-based analysis
   * @param {Object} ast - Abstract Syntax Tree
   * @param {string} content - Raw file content
   * @param {string} filePath - Path to the file being analyzed
   * @returns {Promise<Array>} Array of rule violations
   */
  async analyze(ast, content, filePath) {
    const results = [];

    for (const ruleName of this.enabledRules) {
      const rule = this.rules[ruleName];
      const violations = this.applyRule(rule, ruleName, content, filePath);
      results.push(...violations);
    }

    return results;
  }

  /**
   * Apply a specific rule to the code
   * @param {Object} rule - Rule configuration
   * @param {string} ruleName - Name of the rule
   * @param {string} content - Raw file content
   * @param {string} filePath - Path to the file
   * @returns {Array} Array of violations found
   */
  applyRule(rule, ruleName, content, filePath) {
    const violations = [];

    if (!rule.pattern) {
      return violations;
    }

    let match;
    const lines = content.split('\n');

    // Reset regex state
    rule.pattern.lastIndex = 0;

    while ((match = rule.pattern.exec(content)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      // Find line and column numbers
      const { line, column } = this.getLineAndColumn(content, matchStart);

      // Skip if rule has specific exclusions
      if (this.shouldSkipRule(rule, lines[line - 1], line)) {
        continue;
      }

      violations.push({
        type: 'rule',
        severity: rule.severity,
        file: filePath,
        line: line,
        column: column,
        message: rule.description,
        rule: ruleName,
        code: match[0].trim(),
        suggestion: this.getSuggestion(ruleName, match[0])
      });
    }

    return violations;
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
   * Check if rule should be skipped for this line
   * @param {Object} rule - Rule configuration
   * @param {string} lineContent - Content of the line
   * @param {number} lineNumber - Line number
   * @returns {boolean} Whether to skip the rule
   */
  shouldSkipRule(rule, lineContent, lineNumber) {
    // Skip if line has disable comment
    if (lineContent.includes('// eslint-disable') || 
        lineContent.includes('// outrider-disable')) {
      return true;
    }

    // Skip if rule has specific exclusions
    if (rule.exclude && rule.exclude.some(pattern =>
      lineContent.match(pattern))) {
      return true;
    }

    return false;
  }

  /**
   * Get suggestion for fixing the violation
   * @param {string} ruleName - Name of the rule
   * @param {string} code - Violating code
   * @returns {string} Suggestion for fixing
   */
  getSuggestion(ruleName, code) {
    const suggestions = {
      'no-console-log': 'Remove console.log statement or use a proper logging library',
      'no-debugger': 'Remove debugger statement',
      'no-eval': 'Use alternative approaches like JSON.parse or Function constructor',
      'no-var': 'Replace with const or let',
      'prefer-const': 'Change let to const if variable is never reassigned',
      'no-empty-blocks': 'Add content to block or remove if unnecessary',
      'no-multiple-empty-lines': 'Reduce to maximum of one empty line',
      'no-trailing-spaces': 'Remove trailing spaces',
      'no-mixed-spaces-and-tabs': 'Use consistent indentation (spaces or tabs)'
    };

    return suggestions[ruleName] || 'Review and fix according to rule description';
  }

  /**
   * Get all available rules
   * @returns {Object} All rules with their configurations
   */
  getRules() {
    return this.rules;
  }

  /**
   * Enable or disable a rule
   * @param {string} ruleName - Name of the rule
   * @param {boolean} enabled - Whether to enable the rule
   */
  setRuleEnabled(ruleName, enabled) {
    if (this.rules[ruleName]) {
      this.rules[ruleName].enabled = enabled;
      this.enabledRules = this.getEnabledRules();
    }
  }

  /**
   * Add a custom rule
   * @param {string} ruleName - Name of the rule
   * @param {Object} ruleConfig - Rule configuration
   */
  addRule(ruleName, ruleConfig) {
    this.rules[ruleName] = {
      name: ruleName,
      enabled: true,
      severity: 'warning',
      ...ruleConfig
    };
    this.enabledRules = this.getEnabledRules();
  }
}

module.exports = {
  RuleEngine
};
