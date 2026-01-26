'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ArtifactSummary = {
  hasSpec: boolean;
  decisionCount: number;
  latestDecisionFile: string | null;
};

type Run = {
  jobId: string;
  code?: string;
  title?: string;
  idea: string;
  phase: string;
  effectivePhase?: string;
  phaseOverridden?: boolean;
  latestDecision?: { action?: string; toPhase?: string; agent?: string | null; pipeline?: boolean | null } | null;
  latestPhaseDecision?: { action?: string; toPhase?: string } | null;
  latestAssignmentDecision?: { action?: string; agent?: string | null; pipeline?: boolean | null } | null;
  assignment?: { agent: string | null; pipeline: boolean | null };
  artifactSummary?: ArtifactSummary;
  createdAt: string;
  requester?: string;
};

type InboxItem = {
  id: string;
  idea: string;
  createdAt: string;
  requester: string;
  status: string;
};

type LaneId = 'INTAKE' | 'CUSTOMER' | 'PRODUCT' | 'DESIGN' | 'ENGINEERING' | 'QA' | 'DEPLOY' | 'DONE';

type Lane = { id: LaneId; title: string; hint: string };

const LANES: Lane[] = [
  { id: 'INTAKE', title: 'INBOX / INTAKE', hint: 'Unassigned work + early discovery' },
  { id: 'CUSTOMER', title: 'CUSTOMER', hint: 'Customer discovery / feedback loop' },
  { id: 'PRODUCT', title: 'PRODUCT', hint: 'Product framing / prioritization' },
  { id: 'DESIGN', title: 'DESIGN', hint: 'Specs, UX, architecture' },
  { id: 'ENGINEERING', title: 'ENGINEERING', hint: 'Implementation' },
  { id: 'QA', title: 'QA', hint: 'Testing / review' },
  { id: 'DEPLOY', title: 'DEPLOY', hint: 'Shipping / release' },
  { id: 'DONE', title: 'DONE', hint: 'Complete (or failed)' }
];

function laneForRun(r: Run): LaneId {
  const phase = (r.effectivePhase ?? r.phase ?? '').toUpperCase();
  if (phase === 'DONE' || phase === 'FAILED') return 'DONE';

  const agent = (r.assignment?.agent ?? '').toLowerCase();
  if (agent === 'customer') return 'CUSTOMER';
  if (agent === 'product') return 'PRODUCT';
  if (agent === 'designer') return 'DESIGN';
  if (agent === 'coder') return 'ENGINEERING';
  if (agent === 'qa') return 'QA';
  if (agent === 'deploy') return 'DEPLOY';

  return 'INTAKE';
}

function agentForLane(lane: LaneId): Run['assignment'] {
  if (lane === 'CUSTOMER') return { agent: 'customer', pipeline: true };
  if (lane === 'PRODUCT') return { agent: 'product', pipeline: true };
  if (lane === 'DESIGN') return { agent: 'designer', pipeline: true };
  if (lane === 'ENGINEERING') return { agent: 'coder', pipeline: true };
  if (lane === 'QA') return { agent: 'qa', pipeline: true };
  if (lane === 'DEPLOY') return { agent: 'deploy', pipeline: true };
  return { agent: null, pipeline: null };
}

