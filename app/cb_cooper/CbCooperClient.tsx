'use client';

import { useEffect, useMemo, useState } from 'react';

type AgentState = 'idle' | 'working';

type SearchParams = Record<string, string | string[] | undefined>;

type PillId = 'orchestrating' | 'ideating' | 'writingSpecs' | 'handoff' | 'engineering' | 'waiting';

type Pill = { id: PillId; label: string };

const PILL_SET: Pill[] = [
  { id: 'orchestrating', label: 'Orchestrating' },
  { id: 'ideating', label: 'Ideating' },
  { id: 'writingSpecs', label: 'Writing specs' },
  { id: 'handoff', label: 'Handing off to engineers' },
  { id: 'engineering', label: 'Engineering' },
  { id: 'waiting', label: 'Waiting' },
];

function clampState(s: string | null): AgentState | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === 'idle' || v === 'working') return v;
  return null;
}

function clampPillId(s: string | null): PillId | null {
  if (!s) return null;
  const v = s.trim();
  const found = PILL_SET.find((p) => p.id.toLowerCase() === v.toLowerCase());
  return found?.id ?? null;
}

function getParam(searchParams: SearchParams, key: string): string | null {
  const v = searchParams[key];
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

function PillChip({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={
        'relative inline-flex items-center rounded-full border px-3 py-1 text-xs transition ' +
        (active
          ? 'bg-white/10 border-white/25 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_28px_rgba(168,85,247,0.22)]'
          : 'bg-white/[0.04] border-white/10 text-white/55')
      }
      aria-current={active ? 'true' : undefined}
    >
      {active ? <span className="spark" aria-hidden="true" /> : null}
      <span className={active ? 'font-semibold tracking-wide' : 'font-medium'}>{label}</span>

      <style jsx>{`
        .spark {
          position: absolute;
          inset: -1px;
          border-radius: 9999px;
          background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.35), rgba(168, 85, 247, 0.35), transparent);
          mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
          -webkit-mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
          padding: 1px;
          filter: blur(0.2px);
          opacity: 0.85;
          animation: sweep 1.4s linear infinite;
        }
        @keyframes sweep {
          0% {
            transform: translateX(-40%);
            opacity: 0.25;
          }
          20% {
            opacity: 0.95;
          }
          100% {
            transform: translateX(40%);
            opacity: 0.25;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .spark {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

export default function CBCooperClient({ searchParams }: { searchParams: SearchParams }) {
  // Query knobs for demos:
  // ?state=working|idle, ?mock=1 (toggle), ?pill=<pillId>
  const forcedState = useMemo(() => clampState(getParam(searchParams, 'state')), [searchParams]);
  const mock = useMemo(() => {
    const v = (getParam(searchParams, 'mock') ?? '').toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }, [searchParams]);
  const forcedPill = useMemo(() => clampPillId(getParam(searchParams, 'pill')), [searchParams]);

  const [state, setState] = useState<AgentState>('idle');
  const [pill, setPill] = useState<PillId>('orchestrating');

  // Simple mocked “alive” behavior.
  useEffect(() => {
    if (forcedState || !mock) return;
    const id = window.setInterval(() => {
      setState((s) => (s === 'idle' ? 'working' : 'idle'));
    }, 3800);
    return () => window.clearInterval(id);
  }, [forcedState, mock]);

  useEffect(() => {
    if (forcedPill) {
      setPill(forcedPill);
      return;
    }
    if (!mock) return;

    const order: PillId[] = ['orchestrating', 'ideating', 'writingSpecs', 'handoff', 'engineering', 'orchestrating', 'waiting'];
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % order.length;
      setPill(order[i] ?? 'orchestrating');
    }, 5200);
    return () => window.clearInterval(id);
  }, [forcedPill, mock]);

  const effectiveState: AgentState = forcedState ?? (mock ? state : 'idle');

  // “CB aura” copy — intentionally slightly cocky.
  const subtitle = effectiveState === 'working' ? 'Hands moving, brain humming.' : 'Standing by (quietly dangerous).';

  return (
    <section className="flex flex-col items-center gap-4">
      <div className="w-full rounded-lg border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.03] p-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between flex-wrap gap-3">
            <div className="text-sm font-semibold tracking-wide text-white">CB Cooper</div>
            <div className="text-xs text-white/55">State: {effectiveState === 'working' ? 'Working' : 'Idle'}</div>
          </div>
          <div className="text-xs text-white/55">{subtitle}</div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className={`cooperFrame ${effectiveState === 'working' ? 'working' : 'idle'}`} aria-label={`CB Cooper avatar (${effectiveState})`}>
            <CooperAvatar working={effectiveState === 'working'} />
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {PILL_SET.map((p) => (
              <PillChip key={p.id} label={p.label} active={p.id === pill} />
            ))}
          </div>

          <div className="text-[11px] text-white/45">
            Demo knobs:{' '}
            <code className="px-1 py-0.5 rounded bg-white/10 text-white/70">?state=working</code>{' '}
            <span className="opacity-40">·</span>{' '}
            <code className="px-1 py-0.5 rounded bg-white/10 text-white/70">?mock=1</code>{' '}
            <span className="opacity-40">·</span>{' '}
            <code className="px-1 py-0.5 rounded bg-white/10 text-white/70">?pill=engineering</code>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cooperFrame {
          width: 260px;
          height: 260px;
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: radial-gradient(120px 120px at 30% 25%, rgba(56, 189, 248, 0.14), transparent 60%),
            radial-gradient(140px 140px at 70% 70%, rgba(168, 85, 247, 0.12), transparent 60%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.46));
          overflow: hidden;
          display: grid;
          place-items: center;
          color: rgb(244, 244, 245);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
        }

        .idle {
          animation: breathe 2800ms ease-in-out infinite;
        }

        .working {
          animation: workBob 920ms ease-in-out infinite;
        }

        @keyframes breathe {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.015);
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
            transform: translateY(-4px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .idle,
          .working {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

function CooperAvatar({ working }: { working: boolean }) {
  return (
    <svg viewBox="0 0 360 360" className="w-[240px] h-[240px]" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="grad_shell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" stopOpacity="0.85" />
          <stop offset="0.55" stopColor="#a855f7" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fb7185" stopOpacity="0.65" />
        </linearGradient>
        <radialGradient id="grad_core" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="1 0 0 0 0  0 0.7 1 0 0  0 0 1 0 0  0 0 0 0.55 0"
            result="c"
          />
          <feMerge>
            <feMergeNode in="c" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ambient dots */}
      <g opacity="0.55">
        {Array.from({ length: 14 }).map((_, i) => {
          const x = 60 + (i * 19) % 240;
          const y = 70 + ((i * 37) % 200);
          const r = 1.6 + (i % 3) * 0.5;
          return <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" opacity={0.08 + (i % 4) * 0.02} />;
        })}
      </g>

      {/* body */}
      <g className={working ? 'cb-working' : 'cb-idle'}>
        <path
          d="M180 52c64 0 118 46 130 106 9 46-8 84-9 118 0 62-54 98-121 98S59 338 59 276c0-34-18-72-9-118C62 98 116 52 180 52Z"
          fill="url(#grad_shell)"
          opacity="0.95"
          filter="url(#glow)"
        />

        {/* inner core */}
        <ellipse cx="180" cy="196" rx="110" ry="120" fill="url(#grad_core)" />

        {/* visor */}
        <path
          d="M105 155c0-40 34-72 75-72s75 32 75 72-34 92-75 92-75-52-75-92Z"
          fill="#0b1220"
          opacity="0.92"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="2"
        />

        {/* eyes */}
        <g opacity="0.95">
          <rect className="eye" x="145" y="150" width="30" height="10" rx="5" fill="#e5e7eb" />
          <rect className="eye" x="187" y="150" width="30" height="10" rx="5" fill="#e5e7eb" />
          <path d="M160 196c10 10 30 10 40 0" stroke="#e5e7eb" strokeWidth="3" strokeLinecap="round" opacity="0.9" fill="none" />
        </g>

        {/* typing lines */}
        <g className="code" opacity="0.0">
          <path d="M120 228h120" stroke="rgba(255,255,255,0.55)" strokeWidth="3" strokeLinecap="round" />
          <path d="M120 244h90" stroke="rgba(255,255,255,0.42)" strokeWidth="3" strokeLinecap="round" />
          <path d="M120 260h110" stroke="rgba(255,255,255,0.35)" strokeWidth="3" strokeLinecap="round" />
          <rect className="cursor" x="232" y="254" width="8" height="10" rx="2" fill="rgba(56,189,248,0.85)" />
        </g>

        {/* orbiting “tasks” */}
        <g className="orbit" opacity="0.9">
          <circle cx="265" cy="132" r="7" fill="rgba(255,255,255,0.35)" />
          <circle cx="95" cy="230" r="6" fill="rgba(56,189,248,0.4)" />
          <circle cx="260" cy="250" r="5" fill="rgba(168,85,247,0.4)" />
        </g>

        {/* badge */}
        <g opacity="0.9">
          <rect x="132" y="286" width="96" height="26" rx="13" fill="rgba(0,0,0,0.20)" />
          <text x="180" y="304" textAnchor="middle" fontSize="12" fill="#ffffff" opacity="0.85" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
            CB Cooper
          </text>
        </g>
      </g>

      <style>{`
        .eye { transform-origin: center; }
        .cb-idle .eye { animation: blink 6.2s infinite; }
        .cb-working .eye { animation: blink 3.0s infinite; }

        .cb-working .code { opacity: 0.85; animation: codePulse 1.4s ease-in-out infinite; }
        .cb-working .cursor { animation: cursorBlink 0.85s steps(2,end) infinite; }

        .orbit { transform-origin: 180px 200px; }
        .cb-working .orbit { animation: orbit 1.35s linear infinite; }
        .cb-idle .orbit { animation: orbit 4.2s linear infinite; opacity: 0.55; }

        @keyframes blink {
          0%, 92%, 100% { transform: scaleY(1); }
          94%, 96% { transform: scaleY(0.12); }
        }
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes codePulse {
          0%, 100% { transform: translateY(0px); opacity: 0.7; }
          50% { transform: translateY(-2px); opacity: 1; }
        }
        @keyframes cursorBlink {
          0% { opacity: 0.2; }
          100% { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cb-idle .eye, .cb-working .eye, .cb-working .code, .cb-working .cursor, .orbit { animation: none !important; }
        }
      `}</style>
    </svg>
  );
}
