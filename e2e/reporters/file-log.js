/**
 * Appends a plain-text smoke log for each run (path from playwright.config).
 */

const fs = require('fs');
const path = require('path');

class FileLogReporter {
  constructor(options = {}) {
    this.outputFile = options.outputFile;
    this.lines = [];
  }

  onBegin(config, suite) {
    const base =
      config.projects?.[0]?.use?.baseURL ||
      process.env.E2E_BASE_URL ||
      'https://www.veversal.com';
    this.lines.push(`Veversal E2E smoke log`);
    this.lines.push(`Started: ${new Date().toISOString()}`);
    this.lines.push(`Base URL: ${base}`);
    this.lines.push(`Tests: ${suite.allTests().length}`);
    this.lines.push('---');
  }

  onTestEnd(test, result) {
    const status = result.status.toUpperCase();
    const title = test.titlePath().slice(1).join(' › ');
    const ms = result.duration;
    this.lines.push(`[${status}] ${title} (${ms}ms)`);
    if (result.error) {
      this.lines.push(`  ERROR: ${result.error.message?.split('\n')[0] || String(result.error)}`);
    }
  }

  onEnd(result) {
    this.lines.push('---');
    this.lines.push(`Finished: ${new Date().toISOString()}`);
    this.lines.push(`Result: ${result.status}`);
    const body = `${this.lines.join('\n')}\n`;
    if (this.outputFile) {
      fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
      fs.writeFileSync(this.outputFile, body, 'utf8');
      // eslint-disable-next-line no-console
      console.log(`\nSmoke log written: ${this.outputFile}\n`);
    }
  }
}

module.exports = FileLogReporter;
