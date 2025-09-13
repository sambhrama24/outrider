#!/usr/bin/env node

/**
 * @file This is the main entry point for the Outrider CLI.
 * It's responsible for parsing command-line arguments and
 * directing the user to the correct functionality.
 */

const yargs = require('yargs');
const chalk = require('chalk');
const { scanCommand } = require('./src/commands/scan');
const { fixCommand } = require('./src/commands/fix');
const { version } = require('./package.json');

// The main CLI command. We use yargs to handle argument parsing.
yargs
  .scriptName('outrider')
  .usage(`\nUsage: $0 <command> [options]`)
  .command({
    command: '$0',
    describe: 'The core command for the Outrider CLI.',
    handler: () => {
      console.log(chalk.green('Welcome to Outrider, your predictive code analysis tool!'));
      console.log(chalk.yellow('\nGet started by running `outrider --help` to see available commands.'));
      console.log(chalk.cyan('\nTry: outrider scan <directory> to analyze your code.'));
    }
  })
  .command({
    command: 'scan <directory>',
    describe: 'Scan a directory for code analysis and bug detection',
    builder: {
      config: {
        alias: 'c',
        describe: 'Path to configuration file',
        type: 'string',
        default: './outrider.json'
      },
      output: {
        alias: 'o',
        describe: 'Output format (console, json, csv)',
        type: 'string',
        choices: ['console', 'json', 'csv'],
        default: 'console'
      },
      verbose: {
        alias: 'v',
        describe: 'Enable verbose output',
        type: 'boolean',
        default: false
      }
    },
    handler: scanCommand
  })
  .command({
    command: 'init',
    describe: 'Initialize Outrider configuration in the current directory',
    handler: () => {
      console.log(chalk.green('Initializing Outrider configuration...'));
      // TODO: Implement configuration initialization
      console.log(chalk.yellow('Configuration initialization coming soon!'));
    }
  })
  .command({
    command: 'rules',
    describe: 'List available analysis rules',
    handler: () => {
      console.log(chalk.green('Available Analysis Rules:'));
      // TODO: Implement rules listing
      console.log(chalk.yellow('Rules listing coming soon!'));
    }
  })
  .command({
    command: 'fix <directory>',
    describe: 'Automatically fix simple code issues',
    builder: {
      config: {
        alias: 'c',
        describe: 'Path to configuration file',
        type: 'string',
        default: './outrider.json'
      },
      dryRun: {
        alias: 'd',
        describe: 'Show what would be fixed without making changes',
        type: 'boolean',
        default: false
      },
      backup: {
        alias: 'b',
        describe: 'Create backup files before fixing',
        type: 'boolean',
        default: true
      }
    },
    handler: fixCommand
  })
  .demandCommand(1, chalk.red('Please specify a command. Use --help for more information.'))
  .help('h')
  .alias('h', 'help')
  .version('version', chalk.cyan(`Outrider CLI v${version}`))
  .alias('version', 'v')
  .epilog(chalk.gray('For more information, visit: https://github.com/your-username/outrider-cli'))
  .parse();
