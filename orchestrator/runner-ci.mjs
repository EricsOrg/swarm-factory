#!/usr/bin/env node
/**
 * Swarm Factory CI Runner (Phase State Machine)
 *
 * This runner is intentionally deterministic and repo-native.
 * It advances each run through the canonical phases and writes immutable artifacts.
 *
 * NOTE: The "agent" content here is currently template-based.
 * The primary goal is an end-to-end automated pipeline + artifact trail.
 */

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

function artifactPath(jobId, phase, ts, ext) {
  return `artifacts/${jobId}/${phase}/${safeTs(ts)}.${ext}`;
}

function writeArtifact(job, phase, ext, content, kind) {
  const ts = nowIso();
  const rel = artifactPath(job.jobId, phase, ts, ext);
  const abs = path.join(process.cwd(), rel);
  ensureDir(path.dirname(abs));

  if (ext === 'json') writeJson(abs, content);
  else writeText(abs, content);

  job.artifacts = job.artifacts || {};
  job.history = job.history || [];

  job.history.push({ ts, event: 'ARTIFACT_WRITTEN', data: { path: rel, kind } });
  return { ts, rel };
}

function setPhase(job, toPhase, note) {
  const ts = nowIso();
  job.phase = toPhase;
  job.history = job.history || [];
  job.history.push({ ts, event: 'PHASE_SET', data: { toPhase, note: note || null } });
}

function titleFromIdea(idea) {
  return (idea || '').trim().split(/\n/)[0].slice(0, 80);
}

function mkCustomerArtifact(job) {
  return {
    kind: 'CUSTOMER_DISCOVERY',
    jobId: job.jobId,
    createdAt: nowIso(),
    persona: {
      title: 'Prospective customer',
      summary: 'A realistic buyer evaluating whether this product solves an urgent pain.'
    },
    pains: [
      'Scheduling requests arrive via phone/text; missed calls create lost revenue.',
      'Manual follow-ups and calendar coordination are time-consuming.',
      'No-shows and reschedules cause chaos and wasted drive time.'
    ],
    objections: [
      'Will it integrate with my existing calendar/CRM?',
      'I need this to work on mobile while I’m in the field.',
      'I don’t want complicated setup.'
    ],
    buySignal: 'If it reliably books jobs and reduces admin time, I would trial it.'
  };
}

function mkProductArtifact(job) {
  return {
    kind: 'PRODUCT_SPEC',
    jobId: job.jobId,
    createdAt: nowIso(),
    productName: `${(job.title || titleFromIdea(job.idea) || 'New Product').replace(/[^a-zA-Z0-9\s-]/g, '').trim()} MVP`,
    oneLiner: 'Book and manage appointments fast, with automated reminders and intake.',
    mvpScope: [
      'Customer booking form (service, date/time preferences, contact info)',
      'Admin view of requests + confirm/decline',
      'Calendar entry creation (initially internal stub)',
      'SMS/email reminder placeholder (logged, not sent)'
    ],
    outOfScope: [
      'Voice agent calls',
      'Payments',
      'Full CRM',
      'Complex routing/dispatch'
    ],
    acceptanceCriteria: [
      'A customer can submit a booking request in < 60 seconds.',
      'An admin can accept a request and see it appear in an appointments list.',
      'App deploys and loads successfully at a URL.'
    ]
  };
}

function mkDesignArtifact(job) {
  return {
    kind: 'DESIGN_SPEC',
    jobId: job.jobId,
    createdAt: nowIso(),
    informationArchitecture: [
      'Landing/Booking page',
      'Admin Dashboard: Requests + Appointments',
      'Request Detail drawer/modal'
    ],
    components: [
      'BookingForm',
      'RequestsTable',
      'AppointmentsList',
      'StatusBadge'
    ],
    uxFlow: [
      'Customer submits request → sees confirmation page',
      'Admin reviews request → accepts → appointment appears',
      'Admin can mark complete/cancel'
    ]
  };
}

