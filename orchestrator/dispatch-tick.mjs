#!/usr/bin/env node
/**
 * Swarm Factory Dispatcher (minimal safe version)
 *
 * Goal:
 * - Periodically scan repo-backed runs + decisions for ASSIGN_AGENT events.
 * - For each unprocessed ASSIGN_AGENT event, write a durable in-repo marker:
 *     artifacts/<jobId>/dispatch/<ts>-assign.json
 *   This marker is the idempotency key to avoid double-processing.
 * - Optionally (flag) commit + push the marker.
 *
 * NOTE:
 * This script does NOT directly “spawn” LLM subagents.
 * Instead it writes a machine-readable dispatch request that a higher-level
 * controller (Clawdbot main session / gateway cron agent) can consume.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const RUNS_DIR = path.join(process.cwd(), 'runs');
const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts');

const MAX_RUNS = Number(getArg('--maxRuns') || 200);
const DRY_RUN = hasFlag('--dryRun');
const GIT_PULL = hasFlag('--gitPull');
const GIT_COMMIT = hasFlag('--gitCommit');
const GIT_PUSH = hasFlag('--gitPush');

const nowIso = () => new Date().toISOString();
const safeTs = (iso) => iso.replace(/[:.]/g, '-');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

function listRunFiles() {
  if (!fs.existsSync(RUNS_DIR)) return [];
  return fs
    .readdirSync(RUNS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(RUNS_DIR, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, MAX_RUNS);
}

function listDecisionFiles(jobId) {
  const base = path.join(ARTIFACTS_DIR, jobId, 'decisions');
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(base, f))
    .sort();
}

function normalizeAssignEvents(from) {
  // Accept:
  // - { events: [...] }
  // - [...] (array of events)
  // - { history: [...] }
  const arr =
    Array.isArray(from) ? from :
    Array.isArray(from?.events) ? from.events :
    Array.isArray(from?.history) ? from.history :
    [];

  return arr
    .filter(Boolean)
    .filter((e) => (e.event || e.type || '').toUpperCase() === 'ASSIGN_AGENT')
    .map((e) => {
      const data = e.data || e.payload || {};
      return {
        ts: e.ts || e.at || null,
        event: 'ASSIGN_AGENT',
        data
      };
    });
}

function roleFromAssign(data) {
  const raw = (data?.role || data?.agent || data?.agentRole || data?.pool || '').toString();
  const r = raw.trim().toLowerCase();
  if (!r) return null;
  // normalize a few common aliases
  if (r === 'engineer' || r === 'coder' || r === 'dev') return 'coder';
  if (r === 'design' || r === 'designer' || r === 'ux') return 'designer';
  if (r === 'qa' || r === 'test' || r === 'tester') return 'qa';
  if (r === 'deploy' || r === 'release') return 'deploy';
  return r;
}

function dispatchDir(jobId) {
  return path.join(ARTIFACTS_DIR, jobId, 'dispatch');
}

function dispatchMarkers(jobId) {
  const dir = dispatchDir(jobId);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f));
}

function hasMarkerForKey(jobId, key) {
  const files = dispatchMarkers(jobId);
  for (const f of files) {
    try {
      const j = readJson(f);
      if (j?.dispatchKey === key) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

function makeDispatchKey(jobId, assignEvent) {
  // Stable key across pulls.
  // Prefer upstream ts; fall back to content hash.
  const role = roleFromAssign(assignEvent?.data) || 'unknown';
  const ts = assignEvent?.ts || '';
  const payloadHash = sha1(JSON.stringify(assignEvent?.data || {}));
  return `${jobId}:${role}:${ts}:${payloadHash}`;
}

function writeDispatchMarker({ jobId, run, assignEvent }) {
  const key = makeDispatchKey(jobId, assignEvent);
  if (hasMarkerForKey(jobId, key)) return { created: false, reason: 'already_marked', dispatchKey: key };

  const ts = nowIso();
  const role = roleFromAssign(assignEvent?.data) || 'unknown';
  const marker = {
    kind: 'DISPATCH_REQUEST',
    createdAt: ts,
    jobId,
    code: run?.code || null,
    title: run?.title || null,
    dispatchKey: key,
    assignEvent,
    requestedRole: role,
    pool: assignEvent?.data?.pool || null,
    status: 'QUEUED',
    notes: 'Created by orchestrator/dispatch-tick.mjs. A higher-level controller should spawn the appropriate subagent(s).'
  };

  const out = path.join(dispatchDir(jobId), `${safeTs(ts)}-${role}.json`);

  if (!DRY_RUN) writeJson(out, marker);

  return { created: true, dispatchKey: key, file: path.relative(process.cwd(), out), marker };
}

function git(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function main() {
  if (GIT_PULL && !DRY_RUN) {
    try {
      git('git pull --rebase');
    } catch {
      // Non-fatal: we can still operate on current working tree.
    }
  }

  const runFiles = listRunFiles();

  const queued = [];
  const scanned = [];

  for (const runFile of runFiles) {
    let run;
    try {
      run = readJson(runFile);
    } catch {
      continue;
    }

    const jobId = run?.jobId;
    if (!jobId) continue;

    const historyAssign = normalizeAssignEvents(run?.history || []);

    // Decisions (optional)
    const decisionFiles = listDecisionFiles(jobId);
    const decisionAssign = [];
    for (const f of decisionFiles.slice(-10)) {
      try {
        const j = readJson(f);
        decisionAssign.push(...normalizeAssignEvents(j));
      } catch {
        // ignore
      }
    }

    const allAssign = [...historyAssign, ...decisionAssign];
    if (allAssign.length === 0) continue;

    scanned.push({ jobId, runFile: path.relative(process.cwd(), runFile), assignEvents: allAssign.length });

    for (const ev of allAssign) {
      const res = writeDispatchMarker({ jobId, run, assignEvent: ev });
      if (res.created) queued.push(res);
    }
  }

  if (queued.length > 0 && !DRY_RUN) {
    // Stage created dispatch markers
    git('git add artifacts');

    if (GIT_COMMIT) {
      const msg = `dispatch: queue ${queued.length} assign event(s)`;
      try {
        git(`git commit -m "${msg.replace(/\"/g, '\\\"')}"`);
      } catch {
        // If nothing changed, ignore.
      }

      if (GIT_PUSH) {
        try {
          git('git push');
        } catch {
          try {
            git('git pull --rebase');
            git('git push');
          } catch {
            // ignore
          }
        }
      }
    }
  }

  const out = {
    ok: true,
    ts: nowIso(),
    dryRun: DRY_RUN,
    scannedRuns: scanned.length,
    queued: queued.map((q) => ({ dispatchKey: q.dispatchKey, file: q.file, requestedRole: q.marker?.requestedRole, jobId: q.marker?.jobId })),
    notes:
      'Consume queued dispatch markers in artifacts/<jobId>/dispatch/*.json and spawn appropriate agents. Mark completion by updating marker status or writing a follow-up marker.'
  };

  process.stdout.write(JSON.stringify(out, null, 2));
}

main();
