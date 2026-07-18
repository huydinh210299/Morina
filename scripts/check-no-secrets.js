const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const allowedEnvExamples = new Set(['.env.example', '.env.production.example']);
const blockedFilePatterns = [
  /^\.env($|\.)/,
  /(^|\/)terraform\.tfvars$/,
  /\.tfstate(\..*)?$/,
  /(^|\/)id_rsa$/,
  /(^|\/)id_ed25519$/,
  /\.(pem|key|p12|pfx)$/i,
];

const secretPatterns = [
  { name: 'private key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'MongoDB URI with credentials', pattern: /mongodb(\+srv)?:\/\/[^:\s]+:[^@\s]+@/i },
  { name: 'JWT secret assignment', pattern: /\bJWT_SECRET\s*=\s*["']?[^"'\s#]{16,}/i },
  { name: 'password assignment', pattern: /\b(PASSWORD|PASS|SECRET_KEY|API_KEY|TOKEN)\s*=\s*["']?[^"'\s#]{16,}/i },
];

function stagedFiles() {
  const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    encoding: 'utf8',
  });
  return output.split(/\r?\n/).filter(Boolean);
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return !['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip'].includes(ext);
}

const findings = [];

for (const file of stagedFiles()) {
  const normalized = file.replace(/\\/g, '/');
  const basename = path.basename(normalized);

  if (!allowedEnvExamples.has(basename) && blockedFilePatterns.some((pattern) => pattern.test(normalized))) {
    findings.push(`${file}: blocked secret or environment file`);
    continue;
  }

  if (!isTextFile(file) || !fs.existsSync(file)) {
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  for (const { name, pattern } of secretPatterns) {
    if (pattern.test(content)) {
      findings.push(`${file}: possible ${name}`);
    }
  }
}

if (findings.length) {
  console.error('Secret check failed:');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log('Secret check passed.');
