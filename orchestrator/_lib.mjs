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

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function shortRand(len = 4) {
  // human-friendly base32-ish (no 0/O/1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function makeHumanCode(idea) {
  const base = slugify(idea).split('-').slice(0, 4).join('-') || 'run';
  return `${base}-${shortRand(4)}`;
}

export function makeTitle(idea) {
  const trimmed = (idea || '').trim();
  if (trimmed.length <= 64) return trimmed;
  return trimmed.slice(0, 61) + '…';
}

export function createJob({ idea, requester }) {
  const jobId = newJobId();
  const ts = nowIso();
  const title = makeTitle(idea);
  const code = makeHumanCode(idea);
  const job = {
    jobId,
    code,
    title,
    createdAt: ts,
    phase: 'INTAKE',
    idea,
    requester,
    artifacts: {},
    history: [{ ts, event: 'INTAKE', data: { idea, requester } }]
  };
  return job;
}
