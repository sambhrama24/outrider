/**
 * Configuration Loader for Outrider
 * Handles loading and validating configuration files
 */

const fs = require('fs');
const path = require('path');

class ConfigLoader {
  /**
   * Load configuration from file or create default
   * @param {string} configPath - Path to configuration file
   * @returns {Promise<Object>} Configuration object
   */
  static async load(configPath) {
    try {
      // Try to load existing config
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        return this.validateAndMerge(config);
      }

      // Create default config if none exists
      const defaultConfig = this.getDefaultConfig();

      // Save default config to file
      await this.saveConfig(configPath, defaultConfig);

      return defaultConfig;
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}:`, error.message);
      console.log('Using default configuration...');
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration
   */
  static getDefaultConfig() {
    return {
      version: '1.0.0',
      fileTypes: ['js', 'ts', 'jsx', 'tsx'],
      ignorePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/*.min.js',
        '**/*.bundle.js'
      ],
      rules: {
        // Rule-based analysis configuration
        'no-console-log': {
          enabled: true,
          severity: 'warning'
        },
        'no-debugger': {
          enabled: true,
          severity: 'error'
        },
        'no-eval': {
          enabled: true,
          severity: 'error'
        },
        'no-var': {
          enabled: true,
          severity: 'warning'
        },
        'prefer-const': {
          enabled: true,
          severity: 'warning'
        },
        'no-unused-variables': {
          enabled: true,
          severity: 'warning'
        }
      },
      ml: {
        // ML-based analysis configuration
        enabled: true,
        confidenceThreshold: 0.7,
        maxWarningsPerFile: 10,
        categories: {
          'race-condition': {
            enabled: true,
            severity: 'warning'
          },
          'memory-leak': {
            enabled: true,
            severity: 'warning'
          },
          'null-access': {
            enabled: true,
            severity: 'warning'
          },
          'type-safety': {
            enabled: true,
            severity: 'warning'
          },
          'performance': {
            enabled: true,
            severity: 'warning'
          }
        }
      },
      output: {
        // Output configuration
        format: 'console',
        includeStats: true,
        includeSuggestions: true,
        maxIssuesPerFile: 50
      },
      thresholds: {
        // Quality thresholds
        maxWarnings: 100,
        maxErrors: 10,
        minRiskScore: 70
      }
    };
  }

  /**
   * Validate and merge configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validated and merged configuration
   */
  static validateAndMerge(config) {
    const defaultConfig = this.getDefaultConfig();

    // Deep merge with validation
    const mergedConfig = this.deepMerge(defaultConfig, config);

    // Validate critical fields
    this.validateConfig(mergedConfig);

    return mergedConfig;
  }

  /**
   * Deep merge objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  static deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   */
  static validateConfig(config) {
    // Validate version
    if (!config.version || typeof config.version !== 'string') {
      throw new Error('Invalid configuration: version must be a string');
    }

    // Validate file types
    if (!Array.isArray(config.fileTypes) || config.fileTypes.length === 0) {
      throw new Error('Invalid configuration: fileTypes must be a non-empty array');
    }

    // Validate rules
    if (config.rules && typeof config.rules !== 'object') {
      throw new Error('Invalid configuration: rules must be an object');
    }

    // Validate ML config
    if (config.ml) {
      if (typeof config.ml.enabled !== 'boolean') {
        throw new Error('Invalid configuration: ml.enabled must be a boolean');
      }

      if (typeof config.ml.confidenceThreshold !== 'number' ||
          config.ml.confidenceThreshold < 0 ||
          config.ml.confidenceThreshold > 1) {
        throw new Error('Invalid configuration: ml.confidenceThreshold must be between 0 and 1');
      }
    }

    // Validate thresholds
    if (config.thresholds) {
      if (typeof config.thresholds.maxWarnings !== 'number' || config.thresholds.maxWarnings < 0) {
        throw new Error('Invalid configuration: thresholds.maxWarnings must be a positive number');
      }

      if (typeof config.thresholds.maxErrors !== 'number' || config.thresholds.maxErrors < 0) {
        throw new Error('Invalid configuration: thresholds.maxErrors must be a positive number');
      }

      if (typeof config.thresholds.minRiskScore !== 'number' ||
          config.thresholds.minRiskScore < 0 ||
          config.thresholds.minRiskScore > 100) {
        throw new Error('Invalid configuration: thresholds.minRiskScore must be between 0 and 100');
      }
    }
  }

  /**
   * Save configuration to file
   * @param {string} configPath - Path to save configuration
   * @param {Object} config - Configuration to save
   * @returns {Promise<void>}
   */
  static async saveConfig(configPath, config) {
    try {
      // Ensure directory exists
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Save configuration
      const configContent = JSON.stringify(config, null, 2);
      fs.writeFileSync(configPath, configContent, 'utf8');

      console.log(`Configuration saved to: ${configPath}`);
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Create configuration file in current directory
   * @param {string} configPath - Path for configuration file
   * @returns {Promise<Object>} Created configuration
   */
  static async createConfig(configPath = './outrider.json') {
    const config = this.getDefaultConfig();
    await this.saveConfig(configPath, config);
    return config;
  }

  /**
   * Update configuration
   * @param {string} configPath - Path to configuration file
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated configuration
   */
  static async updateConfig(configPath, updates) {
    const currentConfig = await this.load(configPath);
    const updatedConfig = this.deepMerge(currentConfig, updates);

    // Validate updated config
    this.validateConfig(updatedConfig);

    // Save updated config
    await this.saveConfig(configPath, updatedConfig);

    return updatedConfig;
  }

  /**
   * Get configuration schema
   * @returns {Object} Configuration schema
   */
  static getConfigSchema() {
    return {
      type: 'object',
      properties: {
        version: { type: 'string' },
        fileTypes: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1
        },
        ignorePatterns: {
          type: 'array',
          items: { type: 'string' }
        },
        rules: { type: 'object' },
        ml: { type: 'object' },
        output: { type: 'object' },
        thresholds: { type: 'object' }
      },
      required: ['version', 'fileTypes']
    };
  }
}

module.exports = {
  ConfigLoader
};