function mkBuildPlan(job) {
  return `# Build Plan\n\nJob: ${job.jobId}\nCode: ${job.code || ''}\n\n## Stack\n- Next.js App Router\n- Minimal in-repo JSON persistence (artifacts + runs)\n\n## Implementation steps\n1) Create booking form page\n2) Create admin dashboard page\n3) Wire API routes for create/list/update\n4) Add basic styling\n\n## Notes\nThis is currently a template artifact written by CI. Next step is having an Engineer agent actually implement code changes and commit them.\n`;
}

function mkQaReport(job) {
  return `# QA Report (template)\n\n- Booking form submits\n- Admin sees request\n- Accept moves request → appointments\n\n## Issues\n- Notifications not implemented\n- Calendar integration stub\n`;
}

function mkDeployReport(job) {
  // In future, this should contain the canonical URL validated by HTTP fetch.
  return {
    kind: 'DEPLOY_REPORT',
    jobId: job.jobId,
    createdAt: nowIso(),
    status: 'PENDING_REAL_DEPLOY',
    url: null,
    note: 'CI runner does not yet perform deploy validation; this is a placeholder until Deployment agent is implemented.'
  };
}

function advanceOneStep(job) {
  // Default phase if missing
  if (!job.phase) job.phase = 'CUSTOMER_DISCOVERY';

  switch (job.phase) {
    case 'CUSTOMER_DISCOVERY': {
      const a = writeArtifact(job, 'customer', 'json', mkCustomerArtifact(job), 'CUSTOMER_DISCOVERY');
      job.artifacts.customer = a.rel;
      setPhase(job, 'PRODUCT', 'customer discovery complete');
      return true;
    }
    case 'PRODUCT': {
      const a = writeArtifact(job, 'product', 'json', mkProductArtifact(job), 'PRODUCT_SPEC');
      job.artifacts.product = a.rel;
      setPhase(job, 'DESIGN', 'product spec complete');
      return true;
    }
    case 'DESIGN': {
      const a = writeArtifact(job, 'design', 'json', mkDesignArtifact(job), 'DESIGN_SPEC');
      job.artifacts.design = a.rel;
      setPhase(job, 'BUILD', 'design spec complete');
      return true;
    }
    case 'BUILD': {
      const a = writeArtifact(job, 'build', 'md', mkBuildPlan(job), 'BUILD_PLAN');
      job.artifacts.buildPlan = a.rel;
      setPhase(job, 'QA', 'build phase (template) complete');
      return true;
    }
    case 'QA': {
      const a = writeArtifact(job, 'qa', 'md', mkQaReport(job), 'QA_REPORT');
      job.artifacts.qa = a.rel;
      setPhase(job, 'DEPLOY', 'qa phase (template) complete');
      return true;
    }
    case 'DEPLOY': {
      const a = writeArtifact(job, 'deploy', 'json', mkDeployReport(job), 'DEPLOY_REPORT');
      job.artifacts.deploy = a.rel;
      setPhase(job, 'HUMAN_REVIEW', 'deploy phase (placeholder) complete');
      job.swarm = job.swarm || {};
      job.swarm.completedAt = nowIso();
      job.history.push({ ts: nowIso(), event: 'SWARM_COMPLETED', data: { mode: 'template' } });
      return true;
    }
    case 'HUMAN_REVIEW':
    case 'DONE':
      return false;
    default:
      // Unknown phase; fail safe.
      job.history = job.history || [];
      job.history.push({ ts: nowIso(), event: 'SWARM_ERROR', data: { error: `Unknown phase: ${job.phase}` } });
      return false;
  }
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

  // Initialize swarm startedAt once
  if (!job.swarm.startedAt) {
    const ts = nowIso();
    job.swarm.startedAt = ts;
    job.swarm.runner = 'github-actions';
    job.history.push({ ts, event: 'SWARM_STARTED', data: { runner: 'github-actions' } });
  }

  // Advance through all remaining phases in one CI run.
  let progressed = false;
  for (let i = 0; i < 20; i++) {
    const did = advanceOneStep(job);
    if (!did) break;
    progressed = true;
  }

  if (!progressed) {
    console.log(`skip (no phase change): ${rel} (phase=${job.phase})`);
    skipped++;
    continue;
  }

  writeJson(runPath, job);
  console.log(`updated: ${rel} (phase=${job.phase})`);
  updated++;
}

console.log(JSON.stringify({ ok: true, updated, skipped }, null, 2));
