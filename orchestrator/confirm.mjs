#!/usr/bin/env node
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { nowIso, pendingDir, pendingPath, readJson, runPath, writeJson } from './_lib.mjs';

// Usage:
//   node orchestrator/confirm.mjs --jobId <uuid>
//   node orchestrator/confirm.mjs --code <human-code>
//   node orchestrator/confirm.mjs --last
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const hasFlag = (name) => args.includes(name);

let jobId = getArg('--jobId');
const code = getArg('--code');
const useLast = hasFlag('--last');

function listPendingFiles() {
  const dir = pendingDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(dir, f));
}

function findPendingByPredicate(pred) {
  const files = listPendingFiles();
  for (const full of files) {
    try {
      const j = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (pred(j, full)) return { job: j, path: full };
    } catch {
      // ignore
    }
  }
  return null;
}

let pending = null;
if (jobId) {
  const p = pendingPath(jobId);
  if (!fs.existsSync(p)) {
    console.error(`No pending job found for jobId=${jobId} (${p})`);
    process.exit(2);
  }
  pending = { job: readJson(p), path: p };
} else if (code) {
  pending = findPendingByPredicate((j) => (j.code || '').toLowerCase() === code.toLowerCase());
  if (!pending) {
    console.error(`No pending job found for code=${code}`);
    process.exit(2);
  }
  jobId = pending.job.jobId;
} else if (useLast) {
  // pick most recently modified pending file
  const match = findPendingByPredicate((j, p) => {
    try {
      return !!p;
    } catch {
      return false;
    }
  });
  if (!match) {
    console.error('No pending jobs exist.');
    process.exit(2);
  }
  const files = listPendingFiles();
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const p = files[0];
  pending = { job: readJson(p), path: p };
  jobId = pending.job.jobId;
} else {
  console.error('Missing --jobId, --code, or --last');
  process.exit(1);
}

const msg = getArg('--message') || `run: ${pending.job.code || jobId} confirmed`;

const p = pending.path;

const job = readJson(p);
const ts = nowIso();
job.history = job.history || [];
job.history.push({ ts, event: 'CONFIRMED', data: {} });
job.phase = 'CUSTOMER_DISCOVERY';

const out = runPath(jobId);
writeJson(out, job);

// Remove pending
fs.unlinkSync(p);

// Commit + push run artifact so the deployed site can fetch it from GitHub.
// Note: concurrent writers (web UI + local runner) can cause non-fast-forward.
// We do a pull --rebase and retry once to keep it boring and deterministic.
execSync('git add runs', { stdio: 'inherit' });
execSync(`git commit -m "${msg.replace(/\"/g, '\\"')}"`, { stdio: 'inherit' });

try {
  execSync('git push', { stdio: 'inherit' });
} catch {
  execSync('git pull --rebase', { stdio: 'inherit' });
  execSync('git push', { stdio: 'inherit' });
}

process.stdout.write(
  JSON.stringify(
    {
      jobId,
      runFile: out.replace(process.cwd() + '\\', '')
    },
    null,
    2
  )
);
