'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type ApiResp =
  | { ok: true; item: Record<string, unknown>; commitUrl?: string; statusToken?: string; statusUrl?: string }
  | { ok: false; error: string };

export default function BookingFormClient() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [problem, setProblem] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resp, setResp] = useState<ApiResp | null>(null);

  const canSubmit = useMemo(() => {
    return name.trim() && phone.trim() && address.trim() && problem.trim();
  }, [name, phone, address, problem]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResp(null);

    try {
      const r = await fetch('/api/plumber/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          address,
          problem,
          preferredDate: preferredDate || null,
          preferredTime: preferredTime || null
        })
      });
      const data = (await r.json()) as ApiResp;
      setResp(data);
      if (data.ok) {
        setName('');
        setPhone('');
        setAddress('');
        setProblem('');
        setPreferredDate('');
        setPreferredTime('');

        if (data.statusToken) {
          router.push(`/plumber/request/success?token=${encodeURIComponent(data.statusToken)}`);
        }
      }
    } catch (err: unknown) {
      const msg = String((err as { message?: unknown })?.message ?? 'Request failed');
      setResp({ ok: false, error: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Name</span>
          <input className="rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Phone</span>
          <input className="rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">Address</span>
        <input className="rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">What’s going on?</span>
        <textarea className="min-h-28 rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2" value={problem} onChange={(e) => setProblem(e.target.value)} />
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Preferred date (optional)</span>
          <input type="date" className="rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Preferred time (optional)</span>
          <input type="time" className="rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
        </label>
      </div>

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="inline-flex items-center justify-center rounded-md bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Request appointment'}
      </button>

      {resp && (
        <div className="text-sm">
          {resp.ok ? (
            <div className="rounded-md border border-black/10 dark:border-white/15 p-3">
              <div className="font-medium text-black dark:text-zinc-50">Request received.</div>
              <div className="text-zinc-600 dark:text-zinc-400">We’ll contact you to confirm.</div>
              {'commitUrl' in resp && resp.commitUrl ? (
                <a className="underline text-xs" href={resp.commitUrl} target="_blank" rel="noreferrer">
                  GitHub commit
                </a>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border border-red-500/30 text-red-700 dark:text-red-300 p-3">Error: {resp.error}</div>
          )}
        </div>
      )}
    </form>
  );
}
