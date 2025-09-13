/**
 * Output Formatter for Outrider
 * Handles different output formats for analysis results
 */

class OutputFormatter {
  constructor(format = 'console') {
    this.format = format;
    this.formatters = {
      console: this.formatConsole,
      json: this.formatJSON,
      csv: this.formatCSV
    };
  }

  /**
   * Format results according to specified format
   * @param {Array} results - Analysis results
   * @returns {string} Formatted output
   */
  format(results) {
    const formatter = this.formatters[this.format];
    if (!formatter) {
      throw new Error(`Unsupported output format: ${this.format}`);
    }

    return formatter.call(this, results);
  }

  /**
   * Format results for console output
   * @param {Array} results - Analysis results
   * @returns {string} Console-formatted output
   */
  formatConsole(results) {
    if (results.length === 0) {
      return 'No issues found! Your code looks great.';
    }

    let output = '\n🔍 Analysis Results:\n';

    // Group results by file
    const resultsByFile = this.groupResultsByFile(results);

    for (const [file, fileResults] of Object.entries(resultsByFile)) {
      output += `\n${file}:\n`;

      fileResults.forEach(result => {
        const severityIcon = result.severity === 'error' ? '❌' : '⚠️';
        output += `  ${severityIcon} ${result.severity.toUpperCase()} Line ${result.line}:${result.column}\n`;
        output += `     ${result.message}\n`;

        if (result.rule) {
          output += `     Rule: ${result.rule}\n`;
        }

        if (result.suggestion) {
          output += `     ${result.suggestion}\n`;
        }

        if (result.confidence) {
          output += `     Confidence: ${Math.round(result.confidence * 100)}%\n`;
        }

        output += '\n';
      });
    }

    return output;
  }

  /**
   * Format results for JSON output
   * @param {Array} results - Analysis results
   * @returns {string} JSON-formatted output
   */
  formatJSON(results) {
    const output = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(results),
      results: results.map(result => ({
        type: result.type,
        severity: result.severity,
        file: result.file,
        line: result.line,
        column: result.column,
        message: result.message,
        rule: result.rule,
        code: result.code,
        suggestion: result.suggestion,
        confidence: result.confidence,
        category: result.category
      }))
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Format results for CSV output
   * @param {Array} results - Analysis results
   * @returns {string} CSV-formatted output
   */
  formatCSV(results) {
    if (results.length === 0) {
      return 'File,Line,Column,Severity,Type,Rule,Message,Suggestion,Confidence,Category\n';
    }

    const headers = [
      'File', 'Line', 'Column', 'Severity', 'Type', 'Rule',
      'Message', 'Suggestion', 'Confidence', 'Category'
    ];

    const csvRows = [headers.join(',')];

    results.forEach(result => {
      const row = [
        this.escapeCSV(result.file || ''),
        result.line || '',
        result.column || '',
        result.severity || '',
        result.type || '',
        result.rule || '',
        this.escapeCSV(result.message || ''),
        this.escapeCSV(result.suggestion || ''),
        result.confidence ? Math.round(result.confidence * 100) : '',
        result.category || ''
      ];

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Escape CSV values
   * @param {string} value - Value to escape
   * @returns {string} Escaped value
   */
  escapeCSV(value) {
    if (typeof value !== 'string') {
      return value;
    }

    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    const escaped = value.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
      return `"${escaped}"`;
    }

    return escaped;
  }

  /**
   * Group results by file
   * @param {Array} results - Analysis results
   * @returns {Object} Results grouped by file
   */
  groupResultsByFile(results) {
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
  generateSummary(results) {
    const summary = {
      total: results.length,
      errors: 0,
      warnings: 0,
      byType: {},
      bySeverity: {},
      byCategory: {},
      riskScore: 0
    };

    results.forEach(result => {
      // Count by severity
      summary.bySeverity[result.severity] = (summary.bySeverity[result.severity] || 0) + 1;

      if (result.severity === 'error') {
        summary.errors++;
      } else if (result.severity === 'warning') {
        summary.warnings++;
      }

      // Count by type
      summary.byType[result.type] = (summary.byType[result.type] || 0) + 1;

      // Count by category (for ML results)
      if (result.category) {
        summary.byCategory[result.category] = (summary.byCategory[result.category] || 0) + 1;
      }
    });

    // Calculate risk score (0-100)
    if (results.length > 0) {
      const errorWeight = 3;
      const warningWeight = 1;
      const weightedScore = (summary.errors * errorWeight) + (summary.warnings * warningWeight);
      summary.riskScore = Math.min(100, Math.round((weightedScore / results.length) * 20));
    }

    return summary;
  }

  /**
   * Get available output formats
   * @returns {Array} Array of available formats
   */
  static getAvailableFormats() {
    return ['console', 'json', 'csv'];
  }

  /**
   * Validate output format
   * @param {string} format - Format to validate
   * @returns {boolean} Whether format is valid
   */
  static isValidFormat(format) {
    return this.getAvailableFormats().includes(format);
  }

  /**
   * Get format description
   * @param {string} format - Format name
   * @returns {string} Format description
   */
  static getFormatDescription(format) {
    const descriptions = {
      console: 'Human-readable console output',
      json: 'Structured JSON output for programmatic processing',
      csv: 'Comma-separated values for spreadsheet import'
    };

    return descriptions[format] || 'Unknown format';
  }
}

module.exports = {
  OutputFormatter
};
