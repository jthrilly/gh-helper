#!/usr/bin/env node

import chalk from 'chalk';
import { checkClaudeAvailability } from '../lib/claude.ts';

export async function runAuth(args: string[]): Promise<void> {
  try {
    if (args.includes('--check') || args.includes('-k')) {
      const claudeCheck = await checkClaudeAvailability();
      if (claudeCheck.available) {
        console.log(chalk.green('Claude Code is authenticated and available'));
        console.log(chalk.gray('Using your Claude subscription for commit message generation'));
      } else {
        console.log(chalk.yellow('Claude Code authentication required'));
        console.log(chalk.red(`Error: ${claudeCheck.error}`));
        console.log(chalk.gray('Run: claude login'));
      }
      process.exit(0);
    }

    if (args.includes('--login') || args.includes('-l')) {
      console.log(chalk.cyan('To authenticate with Claude Code, run:'));
      console.log(chalk.white('claude login'));
      console.log(chalk.gray('This will open your browser to authenticate with your Claude subscription.'));
      process.exit(0);
    }

    console.log(chalk.cyan('GitHub Helper - Claude Authentication'));
    console.log(chalk.gray('This tool now uses Claude Code CLI with your Claude subscription.\n'));

    const claudeCheck = await checkClaudeAvailability();
    if (claudeCheck.available) {
      console.log(chalk.green('✓ Claude Code is authenticated and ready'));
      console.log(chalk.gray('You can now use: gh helper commit'));
    } else {
      console.log(chalk.yellow('⚠ Claude Code authentication required'));
      console.log(chalk.red(`Error: ${claudeCheck.error}`));
      console.log('\nTo authenticate:');
      console.log(chalk.white('1. Run: claude login'));
      console.log(chalk.gray('2. Follow the browser authentication process'));
      console.log(chalk.gray('3. Use your Claude Pro/Max subscription credentials'));
    }

    console.log('\n' + chalk.cyan('Available commands:'));
    console.log('  gh helper auth --check    Check authentication status');
    console.log('  gh helper auth --login    Show login instructions');

    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }
}