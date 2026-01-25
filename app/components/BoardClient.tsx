'use client';

import { useMemo, useState } from 'react';

type Run = {
  jobId: string;
  code?: string;
  title?: string;
  idea: string;
  phase: string;
  effectivePhase?: string;
  phaseOverridden?: boolean;
  createdAt: string;
};

type InboxItem = {
  id: string;
  idea: string;
  createdAt: string;
  requester: string;
  status: string;
};

const COLUMNS: Array<{ id: string; title: string }> = [
  { id: 'INTAKE', title: 'Inbox (Pending)' },
  { id: 'CUSTOMER_DISCOVERY', title: 'Customer' },
  { id: 'PRODUCT_SYNTHESIS', title: 'Product' },
  { id: 'DESIGN', title: 'Design' },
  { id: 'BUILD', title: 'Build' },
  { id: 'QA', title: 'QA' },
  { id: 'DEPLOY', title: 'Deploy' },
  { id: 'HUMAN_REVIEW', title: 'Review' },
  { id: 'DONE', title: 'Done' },
  { id: 'FAILED', title: 'Failed' }
];

export default function BoardClient(props: { runs: Run[]; inbox: InboxItem[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [idea, setIdea] = useState('');

  const grouped = useMemo(() => {
    const by: Record<string, Run[]> = {};
    for (const c of COLUMNS) by[c.id] = [];
    for (const r of props.runs) {
      const p = r.effectivePhase ?? r.phase;
      (by[p] ?? (by[p] = [])).push(r);
    }
    return by;
  }, [props.runs]);

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
      // simplest: reload
      location.reload();
    } finally {
      setBusy(null);
    }
  }

  function onDragStart(e: React.DragEvent, jobId: string) {
    e.dataTransfer.setData('text/plain', jobId);
    e.dataTransfer.effectAllowed = 'move';
  }

  async function onDrop(e: React.DragEvent, toPhase: string) {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('text/plain');
    if (!jobId) return;
    setBusy(jobId);
    try {
      const res = await fetch('/api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, action: 'SET_PHASE', toPhase })
      });
      if (!res.ok) throw new Error(await res.text());
      location.reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-black/10 dark:border-white/15 p-4">
        <h2 className="font-medium text-black dark:text-zinc-50">Add a card</h2>
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

      <section className="rounded-lg border border-black/10 dark:border-white/15 p-4">
        <h2 className="font-medium text-black dark:text-zinc-50">Inbox Items (web-added)</h2>
        <div className="mt-3 space-y-2">
          {props.inbox.length === 0 ? (
            <p className="text-xs text-zinc-500">—</p>
          ) : (
            props.inbox.map((i) => (
              <div key={i.id} className="rounded-md border border-black/10 dark:border-white/15 p-2">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{i.idea}</p>
                <p className="text-[11px] text-zinc-500 mt-1">{i.createdAt} · {i.requester}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-black dark:text-zinc-50 mb-3">Runs (drag cards between columns)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COLUMNS.map((c) => {
            const items = grouped[c.id] ?? [];
            return (
              <div
                key={c.id}
                className="rounded-lg border border-black/10 dark:border-white/15 p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, c.id)}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-medium text-black dark:text-zinc-50">{c.title}</h3>
                  <span className="text-xs text-zinc-500">{items.length}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {items.map((r) => (
                    <div
                      key={r.jobId}
                      draggable
                      onDragStart={(e) => onDragStart(e, r.jobId)}
                      className="rounded-md border border-black/10 dark:border-white/15 p-2 bg-white/60 dark:bg-black/20"
                      title={r.jobId}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-xs text-zinc-950 dark:text-zinc-50">
                          {r.code ?? r.jobId}
                        </span>
                        <div className="flex items-center gap-2">
                          {r.phaseOverridden ? (
                            <span className="text-[11px] text-zinc-500" title={`base phase: ${r.phase}`}>override</span>
                          ) : null}
                          {busy === r.jobId ? <span className="text-[11px] text-zinc-500">Saving…</span> : null}
                        </div>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1 line-clamp-2">{r.title ?? r.idea}</p>
                      <p className="text-[11px] text-zinc-500 mt-1">{r.createdAt}</p>
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
                              location.reload();
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
                  ))}
                  {items.length === 0 ? <p className="text-xs text-zinc-500">—</p> : null}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Drag/drop writes an immutable decision artifact. The board now shows the <em>effective</em> phase by applying the latest decision overlay.
        </p>
      </section>
    </div>
  );
}
