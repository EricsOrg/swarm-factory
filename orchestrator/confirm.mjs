#!/usr/bin/env node
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { nowIso, pendingPath, readJson, runPath, writeJson } from './_lib.mjs';

// Usage: node orchestrator/confirm.mjs --jobId <id> --message "..."
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const jobId = getArg('--jobId');
const msg = getArg('--message') || `run: ${jobId}`;

if (!jobId) {
  console.error('Missing --jobId');
  process.exit(1);
}

const p = pendingPath(jobId);
if (!fs.existsSync(p)) {
  console.error(`No pending job found for jobId=${jobId} (${p})`);
  process.exit(2);
}

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
execSync('git add runs', { stdio: 'inherit' });
execSync(`git commit -m "${msg.replace(/\"/g, '\\"')}"`, { stdio: 'inherit' });
execSync('git push', { stdio: 'inherit' });

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
