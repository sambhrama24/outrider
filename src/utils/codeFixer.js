/**
 * Code Fixer for Outrider
 * Handles automatic fixing of simple code issues
 */

class CodeFixer {
  constructor() {
    this.fixableRules = new Set([
      'no-trailing-spaces',
      'no-multiple-empty-lines',
      'no-mixed-spaces-and-tabs'
    ]);

    this.fixers = {
      'no-trailing-spaces': this.fixTrailingSpaces,
      'no-multiple-empty-lines': this.fixMultipleEmptyLines,
      'no-mixed-spaces-and-tabs': this.fixMixedSpacesAndTabs
    };
  }

  /**
   * Check if a rule is fixable
   * @param {string} ruleName - Name of the rule
   * @returns {boolean} Whether the rule is fixable
   */
  isFixable(ruleName) {
    return this.fixableRules.has(ruleName);
  }

  /**
   * Apply a fix for a specific issue
   * @param {Object} result - Analysis result
   * @param {string} content - File content
   * @returns {Object} Fix result with fixed status and modified content
   */
  applyFix(result, content) {
    const fixer = this.fixers[result.rule];
    if (!fixer) {
      return { fixed: false, content };
    }

    try {
      return fixer.call(this, result, content);
    } catch (error) {
      console.warn(`Failed to apply fix for rule ${result.rule}:`, error.message);
      return { fixed: false, content };
    }
  }

  /**
   * Fix trailing spaces
   * @param {Object} result - Analysis result
   * @param {string} content - File content
   * @returns {Object} Fix result
   */
  fixTrailingSpaces(result, content) {
    const lines = content.split('\n');
    let fixed = false;

    // Fix trailing spaces on the specific line
    if (result.line > 0 && result.line <= lines.length) {
      const lineIndex = result.line - 1;
      const originalLine = lines[lineIndex];
      const fixedLine = originalLine.replace(/[ \t]+$/, '');

      if (fixedLine !== originalLine) {
        lines[lineIndex] = fixedLine;
        fixed = true;
      }
    }

    return {
      fixed,
      content: lines.join('\n')
    };
  }

  /**
   * Fix multiple empty lines
   * @param {Object} result - Analysis result
   * @param {string} content - File content
   * @returns {Object} Fix result
   */
  fixMultipleEmptyLines(result, content) {
    // Replace multiple consecutive empty lines with single empty lines
    const fixedContent = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    return {
      fixed: fixedContent !== content,
      content: fixedContent
    };
  }

  /**
   * Fix mixed spaces and tabs
   * @param {Object} result - Analysis result
   * @param {string} content - File content
   * @returns {Object} Fix result
   */
  fixMixedSpacesAndTabs(result, content) {
    const lines = content.split('\n');
    let fixed = false;

    // Fix mixed spaces and tabs on the specific line
    if (result.line > 0 && result.line <= lines.length) {
      const lineIndex = result.line - 1;
      const originalLine = lines[lineIndex];

      // Convert tabs to spaces (assuming 2-space indentation)
      let fixedLine = originalLine;

      // Find the first non-whitespace character
      const firstNonWhitespace = originalLine.search(/\S/);
      if (firstNonWhitespace > 0) {
        const leadingWhitespace = originalLine.substring(0, firstNonWhitespace);
        const restOfLine = originalLine.substring(firstNonWhitespace);

        // Count tabs and spaces
        const tabCount = (leadingWhitespace.match(/\t/g) || []).length;
        const spaceCount = (leadingWhitespace.match(/ /g) || []).length;

        if (tabCount > 0) {
          // Convert tabs to spaces (2 spaces per tab)
          const newLeadingWhitespace = ' '.repeat(spaceCount + (tabCount * 2));
          fixedLine = newLeadingWhitespace + restOfLine;
          fixed = true;
        }
      }

      if (fixed) {
        lines[lineIndex] = fixedLine;
      }
    }

    return {
      fixed,
      content: lines.join('\n')
    };
  }

  /**
   * Get list of all fixable rules
   * @returns {Array} Array of fixable rule names
   */
  getFixableRules() {
    return Array.from(this.fixableRules);
  }

  /**
   * Add a new fixable rule
   * @param {string} ruleName - Name of the rule
   * @param {Function} fixer - Fix function for the rule
   */
  addFixableRule(ruleName, fixer) {
    this.fixableRules.add(ruleName);
    this.fixers[ruleName] = fixer;
  }

  /**
   * Remove a fixable rule
   * @param {string} ruleName - Name of the rule
   */
  removeFixableRule(ruleName) {
    this.fixableRules.delete(ruleName);
    delete this.fixers[ruleName];
  }

  /**
   * Get fix description for a rule
   * @param {string} ruleName - Name of the rule
   * @returns {string} Description of what the fix does
   */
  getFixDescription(ruleName) {
    const descriptions = {
      'no-trailing-spaces': 'Removes trailing spaces and tabs from lines',
      'no-multiple-empty-lines': 'Reduces multiple consecutive empty lines to maximum of two',
      'no-mixed-spaces-and-tabs': 'Converts tabs to spaces for consistent indentation'
    };

    return descriptions[ruleName] || 'No description available';
  }

  /**
   * Check if content would be modified by fixing
   * @param {Array} results - Analysis results
   * @param {string} content - File content
   * @returns {boolean} Whether any fixes would modify the content
   */
  wouldModifyContent(results, content) {
    for (const result of results) {
      if (this.isFixable(result.rule)) {
        const fixResult = this.applyFix(result, content);
        if (fixResult.fixed) {
          return true;
        }
      }
    }
    return false;
  }
}

module.exports = {
  CodeFixer
};
