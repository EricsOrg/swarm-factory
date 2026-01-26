# Dispatcher loop (minimal safe version)

This repo includes a **minimal, idempotent dispatcher tick** that scans `runs/` + optional decision artifacts for `ASSIGN_AGENT` events and writes **dispatch markers** into the repo so other controllers (e.g. Clawdbot main session / an LLM cron agent) can safely act exactly-once.

## What it does

- Scans repo-backed run files: `runs/<jobId>.json`
- Scans optional decision artifacts (if they exist): `artifacts/<jobId>/decisions/*.json`
- Finds events with:
  - `event: "ASSIGN_AGENT"` (case-insensitive)
  - or `type: "ASSIGN_AGENT"`
- For each **unprocessed** assignment, writes a marker file:

```
artifacts/<jobId>/dispatch/<ts>-<role>.json
```

The marker includes a stable `dispatchKey` so re-running the dispatcher (or concurrent runners) does **not** duplicate work.

## Marker format

Each marker is JSON:

```jsonc
{
  "kind": "DISPATCH_REQUEST",
  "createdAt": "2026-01-26T12:34:56.000Z",
  "jobId": "<uuid>",
  "code": "<human-code>",
  "title": "<title>",
  "dispatchKey": "<stable-key>",
  "assignEvent": { "ts": "...", "event": "ASSIGN_AGENT", "data": { "role": "coder" } },
  "requestedRole": "coder",
  "pool": null,
  "status": "QUEUED"
}
```

A downstream controller should:
- spawn the appropriate subagent(s) for `requestedRole` (e.g. `designer | coder | qa | deploy`)
- optionally write progress back (e.g. update `status` in-place or write follow-up markers)

## Running locally

```bash
npm run swarm:dispatch:tick
```

Dry run:

```bash
npm run swarm:dispatch:tick -- --dryRun
```

With git pull + commit + push (recommended for cron):

```bash
npm run swarm:dispatch:tick -- --gitPull --gitCommit --gitPush
```

## Gateway cron (every 1 minute)

Create a Gateway cron job that runs from the repo root:

- **Schedule:** `*/1 * * * *`
- **Command:**

```bash
cd /d C:\Users\mrmar\clawd\swarm-factory && npm run swarm:dispatch:tick -- --gitPull --gitCommit --gitPush
```

Notes:
- The dispatcher is safe to run frequently; it will not duplicate dispatch markers.
- The `--gitCommit --gitPush` flags are what make the marker durable across machines.

## Producing ASSIGN_AGENT events

This dispatcher looks for `ASSIGN_AGENT` events either in:
- `run.history[]` entries, or
- `artifacts/<jobId>/decisions/*.json` entries

An example `run.history[]` entry:

```json
{ "ts": "2026-01-26T12:00:00Z", "event": "ASSIGN_AGENT", "data": { "role": "coder", "pool": "default" } }
```
