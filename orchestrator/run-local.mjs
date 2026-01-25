#!/usr/bin/env node
/**
 * Swarm Factory (MVP) local runner.
 *
 * Goal: prove the state machine + immutable artifacts flow works,
 * BEFORE we wire real sub-agents, Slack triggers, or Vercel deploy.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const idea = process.argv.slice(2).join(' ').trim();
if (!idea) {
  console.error('Usage: node orchestrator/run-local.mjs "<business idea>"');
  process.exit(1);
}

const jobId = crypto.randomUUID();
const now = new Date().toISOString();

const job = {
  jobId,
  createdAt: now,
  phase: 'INTAKE',
  idea,
  artifacts: {},
  history: [{ ts: now, event: 'INTAKE', data: { idea } }]
};

const runsDir = path.join(process.cwd(), 'runs');
fs.mkdirSync(runsDir, { recursive: true });
const outPath = path.join(runsDir, `${jobId}.json`);

fs.writeFileSync(outPath, JSON.stringify(job, null, 2), 'utf8');

console.log('Created job:', jobId);
console.log('Saved:', outPath);
console.log('\nNext steps:');
console.log('- Wire Slack DM trigger → creates this job');
console.log('- Implement phase runners that write artifacts immutably');
console.log('- Add "confirm" gate before starting');
