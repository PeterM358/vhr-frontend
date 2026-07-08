#!/usr/bin/env node
/**
 * Scan src/ for likely hardcoded user-facing English strings.
 * Run: node scripts/find-hardcoded-strings.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src');
const SCAN_DIRS = ['screens', 'components', 'navigation'];

const IGNORE_PATTERNS = [
  /^\s*\/\//,
  /^\s*\*/,
  /console\./,
  /safe(Error|Warn|Log)/,
  /devLog/,
  /import\s/,
  /require\(/,
  /from\s+'/,
  /t\(['`]/,
  /translateFn\(/,
  /STORAGE_KEYS/,
  /API_BASE/,
  /process\.env/,
  /Platform\.OS/,
  /navigation\./,
  /route\.params/,
  /styles\./,
  /testID/,
  /accessibility/,
  /icon=/,
  /name=['"][a-z0-9-]+['"]/i,
  /#[0-9a-f]{3,8}/i,
  /rgba?\(/,
  /https?:\/\//,
  /@veversal/,
  /service1001:\/\//,
];

const STRING_PATTERNS = [
  /label=["']([A-Z][^"']{2,})["']/g,
  /title=["']([A-Z][^"']{2,})["']/g,
  /<Text[^>]*>([A-Z][^<{]{2,})<\/Text>/g,
  /placeholder=["']([A-Z][^"']{2,})["']/g,
  /Dialog\.Title>([A-Z][^<{]{2,})</g,
];

const INTENTIONAL = [
  'Veversal',
  'OK',
  'API',
  'GPS',
  'VAT',
  'PDF',
  'SKU',
  'YouTube',
  'Facebook',
  'Instagram',
  'Google',
  'Bulgaria',
  'English',
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'i18n' || entry.name === '__tests__') continue;
      walk(full, out);
    } else if (/\.(js|jsx|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function isIgnoredLine(line) {
  return IGNORE_PATTERNS.some((re) => re.test(line));
}

function scanFile(filePath) {
  const rel = path.relative(path.join(__dirname, '..'), filePath);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const hits = [];

  lines.forEach((line, idx) => {
    if (isIgnoredLine(line)) return;
    for (const pattern of STRING_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const text = match[1].trim();
        if (text.length < 3 || INTENTIONAL.includes(text)) continue;
        if (/^[A-Z0-9_]+$/.test(text)) continue;
        hits.push({ line: idx + 1, text, snippet: line.trim().slice(0, 120) });
      }
    }
  });

  return hits.length ? { file: rel, hits } : null;
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const results = files.map(scanFile).filter(Boolean);

console.log('# i18n hardcoded string scan\n');
console.log(`Scanned ${files.length} files under src/{${SCAN_DIRS.join(',')}}/\n`);

if (!results.length) {
  console.log('No obvious hardcoded strings found.');
  process.exit(0);
}

let total = 0;
for (const row of results) {
  console.log(`## ${row.file}`);
  for (const hit of row.hits.slice(0, 8)) {
    total += 1;
    console.log(`- L${hit.line}: "${hit.text}" — \`${hit.snippet}\``);
  }
  if (row.hits.length > 8) {
    total += row.hits.length - 8;
    console.log(`- … and ${row.hits.length - 8} more in this file`);
  }
  console.log('');
}

console.log(`\nTotal likely hardcoded strings: ${total}`);
console.log('\n## Intentionally left in English');
console.log('- Brand name: Veversal');
console.log('- OAuth / social network names');
console.log('- Route paths and API field keys');
console.log('- User-generated content (shop descriptions, chat messages)');
console.log('- Notification body text from API (translate via event_type later)');
