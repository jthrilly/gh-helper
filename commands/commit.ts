#!/usr/bin/env node

import readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { generateCommitMessageFromAnalysis, checkOllamaAvailability } from '../lib/ollama.ts';
import { stageAllChanges, commit, push, hasChanges, isGitRepository, getStatusChanges } from '../lib/git.ts';
import { analyzeChanges } from '../lib/analysis.ts';

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

    const ollamaCheck = await checkOllamaAvailability();
    if (!ollamaCheck.available) {
      console.error(chalk.red(`Error: ${ollamaCheck.error}`));
      console.error(chalk.yellow('Please ensure Ollama is running and has the required model.'));
      console.error(chalk.gray('Install model: ollama pull llama3:latest'));
      process.exit(1);
    }

    const spinner = ora('Checking for changes...').start();

    if (!await hasChanges()) {
      spinner.fail('No changes to commit');
      process.exit(0);
    }

    spinner.text = 'Staging all changes...';
    await stageAllChanges();

    spinner.text = 'Analyzing changes...';
    const fileChanges = await getStatusChanges();

    if (fileChanges.length === 0) {
      spinner.fail('No staged changes found');
      process.exit(0);
    }

    spinner.text = `Analyzing ${fileChanges.length} files...`;

    // Use progress callback to update spinner with current file being analyzed
    const analysisResult = await analyzeChanges(fileChanges, (current, total, fileName) => {
      const shortFileName = fileName.length > 30
        ? '...' + fileName.slice(-27)
        : fileName;
      spinner.text = `Analyzing file ${current}/${total}: ${shortFileName}`;
    });

    spinner.text = 'Generating commit message...';
    let commitMessage = await generateCommitMessageFromAnalysis(analysisResult);
    spinner.succeed('Generated commit message');

    // Show analysis summary
    console.log(chalk.cyan('\n--- Change Analysis ---'));
    console.log(chalk.gray(`Overall scope: ${analysisResult.overallScope}`));
    console.log(chalk.gray(`Suggested type: ${analysisResult.suggestedCommitType}`));
    
    const majorChanges = analysisResult.fileAnalyses.filter(a => a.impact === 'major');
    const codeChanges = analysisResult.fileAnalyses.filter(a => a.category.type === 'code');
    
    if (majorChanges.length > 0) {
      console.log(chalk.yellow(`Major changes in ${majorChanges.length} files`));
    }
    if (codeChanges.length > 0) {
      console.log(chalk.blue(`Code changes in ${codeChanges.length} files`));
    }
    
    console.log(chalk.cyan('--- End Analysis ---\n'));

    let done = false;
    while (!done) {
      console.log(chalk.cyan('--- Proposed Commit Message ---'));
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
            commitMessage = await generateCommitMessageFromAnalysis(analysisResult);
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