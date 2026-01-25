import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function repoRoot() {
  // scripts are executed with cwd = repo root in our npm scripts
  return process.cwd();
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function writeJson(p, obj) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

export function newJobId() {
  return crypto.randomUUID();
}

export function nowIso() {
  return new Date().toISOString();
}

export function pendingDir() {
  return path.join(repoRoot(), 'orchestrator', 'pending');
}

export function runsDir() {
  return path.join(repoRoot(), 'runs');
}

export function pendingPath(jobId) {
  return path.join(pendingDir(), `${jobId}.json`);
}

export function runPath(jobId) {
  return path.join(runsDir(), `${jobId}.json`);
}

export function createJob({ idea, requester }) {
  const jobId = newJobId();
  const ts = nowIso();
  const job = {
    jobId,
    createdAt: ts,
    phase: 'INTAKE',
    idea,
    requester,
    artifacts: {},
    history: [{ ts, event: 'INTAKE', data: { idea, requester } }]
  };
  return job;
}
