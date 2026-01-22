#!/usr/bin/env node
/**
 * GitIssuer - Interactive GitHub Issue Manager
 * Integrates with /opt/GitIssue-Manager for issue syncing
 * 
 * Usage:
 *   gitissuer add --file ./ISSUE_UPDATES.md
 *   gitissuer sync --plan PLAN.md --dry-run
 *   gitissuer status --issue 1 --repo Axodus/Aragon-app-backend
 *   gitissuer apply-all --file ./ISSUE_UPDATES.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

class GitIssuer {
  constructor(issueFile = null) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.issueFile = issueFile;
    this.issues = issueFile ? this.parseIssueUpdates(issueFile) : {};
    this.gitIssueManagerPath = process.env.GITISSUE_MANAGER_PATH || '/opt/GitIssue-Manager';
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async menu(title, options) {
    console.log('\n' + '='.repeat(60));
    this.log(`📋 ${title}`, 'cyan');
    console.log('='.repeat(60));
    
    options.forEach((opt, idx) => {
      console.log(`  ${idx + 1}. ${opt.label}`);
    });
    console.log(`  0. ${colors.yellow}Exit${colors.reset}`);
    console.log('');

    const choice = await this.prompt(this.colorize('Select an option', 'blue') + ': ');
    const selected = parseInt(choice) - 1;
    
    if (choice === '0') {
      this.close();
      process.exit(0);
    }
    
    if (selected >= 0 && selected < options.length) {
      await options[selected].action();
      return this.menu(title, options);
    } else {
      this.log('\n❌ Invalid option. Please try again.', 'red');
      return this.menu(title, options);
    }
  }

  colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
  }

  parseIssueUpdates(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const issues = {};
      
      // Match all ## Repository sections
      const repoSections = content.split(/^## /m).slice(1);
      
      repoSections.forEach((section) => {
        const lines = section.split('\n');
        const repoLine = lines[0];
        const repo = repoLine.trim();
        
        // Extract PR number from title line
        const prMatch = repoLine.match(/#(\d+)/);
        const prNumber = prMatch ? prMatch[1] : null;
        
        // Find Title, Body, Labels sections
        let title = '';
        let body = '';
        let labels = [];
        let reviewers = [];
        
        let currentSection = null;
        let buffer = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.startsWith('### ')) {
            if (currentSection === 'Title') title = buffer.join('\n').trim();
            if (currentSection === 'Body') body = buffer.join('\n').trim();
            if (currentSection === 'Labels') labels = buffer.join('\n').split(',').map(l => l.trim()).filter(l => l);
            if (currentSection === 'Reviewers') reviewers = buffer.join('\n').split(',').map(r => r.trim()).filter(r => r);
            
            currentSection = line.replace('### ', '').trim();
            buffer = [];
          } else if (currentSection) {
            buffer.push(line);
          }
        }
        
        // Capture last section
        if (currentSection === 'Title') title = buffer.join('\n').trim();
        if (currentSection === 'Body') body = buffer.join('\n').trim();
        if (currentSection === 'Labels') labels = buffer.join('\n').split(',').map(l => l.trim()).filter(l => l);
        if (currentSection === 'Reviewers') reviewers = buffer.join('\n').split(',').map(r => r.trim()).filter(r => r);
        
        if (prNumber) {
          issues[repo] = {
            repo,
            prNumber,
            title,
            body,
            labels,
            reviewers,
          };
        }
      });
      
      return issues;
    } catch (error) {
      this.log(`\n❌ Error parsing file: ${error.message}`, 'red');
      return {};
    }
  }

  async executeGhCommand(cmd) {
    try {
      const output = execSync(`gh ${cmd}`, { encoding: 'utf8', stdio: 'pipe' });
      return { success: true, output };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updatePRTitle(repo, prNumber, title) {
    this.log(`\n  ⏳ Updating title for ${repo}#${prNumber}...`, 'yellow');
    const result = await this.executeGhCommand(`pr edit ${prNumber} --repo ${repo} --title "${title}"`);
    
    if (result.success) {
      this.log(`  ✅ Title updated successfully`, 'green');
      return true;
    } else {
      this.log(`  ❌ Failed to update title: ${result.error}`, 'red');
      return false;
    }
  }

  async updatePRBody(repo, prNumber, body) {
    this.log(`\n  ⏳ Updating body for ${repo}#${prNumber}...`, 'yellow');
    
    // Create temp file for body
    const tempFile = path.join('/tmp', `gh-body-${Date.now()}.md`);
    try {
      fs.writeFileSync(tempFile, body, 'utf8');
      const result = await this.executeGhCommand(`pr edit ${prNumber} --repo ${repo} --body-file "${tempFile}"`);
      
      if (result.success) {
        this.log(`  ✅ Body updated successfully`, 'green');
        return true;
      } else {
        this.log(`  ❌ Failed to update body: ${result.error}`, 'red');
        return false;
      }
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  async addPRLabels(repo, prNumber, labels) {
    if (labels.length === 0) return true;
    
    this.log(`\n  ⏳ Adding labels to ${repo}#${prNumber}: ${labels.join(', ')}...`, 'yellow');
    const result = await this.executeGhCommand(`pr edit ${prNumber} --repo ${repo} --add-label "${labels.join(',')}"`);
    
    if (result.success) {
      this.log(`  ✅ Labels added successfully`, 'green');
      return true;
    } else {
      this.log(`  ❌ Failed to add labels: ${result.error}`, 'red');
      return false;
    }
  }

  async requestPRReviewers(repo, prNumber, reviewers) {
    if (reviewers.length === 0) return true;
    
    this.log(`\n  ⏳ Requesting reviewers for ${repo}#${prNumber}: ${reviewers.join(', ')}...`, 'yellow');
    const result = await this.executeGhCommand(`pr edit ${prNumber} --repo ${repo} --add-reviewer "${reviewers.join(',')}"`);
    
    if (result.success) {
      this.log(`  ✅ Reviewers requested successfully`, 'green');
      return true;
    } else {
      this.log(`  ❌ Failed to request reviewers: ${result.error}`, 'red');
      return false;
    }
  }

  async showIssueSummary(repo) {
    const issue = this.issues[repo];
    if (!issue) {
      this.log('\n❌ Issue not found', 'red');
      return;
    }
    
    console.log('\n' + '='.repeat(60));
    this.log(`📊 Summary: ${repo}#${issue.prNumber}`, 'blue');
    console.log('='.repeat(60));
    console.log(`\n${this.colorize('Title:', 'cyan')}\n  ${issue.title}\n`);
    console.log(`${this.colorize('Body Preview:', 'cyan')}\n  ${issue.body.substring(0, 100)}...\n`);
    console.log(`${this.colorize('Labels:', 'green')}  ${issue.labels.join(', ')}\n`);
    console.log(`${this.colorize('Reviewers:', 'magenta')}  ${issue.reviewers.join(', ')}\n`);
  }

  async applyAllChanges() {
    if (Object.keys(this.issues).length === 0) {
      this.log('\n❌ No issues loaded. Use: gitissuer add --file ./ISSUE_UPDATES.md', 'red');
      return;
    }
    
    this.log('\n🚀 Applying all changes...', 'cyan');
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const [repo, issue] of Object.entries(this.issues)) {
      this.log(`\n📦 Processing ${repo}#${issue.prNumber}...`, 'blue');
      
      const titleOk = await this.updatePRTitle(repo, issue.prNumber, issue.title);
      const bodyOk = await this.updatePRBody(repo, issue.prNumber, issue.body);
      const labelsOk = await this.addPRLabels(repo, issue.prNumber, issue.labels);
      const reviewersOk = await this.requestPRReviewers(repo, issue.prNumber, issue.reviewers);
      
      if (titleOk && bodyOk && labelsOk && reviewersOk) {
        successCount++;
      } else {
        failureCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    this.log(`✅ Success: ${successCount} | ❌ Failed: ${failureCount}`, 'green');
    console.log('='.repeat(60) + '\n');
  }

  async interactiveUpdate() {
    if (Object.keys(this.issues).length === 0) {
      this.log('\n❌ No issues loaded. Use: gitissuer add --file ./ISSUE_UPDATES.md', 'red');
      return;
    }
    
    const repos = Object.keys(this.issues);
    const options = [
      ...repos.map(repo => ({
        label: `📝 Update ${repo}`,
        action: async () => this.updateIssueUI(repo),
      })),
      {
        label: `${this.colorize('🚀 Apply ALL Changes', 'green')}`,
        action: async () => this.applyAllChanges(),
      },
    ];
    
    await this.menu('Issue Updates Manager', options);
  }

  async updateIssueUI(repo) {
    const issue = this.issues[repo];
    const options = [
      {
        label: `✏️  Update Title`,
        action: async () => {
          const newTitle = await this.prompt(this.colorize(`New title for ${repo}#${issue.prNumber}`, 'cyan') + '\n> ');
          if (newTitle) {
            await this.updatePRTitle(repo, issue.prNumber, newTitle);
            issue.title = newTitle;
          }
        },
      },
      {
        label: `📝 Update Body`,
        action: async () => {
          const newBody = await this.prompt(this.colorize(`New body for ${repo}#${issue.prNumber}`, 'cyan') + '\n> ');
          if (newBody) {
            await this.updatePRBody(repo, issue.prNumber, newBody);
            issue.body = newBody;
          }
        },
      },
      {
        label: `🏷️  Add Labels`,
        action: async () => {
          const labelStr = await this.prompt(this.colorize(`Labels (comma-separated) for ${repo}#${issue.prNumber}`, 'cyan') + '\n> ');
          if (labelStr) {
            const labels = labelStr.split(',').map(l => l.trim());
            await this.addPRLabels(repo, issue.prNumber, labels);
            issue.labels = [...new Set([...issue.labels, ...labels])];
          }
        },
      },
      {
        label: `👥 Request Reviewers`,
        action: async () => {
          const reviewerStr = await this.prompt(this.colorize(`Reviewers (comma-separated) for ${repo}#${issue.prNumber}`, 'cyan') + '\n> ');
          if (reviewerStr) {
            const reviewers = reviewerStr.split(',').map(r => r.trim());
            await this.requestPRReviewers(repo, issue.prNumber, reviewers);
            issue.reviewers = [...new Set([...issue.reviewers, ...reviewers])];
          }
        },
      },
      {
        label: `📊 View Summary`,
        action: async () => this.showIssueSummary(repo),
      },
    ];
    
    await this.menu(`Update ${repo}#${issue.prNumber}`, options);
  }

  close() {
    this.rl.close();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help') {
    console.log(`
${colors.cyan}GitIssuer - GitHub Issue Manager${colors.reset}

${colors.bright}Usage:${colors.reset}
  gitissuer add --file ./ISSUE_UPDATES.md      Interactive menu for updates
  gitissuer apply-all --file ./ISSUE_UPDATES.md Apply all changes at once
  gitissuer help                                  Show this help message
    `);
    process.exit(0);
  }

  if (command === 'add') {
    const fileIdx = args.indexOf('--file');
    if (fileIdx === -1 || !args[fileIdx + 1]) {
      console.error(`${colors.red}Error: --file parameter required${colors.reset}`);
      process.exit(1);
    }
    
    const filePath = args[fileIdx + 1];
    const issuer = new GitIssuer(filePath);
    await issuer.interactiveUpdate();
  } else if (command === 'apply-all') {
    const fileIdx = args.indexOf('--file');
    if (fileIdx === -1 || !args[fileIdx + 1]) {
      console.error(`${colors.red}Error: --file parameter required${colors.reset}`);
      process.exit(1);
    }
    
    const filePath = args[fileIdx + 1];
    const issuer = new GitIssuer(filePath);
    await issuer.applyAllChanges();
    issuer.close();
  } else {
    console.error(`${colors.red}Unknown command: ${command}${colors.reset}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
