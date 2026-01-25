#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const runFilesArg = getArg('--runFiles'); // comma-separated
const runFiles = (runFilesArg || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (runFiles.length === 0) {
  console.error('Usage: node orchestrator/runner-ci.mjs --runFiles runs/<id>.json[,runs/<id2>.json]');
  process.exit(1);
}

const nowIso = () => new Date().toISOString();
const safeTs = (iso) => iso.replace(/[:.]/g, '-');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function writeText(p, txt) {
  fs.writeFileSync(p, txt, 'utf8');
}

function kickoffMarkdown(job) {
  const idea = job.idea || '';
  const title = job.title || '';
  return `# Swarm Kickoff\n\n- jobId: ${job.jobId}\n- code: ${job.code || ''}\n- createdAt: ${job.createdAt || ''}\n- startedAt: ${job.swarm?.startedAt || ''}\n\n## Input\n\n${title ? `**Title:** ${title}\n\n` : ''}${idea ? `**Idea:** ${idea}\n\n` : ''}## Plan (MVP)\n\n1) Clarify requirements + success criteria\n2) Produce a short PRD + task breakdown\n3) Implement smallest usable vertical slice\n4) QA + deploy\n\n## Next (Agentic)\n\n- Split into worker roles (PM / Engineer / QA)\n- Write artifacts each step (immutable)\n- Post status updates to the per-run Slack channel\n`;
}

let updated = 0;
let skipped = 0;

for (const rel of runFiles) {
  const runPath = path.join(process.cwd(), rel);
  if (!fs.existsSync(runPath)) {
    console.warn(`skip (missing): ${rel}`);
    skipped++;
    continue;
  }

  const job = readJson(runPath);
  job.history = job.history || [];
  job.artifacts = job.artifacts || {};
  job.swarm = job.swarm || {};

  if (job.swarm.startedAt) {
    console.log(`skip (already started): ${rel}`);
    skipped++;
    continue;
  }

  const ts = nowIso();
  job.swarm.startedAt = ts;
  job.swarm.runner = 'github-actions';
  job.history.push({ ts, event: 'SWARM_STARTED', data: { runner: 'github-actions' } });

  // Write kickoff artifact
  const artifactDir = path.join(process.cwd(), 'artifacts', job.jobId, 'swarm');
  ensureDir(artifactDir);
  const kickoffRel = `artifacts/${job.jobId}/swarm/${safeTs(ts)}-kickoff.md`;
  const kickoffAbs = path.join(process.cwd(), kickoffRel);
  writeText(kickoffAbs, kickoffMarkdown(job));

  job.artifacts.swarmKickoff = kickoffRel;
  job.history.push({ ts, event: 'ARTIFACT_WRITTEN', data: { path: kickoffRel, kind: 'SWARM_KICKOFF' } });

  // Set a visible phase to show progress (can refine later)
  if (!job.phase || job.phase === 'CUSTOMER_DISCOVERY') {
    job.phase = 'PRODUCT';
  }

  writeJson(runPath, job);
  console.log(`updated: ${rel}`);
  updated++;
}

console.log(JSON.stringify({ ok: true, updated, skipped }, null, 2));
