#!/usr/bin/env node

import chalk from 'chalk';
import { runCommit } from './commands/commit.ts';
import { runAuth } from './commands/auth.ts';

const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);

function printUsage(): void {
  console.log(chalk.cyan('GitHub Helper - AI-Assisted Commit Tool\n'));
  console.log('Usage: gh helper <command>\n');
  console.log('Commands:');
  console.log('  commit           Generate and create a commit with AI-generated message');
  console.log('  auth             Check Claude Code authentication status');
  console.log('  auth --check     Check if Claude Code is authenticated');
  console.log('  auth --login     Show Claude Code login instructions');
  console.log('  help             Show this help message');
  console.log('\nExamples:');
  console.log('  gh helper auth      # Check Claude Code authentication');
  console.log('  gh helper commit    # Create a commit with AI-generated message');
  console.log('\nNote: This tool uses Claude Code CLI with your Claude subscription.');
  console.log('No API key required - authenticate with: claude login');
}

async function main(): Promise<void> {
  try {
    switch (command) {
      case 'commit':
        await runCommit();
        break;

      case 'auth':
        await runAuth(commandArgs);
        break;

      case 'help':
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;

      case undefined:
        console.error(chalk.red('Error: No command specified\n'));
        printUsage();
        process.exit(1);
        break;

      default:
        console.error(chalk.red(`Error: Unknown command "${command}"\n`));
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }
}

main();