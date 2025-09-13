/**
 * File Analyzer for parsing and analyzing different file types
 * Handles JavaScript, TypeScript, JSX, and TSX files
 */

const esprima = require('esprima');
const fs = require('fs');
const path = require('path');

class FileAnalyzer {
  constructor() {
    this.supportedExtensions = ['.js', '.ts', '.jsx', '.tsx'];
    this.parsers = {
      '.js': this.parseJavaScript,
      '.jsx': this.parseJavaScript,
      '.ts': this.parseTypeScript,
      '.tsx': this.parseTypeScript
    };
  }

  /**
   * Parse a file and return its AST
   * @param {string} content - File content
   * @param {string} extension - File extension
   * @returns {Promise<Object>} Abstract Syntax Tree
   */
  async parseFile(content, extension) {
    try {
      const normalizedExtension = extension.toLowerCase();

      if (!this.supportedExtensions.includes(normalizedExtension)) {
        throw new Error(`Unsupported file type: ${extension}`);
      }

      const parser = this.parsers[normalizedExtension];
      if (!parser) {
        throw new Error(`No parser available for: ${extension}`);
      }

      return await parser(content, extension);
    } catch (error) {
      // Fallback to basic parsing if advanced parsing fails
      return this.parseBasic(content, extension);
    }
  }

  /**
   * Parse JavaScript/JSX files
   * @param {string} content - File content
   * @param {string} extension - File extension
   * @returns {Promise<Object>} AST object
   */
  async parseJavaScript(content, extension) {
    try {
      const options = {
        jsx: extension === '.jsx',
        range: true,
        loc: true,
        comment: true,
        tokens: true
      };

      return esprima.parseModule(content, options);
    } catch (error) {
      // Try parsing as script if module parsing fails
      try {
        return esprima.parseScript(content, {
          jsx: extension === '.jsx',
          range: true,
          loc: true,
          comment: true,
          tokens: true
        });
      } catch (scriptError) {
        throw new Error(`Failed to parse JavaScript: ${scriptError.message}`);
      }
    }
  }

  /**
   * Parse TypeScript/TSX files
   * @param {string} content - File content
   * @param {string} extension - File extension
   * @returns {Promise<Object>} AST object
   */
  async parseTypeScript(content, extension) {
    try {
      // For MVP, we'll treat TypeScript as JavaScript
      // In future versions, we'll integrate with TypeScript compiler API
      return await this.parseJavaScript(content, extension);
    } catch (error) {
      throw new Error(`Failed to parse TypeScript: ${error.message}`);
    }
  }

  /**
   * Basic parsing fallback
   * @param {string} content - File content
   * @param {string} extension - File extension
   * @returns {Object} Basic AST-like structure
   */
  parseBasic(content, extension) {
    const lines = content.split('\n');

    return {
      type: 'Program',
      body: [],
      sourceType: 'module',
      loc: {
        start: { line: 1, column: 1 },
        end: { line: lines.length, column: lines[lines.length - 1].length + 1 }
      },
      range: [0, content.length],
      _basicParse: true,
      _lines: lines,
      _content: content
    };
  }

  /**
   * Extract basic file statistics
   * @param {Object} ast - Abstract Syntax Tree
   * @param {string} content - File content
   * @returns {Object} File statistics
   */
  extractFileStats(ast, content) {
    const lines = content.split('\n');
    const stats = {
      totalLines: lines.length,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      functions: 0,
      classes: 0,
      imports: 0,
      exports: 0
    };

    // Count blank lines
    stats.blankLines = lines.filter(line => line.trim() === '').length;

    // Count comment lines (basic detection)
    stats.commentLines = lines.filter(line =>
      line.trim().startsWith('//') ||
      line.trim().startsWith('/*') ||
      line.trim().startsWith('*')
    ).length;

    // Calculate code lines
    stats.codeLines = stats.totalLines - stats.blankLines - stats.commentLines;

    // Extract AST-based statistics if available
    if (ast && !ast._basicParse) {
      stats.functions = this.countFunctions(ast);
      stats.classes = this.countClasses(ast);
      stats.imports = this.countImports(ast);
      stats.exports = this.countExports(ast);
    }

    return stats;
  }

  /**
   * Count functions in AST
   * @param {Object} ast - Abstract Syntax Tree
   * @returns {number} Function count
   */
  countFunctions(ast) {
    let count = 0;

    const traverse = (node) => {
      if (node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression') {
        count++;
      }

      // Traverse child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(child => traverse(child));
          } else {
            traverse(node[key]);
          }
        }
      }
    };

    traverse(ast);
    return count;
  }

  /**
   * Count classes in AST
   * @param {Object} ast - Abstract Syntax Tree
   * @returns {number} Class count
   */
  countClasses(ast) {
    let count = 0;

    const traverse = (node) => {
      if (node.type === 'ClassDeclaration' ||
          node.type === 'ClassExpression') {
        count++;
      }

      // Traverse child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(child => traverse(child));
          } else {
            traverse(node[key]);
          }
        }
      }
    };

    traverse(ast);
    return count;
  }

  /**
   * Count imports in AST
   * @param {Object} ast - Abstract Syntax Tree
   * @returns {number} Import count
   */
  countImports(ast) {
    let count = 0;

    const traverse = (node) => {
      if (node.type === 'ImportDeclaration') {
        count++;
      }

      // Traverse child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(child => traverse(child));
          } else {
            traverse(node[key]);
          }
        }
      }
    };

    traverse(ast);
    return count;
  }

  /**
   * Count exports in AST
   * @param {Object} ast - Abstract Syntax Tree
   * @returns {number} Export count
   */
  countExports(ast) {
    let count = 0;

    const traverse = (node) => {
      if (node.type === 'ExportNamedDeclaration' ||
          node.type === 'ExportDefaultDeclaration' ||
          node.type === 'ExportAllDeclaration') {
        count++;
      }

      // Traverse child nodes
      for (const key in node) {
        if (node[key] && typeof node[key] === 'object') {
          if (Array.isArray(node[key])) {
            node[key].forEach(child => traverse(child));
          } else {
            traverse(node[key]);
          }
        }
      }
    };

    traverse(ast);
    return count;
  }

  /**
   * Check if file is valid for analysis
   * @param {string} filePath - Path to the file
   * @returns {boolean} Whether file is valid
   */
  isValidFile(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(extension);
  }

  /**
   * Get file type information
   * @param {string} filePath - Path to the file
   * @returns {Object} File type information
   */
  getFileTypeInfo(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath);

    return {
      extension,
      baseName,
      isJavaScript: extension === '.js',
      isTypeScript: extension === '.ts',
      isJSX: extension === '.jsx',
      isTSX: extension === '.tsx',
      isModule: extension === '.js' || extension === '.ts',
      isComponent: extension === '.jsx' || extension === '.tsx'
    };
  }
}

module.exports = {
  FileAnalyzer
};
