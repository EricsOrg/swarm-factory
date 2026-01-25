#!/usr/bin/env node
import path from 'node:path';
import { createJob, pendingPath, writeJson } from './_lib.mjs';

// Usage: node orchestrator/intake.mjs --idea "..." --requester "slack:U123" 
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const idea = getArg('--idea');
const requester = getArg('--requester') || 'unknown';

if (!idea || !idea.trim()) {
  console.error('Missing --idea');
  process.exit(1);
}

const job = createJob({ idea: idea.trim(), requester });
const p = pendingPath(job.jobId);
writeJson(p, job);

// Print machine-readable output for the orchestrator (CB) to parse.
process.stdout.write(
  JSON.stringify(
    {
      jobId: job.jobId,
      pendingFile: path.relative(process.cwd(), p)
    },
    null,
    2
  )
);
