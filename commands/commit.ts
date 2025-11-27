#!/usr/bin/env node

import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { generateCommitMessage, checkClaudeAvailability } from '../lib/claude.ts';
import { getStagedDiff, stageAllChanges, commit, push, hasChanges, isGitRepository } from '../lib/git.ts';

const question = (query: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

export async function runCommit(): Promise<void> {
  try {
    if (!await isGitRepository()) {
      console.error(chalk.red('Error: Not a git repository'));
      process.exit(1);
    }

    const claudeCheck = await checkClaudeAvailability();
    if (!claudeCheck.available) {
      console.error(chalk.red(`Error: ${claudeCheck.error}`));
      console.error(chalk.yellow('Please ensure Claude Code is installed and authenticated.'));
      console.error(chalk.gray('Run: claude login'));
      process.exit(1);
    }

    const spinner = ora('Checking for changes...').start();

    if (!await hasChanges()) {
      spinner.fail('No changes to commit');
      process.exit(0);
    }

    spinner.text = 'Staging all changes...';
    await stageAllChanges();

    spinner.text = 'Getting staged diff...';
    const diff = await getStagedDiff();

    if (!diff) {
      spinner.fail('No staged changes found');
      process.exit(0);
    }

    spinner.text = 'Generating commit message...';
    let commitMessage = await generateCommitMessage(diff);
    spinner.succeed('Generated commit message');

    let done = false;
    while (!done) {
      console.log(chalk.cyan('\n--- Proposed Commit Message ---'));
      console.log(commitMessage);
      console.log(chalk.cyan('--- End Message ---\n'));

      const choice = await question(
        chalk.yellow('Options: [a]ccept, [e]dit, [r]egenerate, [c]ancel: ')
      );

      switch (choice.toLowerCase().trim()) {
        case 'a':
        case 'accept':
          done = true;
          break;

        case 'e':
        case 'edit':
          console.log(chalk.cyan('Enter your commit message (end with a line containing only "."): '));
          let editedMessage = '';
          let editDone = false;

          while (!editDone) {
            const line = await question('> ');
            if (line.trim() === '.') {
              editDone = true;
            } else {
              editedMessage += line + '\n';
            }
          }

          commitMessage = editedMessage.trim();
          if (!commitMessage) {
            console.log(chalk.red('Commit message cannot be empty'));
            continue;
          }
          done = true;
          break;

        case 'r':
        case 'regenerate':
          const regenSpinner = ora('Regenerating commit message...').start();
          try {
            commitMessage = await generateCommitMessage(diff);
            regenSpinner.succeed('Regenerated commit message');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            regenSpinner.fail(`Failed to regenerate: ${errorMessage}`);
          }
          break;

        case 'c':
        case 'cancel':
          console.log(chalk.yellow('Commit cancelled'));
          process.exit(0);

        default:
          console.log(chalk.red('Invalid option. Please choose: a, e, r, or c'));
      }
    }

    const commitSpinner = ora('Creating commit...').start();
    try {
      await commit(commitMessage);
      commitSpinner.succeed('Commit created successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      commitSpinner.fail(`Failed to commit: ${errorMessage}`);
      process.exit(1);
    }

    const pushChoice = await question(chalk.yellow('Push commit to remote? [y/N]: '));
    if (pushChoice.toLowerCase().trim() === 'y') {
      const pushSpinner = ora('Pushing to remote...').start();
      try {
        await push();
        pushSpinner.succeed('Successfully pushed to remote');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        pushSpinner.fail(`Failed to push: ${errorMessage}`);
        console.log(chalk.yellow('You can push manually with: git push'));
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error: ${errorMessage}`));
    process.exit(1);
  }
}