function shortId(jobId: string) {
  if (!jobId) return '—';
  return jobId.length > 10 ? `${jobId.slice(0, 6)}…${jobId.slice(-4)}` : jobId;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function Badge(props: { children: React.ReactNode; title?: string; tone?: 'neutral' | 'warn' | 'good' | 'bad' }) {
  const tone = props.tone ?? 'neutral';
  const cls =
    tone === 'good'
      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : tone === 'warn'
        ? 'border-amber-400/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
        : tone === 'bad'
          ? 'border-red-400/40 bg-red-500/10 text-red-800 dark:text-red-200'
          : 'border-black/10 dark:border-white/15 bg-black/[.03] dark:bg-white/[.06] text-zinc-700 dark:text-zinc-300';

  return (
    <span
      title={props.title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4 ${cls}`}
    >
      {props.children}
    </span>
  );
}

export default function BoardClient(props: { runs: Run[]; inbox: InboxItem[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [idea, setIdea] = useState('');

  const [runs, setRuns] = useState<Run[]>(props.runs);
  const [inbox, setInbox] = useState<InboxItem[]>(props.inbox);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const draggingJobId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRefreshError(null);
      const res = await fetch('/api/board', { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { runs?: Run[]; inbox?: InboxItem[] };
      setRuns(data.runs ?? []);
      setInbox(data.inbox ?? []);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : 'Refresh failed');
    }
  }, []);

  useEffect(() => {
    // light auto-refresh; keep it simple + predictable
    const t = setInterval(() => {
      void refresh();
    }, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  const grouped = useMemo(() => {
    const by: Record<LaneId, Run[]> = {
      INTAKE: [],
      CUSTOMER: [],
      PRODUCT: [],
      DESIGN: [],
      ENGINEERING: [],
      QA: [],
      DEPLOY: [],
      DONE: []
    };
    for (const r of runs) {
      const lane = laneForRun(r);
      by[lane].push(r);
    }
    return by;
  }, [runs]);

  async function addInbox() {
    const v = idea.trim();
    if (!v) return;
    setBusy('add');
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: v, requester: 'web:Eric' })
      });
      if (!res.ok) throw new Error(await res.text());
      setIdea('');
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  function onDragStart(e: React.DragEvent, jobId: string) {
    draggingJobId.current = jobId;
    e.dataTransfer.setData('text/plain', jobId);
    e.dataTransfer.effectAllowed = 'move';
  }

  async function onDrop(e: React.DragEvent, toLane: LaneId) {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('text/plain') || draggingJobId.current;
    if (!jobId) return;

    setBusy(jobId);
    try {
      // Lanes are primarily "who owns the next step"; we write an immutable assignment decision.
      // Keep legacy phase override support for INTAKE + DONE.
      if (toLane === 'DONE') {
        const res = await fetch('/api/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, action: 'SET_PHASE', toPhase: 'DONE' })
        });
        if (!res.ok) throw new Error(await res.text());
      } else if (toLane === 'INTAKE') {
        const res = await fetch('/api/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, action: 'SET_PHASE', toPhase: 'INTAKE' })
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const a = agentForLane(toLane);
        const res = await fetch('/api/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, action: 'ASSIGN_AGENT', agent: a?.agent, pipeline: true })
        });
        if (!res.ok) throw new Error(await res.text());
      }

      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const inboxForIntake = useMemo(() => inbox.filter((i) => (i.status ?? '').toUpperCase() !== 'ARCHIVED'), [inbox]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-black/10 dark:border-white/15 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-medium text-black dark:text-zinc-50">Board</h2>
            <p className="text-xs text-zinc-500 mt-1">Auto-refreshes every 10s. Drag runs across gates to write an immutable decision artifact.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lastUpdated ? <Badge title={lastUpdated}>updated {fmtTime(lastUpdated)}</Badge> : <Badge>live</Badge>}
              {refreshError ? <Badge tone="bad" title={refreshError}>refresh error</Badge> : null}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void refresh()}
              className="text-[12px] rounded-md border border-black/10 dark:border-white/15 px-3 py-2 hover:bg-black/[.03] dark:hover:bg-white/[.04]"
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-black/10 dark:border-white/15 p-4">
        <h2 className="font-medium text-black dark:text-zinc-50">Add a story (INTAKE)</h2>
        <p className="text-xs text-zinc-500 mt-1">Creates an inbox artifact in GitHub (no Slack needed).</p>
        <div className="mt-3 flex gap-2">
          <input
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="New idea / task…"
            className="flex-1 rounded-md border border-black/10 dark:border-white/15 bg-white dark:bg-black px-3 py-2 text-sm"
          />
          <button
            disabled={busy === 'add'}
            onClick={addInbox}
            className="rounded-md bg-black text-white dark:bg-white dark:text-black px-3 py-2 text-sm"
          >
            {busy === 'add' ? 'Adding…' : 'Add'}
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">Kanban</h2>
          <p className="text-xs text-zinc-500">Runs: {runs.length}</p>
        </div>

        <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
          {LANES.map((g) => {
            const items = grouped[g.id] ?? [];
            const intakeInboxCount = g.id === 'INTAKE' ? inboxForIntake.length : 0;

            return (
              <div
                key={g.id}
                className="min-w-[280px] w-[280px] sm:min-w-[320px] sm:w-[320px] rounded-lg border border-black/10 dark:border-white/15 p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => void onDrop(e, g.id)}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-black dark:text-zinc-50">{g.title}</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{g.hint}</p>
                  </div>
                  <div className="text-xs text-zinc-500 tabular-nums">{items.length}{g.id === 'INTAKE' ? ` + ${intakeInboxCount}` : ''}</div>
                </div>

                {g.id === 'INTAKE' ? (
                  <div className="mt-3">
                    <p className="text-[11px] text-zinc-500">Inbox stories</p>
                    <div className="mt-2 space-y-2">
                      {inboxForIntake.length === 0 ? (
                        <p className="text-xs text-zinc-500">—</p>
                      ) : (
                        inboxForIntake.slice(0, 10).map((i) => (
                          <div key={i.id} className="rounded-md border border-black/10 dark:border-white/15 p-2 bg-white/60 dark:bg-black/20">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3">{i.idea}</p>
                              <Badge tone="neutral">inbox</Badge>
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-1">{fmtTime(i.createdAt)} · {i.requester}</p>
                          </div>
                        ))
                      )}
                      {inboxForIntake.length > 10 ? (
                        <p className="text-[11px] text-zinc-500">+ {inboxForIntake.length - 10} more…</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-3">
                  <p className="text-[11px] text-zinc-500">Runs</p>
                  <div className="mt-2 space-y-2">
                    {items.map((r) => {
                      const p = (r.effectivePhase ?? r.phase ?? '').toUpperCase();
                      const isFailed = p === 'FAILED';
                      const summary = r.artifactSummary;

                      return (
                        <div
                          key={r.jobId}
                          draggable
                          onDragStart={(e) => onDragStart(e, r.jobId)}
                          className="rounded-md border border-black/10 dark:border-white/15 p-2 bg-white/60 dark:bg-black/20"
                          title={r.jobId}
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="font-mono text-xs text-zinc-950 dark:text-zinc-50">{r.code ?? shortId(r.jobId)}</span>
                            <div className="flex items-center gap-2">
                              {busy === r.jobId ? <Badge>saving…</Badge> : null}
                              {isFailed ? <Badge tone="bad">failed</Badge> : null}
                              {r.phaseOverridden ? <Badge tone="warn" title={`base phase: ${r.phase}`}>override</Badge> : null}
                            </div>
                          </div>

                          <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1 line-clamp-3">{r.title ?? r.idea}</p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge title={`effective phase: ${p}`}>{p || '—'}</Badge>
                            {r.assignment?.agent ? (
                              <Badge title="current assignment">agent {String(r.assignment.agent).toUpperCase()}</Badge>
                            ) : (
                              <Badge tone="neutral" title="current assignment">unassigned</Badge>
                            )}
                            {r.assignment?.pipeline ? <Badge tone="good" title="in pipeline">pipeline</Badge> : null}
                            {summary ? (
                              <>
                                <Badge tone={summary.hasSpec ? 'good' : 'neutral'}>{summary.hasSpec ? 'spec' : 'no spec'}</Badge>
                                <Badge title={summary.latestDecisionFile ? `latest decision: ${summary.latestDecisionFile}` : undefined}>
                                  decisions {summary.decisionCount}
                                </Badge>
                              </>
                            ) : null}
                          </div>

                          <p className="text-[11px] text-zinc-500 mt-2">{fmtTime(r.createdAt)}{r.requester ? ` · ${r.requester}` : ''}</p>

                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={async () => {
                                setBusy(r.jobId);
                                try {
                                  const res = await fetch('/api/vercel/project', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ jobId: r.jobId })
                                  });
                                  if (!res.ok) throw new Error(await res.text());
                                  await refresh();
                                } finally {
                                  setBusy(null);
                                }
                              }}
                              className="text-[11px] rounded border border-black/10 dark:border-white/15 px-2 py-1 hover:bg-black/[.03] dark:hover:bg-white/[.04]"
                            >
                              Create Vercel Project
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 ? <p className="text-xs text-zinc-500">—</p> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-zinc-500 mt-3">
          Lanes represent ownership (ASSIGN_AGENT). Phase overrides (SET_PHASE) are still supported for INTAKE/DONE.
        </p>
      </section>
    </div>
  );
}
