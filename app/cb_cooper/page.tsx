import CBCooperClient from '@/app/cb_cooper/CbCooperClient';

export const metadata = {
  title: 'CB Cooper — Swarm Factory',
  description: 'CB Cooper status + avatar view.',
};

type SearchParams = Record<string, string | string[] | undefined>;

export default function CBCooperPage({ searchParams }: { searchParams?: SearchParams }) {
  return (
    <div className="min-h-screen p-8 sm:p-16 font-sans bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl flex flex-col gap-6 bg-white dark:bg-black rounded-xl border border-black/10 dark:border-white/15 p-6 sm:p-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">CB Cooper</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Simple animated avatar + status pills. Use query params to force state or enable a mock toggle.
          </p>
          <p className="text-xs text-zinc-500">
            Examples:{' '}
            <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">/cb_cooper?state=working</code>
            {' · '}
            <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">/cb_cooper?mock=1</code>
          </p>
        </header>

        <CBCooperClient searchParams={searchParams ?? {}} />

        <footer className="text-xs text-zinc-500 pt-2">
          Params: <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">state=idle|working</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">mock=1</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">gateway=ok|starting|down</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">slack=connected|disconnected</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">model=&lt;string&gt;</code>,{' '}
          <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">quota=ok|warning|exceeded</code>
        </footer>
      </main>
    </div>
  );
}
