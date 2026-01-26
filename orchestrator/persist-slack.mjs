#!/usr/bin/env node
import fs from 'node:fs';

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: node orchestrator/persist-slack.mjs <jobId>');
  process.exit(1);
}

const runPath = `runs/${jobId}.json`;
if (!fs.existsSync(runPath)) {
  console.error(`Missing run: ${runPath}`);
  process.exit(2);
}

const j = JSON.parse(fs.readFileSync(runPath, 'utf8'));
const url = 'https://swarm-factory.vercel.app/api/slack/run-channel';

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jobId, code: j.code, title: j.title, idea: j.idea })
});

const json = await res.json().catch(() => null);
if (!res.ok || !json?.ok) {
  console.error('Slack API failed', res.status, json);
  process.exit(3);
}

j.slack = {
  channelId: json.channel.channelId,
  name: json.channel.name,
  thread_ts: json.thread_ts || json.kickoff_ts || null,
  kickoff_ts: json.kickoff_ts || json.thread_ts || null,
  artifactFile: json.artifactFile,
  commitUrl: json.commitUrl
};

j.history = j.history || [];
j.history.push({ ts: new Date().toISOString(), event: 'SLACK_CHANNEL_CREATED', data: j.slack });

fs.writeFileSync(runPath, JSON.stringify(j, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ ok: true, runPath, slack: j.slack }, null, 2));
