'use client';

import { useEffect, useMemo, useState } from 'react';

type RequestItem = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  address: string;
  problem: string;
  preferredDate?: string | null;
  preferredTime?: string | null;
  status?: 'PENDING' | 'ACCEPTED';
  latestDecision?: unknown;
};

type BoardResp =
  | { ok: true; requests: RequestItem[] }
  | { ok: false; error: string };

export default function AdminClient() {
  const [data, setData] = useState<BoardResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/plumber/board', { cache: 'no-store' });
      const j = (await res.json()) as BoardResp;
      setData(j);
    } catch (err: unknown) {
      const msg = String((err as { message?: unknown })?.message ?? 'Failed to load');
      setData({ ok: false, error: msg });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const requests = useMemo(() => {
    if (!data || !data.ok) return [];
    return data.requests;
  }, [data]);

  async function accept(id: string) {
    setActioningId(id);
    try {
      const res = await fetch(`/api/plumber/requests/${encodeURIComponent(id)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: '' })
      });
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || 'Accept failed');
      await load();
    } catch (err: unknown) {
      const msg = String((err as { message?: unknown })?.message ?? 'Accept failed');
      alert(msg);
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-black dark:text-zinc-50">Requests</h2>
        <button
          onClick={load}
          className="text-xs rounded-md border border-black/10 dark:border-white/15 px-3 py-1.5 hover:bg-black/[.03] dark:hover:bg-white/[.06]"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      ) : !data ? null : !data.ok ? (
        <div className="rounded-md border border-red-500/30 text-red-700 dark:text-red-300 p-3 text-sm">Error: {data.error}</div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No requests yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <li key={r.id} className="rounded-lg border border-black/10 dark:border-white/15 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-black dark:text-zinc-50 truncate">{r.name}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-black/10 dark:border-white/15">
                      {r.status || 'PENDING'}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">{new Date(r.createdAt).toLocaleString()}</div>
                </div>

                <div className="flex items-center gap-2">
                  {r.status !== 'ACCEPTED' ? (
                    <button
                      onClick={() => accept(r.id)}
                      disabled={actioningId === r.id}
                      className="text-xs rounded-md bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 disabled:opacity-60"
                    >
                      {actioningId === r.id ? 'Accepting…' : 'Accept'}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-zinc-500">Phone</div>
                  <div className="text-zinc-800 dark:text-zinc-200">{r.phone}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Address</div>
                  <div className="text-zinc-800 dark:text-zinc-200">{r.address}</div>
                </div>
              </div>

              <div className="mt-3 text-sm">
                <div className="text-xs text-zinc-500">Problem</div>
                <div className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{r.problem}</div>
              </div>

              {(r.preferredDate || r.preferredTime) && (
                <div className="mt-3 text-sm">
                  <div className="text-xs text-zinc-500">Preferred</div>
                  <div className="text-zinc-800 dark:text-zinc-200">
                    {[r.preferredDate || null, r.preferredTime || null].filter(Boolean).join(' ')}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
