const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const uiRoots = [
  'views/',
  'controllers/',
  'utils/',
  'public/js/',
];

const uiExtensions = new Set(['.ejs', '.js']);
const englishPhrases = [
  'Search',
  'Submit',
  'Cancel',
  'Edit',
  'Delete',
  'Name',
  'Status',
  'All',
  'No data',
  'Back',
  'Save',
  'Update',
  'Create',
  'Product',
  'Order',
  'User',
  'Payment',
];

const brokenVietnamesePatterns = [
  /TÃ|Tráº|khÃ|dá»|Ä‘|LÆ|Há»|Cáº|Nguyá»/i,
  /\uFFFD/,
];

function stagedFiles() {
  const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    encoding: 'utf8',
  });
  return output.split(/\r?\n/).filter(Boolean);
}

function isUiFile(file) {
  const normalized = file.replace(/\\/g, '/');
  return uiRoots.some((root) => normalized.startsWith(root)) && uiExtensions.has(path.extname(file));
}

function visibleContexts(content, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const contexts = [
    new RegExp(`>[^<%"']*\\b${escaped}\\b[^<%"']*<`, 'i'),
    new RegExp(`["'\`]([^"'\`]*\\b${escaped}\\b[^"'\`]*)["'\`]`, 'i'),
    new RegExp(`placeholder=["'][^"']*\\b${escaped}\\b[^"']*["']`, 'i'),
    new RegExp(`title=["'][^"']*\\b${escaped}\\b[^"']*["']`, 'i'),
    new RegExp(`aria-label=["'][^"']*\\b${escaped}\\b[^"']*["']`, 'i'),
  ];
  return contexts.some((pattern) => pattern.test(content));
}

function visibleUiContexts(content, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const contexts = [
    new RegExp(`>[^<%"']*\\b${escaped}\\b[^<%"']*<`, 'i'),
    new RegExp(`(?:placeholder|title|aria-label|alt|value)=["'][^"'<%]*\\b${escaped}\\b[^"'<%]*["']`, 'i'),
    new RegExp(`(?:window\\.)?(?:confirm|alert)\\(\\s*["'][^"']*\\b${escaped}\\b[^"']*["']`, 'i'),
    new RegExp(`(?:textContent|innerText)\\s*=\\s*["'][^"']*\\b${escaped}\\b[^"']*["']`, 'i'),
    new RegExp(`(?:successMessage|message)\\s*:\\s*["'][^"']*\\b${escaped}\\b[^"']*["']`, 'i'),
  ];
  return contexts.some((pattern) => pattern.test(content));
}

const findings = [];

for (const file of stagedFiles().filter(isUiFile)) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');

  for (const phrase of englishPhrases) {
    if (visibleUiContexts(content, phrase)) {
      findings.push(`${file}: possible English UI text "${phrase}"`);
    }
  }

  for (const pattern of brokenVietnamesePatterns) {
    if (pattern.test(content)) {
      findings.push(`${file}: possible broken Vietnamese encoding`);
      break;
    }
  }
}

if (findings.length) {
  console.error('Vietnamese UI text check failed:');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  console.error('Use accented Vietnamese for user-facing text, for example "Tìm kiếm", "Lưu", "Hủy", and "Tất cả".');
  process.exit(1);
}

console.log('Vietnamese UI text check passed.');
