'use client';

import { useEffect, useMemo, useState } from 'react';

type AgentState = 'idle' | 'working';

type SearchParams = Record<string, string | string[] | undefined>;

type PillTone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';

function toneForValue(value: string): PillTone {
  const v = value.toLowerCase();
  if (['ok', 'connected', 'ready', 'healthy'].includes(v)) return 'good';
  if (['starting', 'warning', 'degraded', 'slow'].includes(v)) return 'warn';
  if (['down', 'disconnected', 'error', 'exceeded', 'blocked'].includes(v)) return 'bad';
  if (v.startsWith('gpt') || v.includes('model')) return 'info';
  return 'neutral';
}

function Pill({ label, value }: { label: string; value: string }) {
  const tone = toneForValue(value);
  const toneClass =
    tone === 'good'
      ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20'
      : tone === 'warn'
        ? 'bg-amber-500/10 text-amber-900 dark:text-amber-300 border-amber-500/20'
        : tone === 'bad'
          ? 'bg-rose-500/10 text-rose-900 dark:text-rose-300 border-rose-500/20'
          : tone === 'info'
            ? 'bg-sky-500/10 text-sky-900 dark:text-sky-300 border-sky-500/20'
            : 'bg-zinc-500/10 text-zinc-800 dark:text-zinc-300 border-zinc-500/20';

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${toneClass}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function clampState(s: string | null): AgentState | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === 'idle' || v === 'working') return v;
  return null;
}

export default function CBCooperClient({ searchParams }: { searchParams: SearchParams }) {
  const get = (key: string): string | null => {
    const v = searchParams[key];
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v[0] ?? null;
    return null;
  };

  const forcedState = useMemo(() => clampState(get('state')), [searchParams]);
  const mock = useMemo(() => {
    const v = (get('mock') ?? '').toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }, [searchParams]);

  const [state, setState] = useState<AgentState>('idle');

  // forcedState always wins; otherwise we only animate when mock=1.
  useEffect(() => {
    if (forcedState || !mock) return;

    const id = window.setInterval(() => {
      setState((s) => (s === 'idle' ? 'working' : 'idle'));
    }, 3500);

    return () => window.clearInterval(id);
  }, [forcedState, mock]);

  const effectiveState: AgentState = forcedState ?? (mock ? state : 'idle');

  const gateway = get('gateway') ?? 'ok';
  const slack = get('slack') ?? 'connected';
  const model = get('model') ?? 'gpt-5.2';
  const quota = get('quota') ?? 'ok';

  const subtitle = effectiveState === 'working' ? 'Working…' : 'Idle';

  return (
    <section className="flex flex-col items-center gap-4">
      <div className="w-full rounded-lg border border-black/10 dark:border-white/15 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium text-black dark:text-zinc-50">CB Cooper</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">State: {subtitle}</div>
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            <Pill label="Gateway" value={gateway} />
            <Pill label="Slack" value={slack} />
            <Pill label="Model" value={model} />
            <Pill label="Quota" value={quota} />
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <div className={`cooperFrame ${effectiveState === 'working' ? 'working' : 'idle'}`} aria-label={`CB Cooper avatar (${effectiveState})`}>
            <svg className="cooperSvg" viewBox="0 0 200 200" role="img" aria-hidden="true">
              {/* background blob */}
              <path
                d="M38 120c-8-26 7-63 33-79 25-15 61-11 81 10 20 21 24 57 9 82-15 25-49 38-78 30-29-9-38-17-45-43z"
                fill="currentColor"
                opacity="0.08"
              />

              {/* head */}
              <circle cx="105" cy="92" r="48" fill="currentColor" opacity="0.16" />
              <circle cx="105" cy="92" r="42" fill="currentColor" opacity="0.22" />

              {/* face */}
              <circle cx="90" cy="88" r="6" fill="currentColor" opacity="0.65" />
              <circle cx="124" cy="88" r="6" fill="currentColor" opacity="0.65" />
              <path d="M92 112c10 10 28 10 38 0" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.55" fill="none" />

              {/* little badge */}
              <rect x="70" y="142" width="80" height="22" rx="11" fill="currentColor" opacity="0.12" />
              <text x="110" y="158" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6" fontFamily="ui-sans-serif, system-ui">
                CB COOPER
              </text>

              {/* gear (spins while working) */}
              <g className="gear" transform="translate(0 0)">
                <path
                  d="M160 72l8 4-3 10 6 7-7 8-10-3-4 8h-10l-4-8-10 3-7-8 6-7-3-10 8-4 1-10h10l1 10z"
                  fill="currentColor"
                  opacity="0.35"
                />
                <circle cx="146" cy="86" r="8" fill="currentColor" opacity="0.18" />
              </g>

              {/* sparks (only in working) */}
              <g className="sparks" opacity="0.0">
                <path d="M40 66l10 4-10 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M46 52l8 6-10 1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M52 80l8-6-10-1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </g>
            </svg>
          </div>

          <div className="text-xs text-zinc-500">
            Tip: <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">?state=working</code> to force animation, or{' '}
            <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">?mock=1</code> to auto-toggle.
          </div>
        </div>
      </div>

      <style jsx>{`
        .cooperFrame {
          width: 220px;
          height: 220px;
          border-radius: 28px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.05));
          display: grid;
          place-items: center;
          color: rgb(24, 24, 27); /* zinc-900 */
          overflow: hidden;
        }

        :global(.dark) .cooperFrame {
          border-color: rgba(255, 255, 255, 0.15);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
          color: rgb(244, 244, 245); /* zinc-100 */
        }

        .cooperSvg {
          width: 200px;
          height: 200px;
        }

        /* Idle: gentle breathing */
        .idle {
          animation: breathe 2600ms ease-in-out infinite;
        }

        /* Working: bob + faster gear */
        .working {
          animation: workBob 900ms ease-in-out infinite;
        }

        .gear {
          transform-origin: 146px 86px;
        }

        .working .gear {
          animation: spin 900ms linear infinite;
        }

        .idle .gear {
          animation: spin 3800ms linear infinite;
          opacity: 0.75;
        }

        .working .sparks {
          opacity: 0.55;
          animation: flicker 520ms steps(2, end) infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes breathe {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes workBob {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        @keyframes flicker {
          0% {
            opacity: 0.15;
          }
          100% {
            opacity: 0.75;
          }
        }
      `}</style>
    </section>
  );
}
