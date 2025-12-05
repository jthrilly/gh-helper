#!/usr/bin/env node

import chalk from 'chalk';
import { runCommit } from './commands/commit.ts';
import { checkOllamaAvailability } from './lib/ollama.ts';

const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);

function printUsage(): void {
  console.log(chalk.cyan('GitHub Helper - AI-Assisted Commit Tool\n'));
  console.log('Usage: gh helper <command>\n');
  console.log('Commands:');
  console.log('  commit           Generate and create a commit with AI-generated message');
  console.log('  status           Check Ollama availability and models');
  console.log('  help             Show this help message');
  console.log('\nExamples:');
  console.log('  gh helper status    # Check Ollama setup');
  console.log('  gh helper commit    # Create a commit with AI-generated message');
  console.log('\nNote: This tool uses local Ollama models for AI generation.');
  console.log('No API keys or subscriptions needed - everything runs locally!');
}

async function runStatus(): Promise<void> {
  console.log(chalk.cyan('GitHub Helper - Ollama Status\n'));

  const ollamaCheck = await checkOllamaAvailability();
  if (ollamaCheck.available) {
    console.log(chalk.green('✓ Ollama is running and models are available'));
    console.log(chalk.gray('You can now use: gh helper commit'));
  } else {
    console.log(chalk.yellow('⚠ Ollama setup required'));
    console.log(chalk.red(`Error: ${ollamaCheck.error}`));
    console.log('\nTo setup Ollama:');
    console.log(chalk.white('1. Install Ollama: https://ollama.com'));
    console.log(chalk.white('2. Pull required models:'));
    console.log(chalk.gray('   ollama pull llama3:latest'));
    console.log(chalk.gray('   ollama pull llama3.2:latest'));
    console.log(chalk.gray('3. Ensure Ollama is running'));
  }

  process.exit(0);
}

async function main(): Promise<void> {
  try {
    switch (command) {
      case 'commit':
        await runCommit();
        break;

      case 'status':
        await runStatus();
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