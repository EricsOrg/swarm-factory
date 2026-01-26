import BoardClient from '@/app/components/BoardClient';
import { headers } from 'next/headers';
import type { ComponentProps } from 'react';

type BoardRuns = ComponentProps<typeof BoardClient>['runs'];
type BoardInbox = ComponentProps<typeof BoardClient>['inbox'];

type BoardApiResponse = {
  runs?: BoardRuns;
  inbox?: BoardInbox;
};

export default async function Home() {
  let data: BoardApiResponse | null = null;
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'http';
    const baseUrl = host ? `${proto}://${host}` : 'https://swarm-factory.vercel.app';

    const res = await fetch(`${baseUrl}/api/board`, { cache: 'no-store' });
    if (res.ok) data = (await res.json()) as BoardApiResponse;
  } catch {
    // ignore
  }

  const runs = (data?.runs ?? []) as BoardRuns;
  const inbox = (data?.inbox ?? []) as BoardInbox;

  return (
    <div className="min-h-screen p-8 sm:p-16 font-sans bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-5xl flex flex-col gap-8 bg-white dark:bg-black rounded-xl border border-black/10 dark:border-white/15 p-6 sm:p-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">Swarm Factory</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Shared ops dashboard for Eric + CB. Reads from (and now writes to) immutable GitHub artifacts.
          </p>
          <p className="text-sm">
            Repo:{' '}
            <a className="underline font-medium text-zinc-950 dark:text-zinc-50" href="https://github.com/EricsOrg/swarm-factory" target="_blank" rel="noreferrer">
              EricsOrg/swarm-factory
            </a>
          </p>
        </header>

        <section className="rounded-lg border border-black/10 dark:border-white/15 p-4">
          <h2 className="font-medium text-black dark:text-zinc-50">Slack DM trigger</h2>
          <ol className="list-decimal list-inside text-sm mt-2 space-y-1 text-zinc-700 dark:text-zinc-300">
            <li>
              DM CB: <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">build: &lt;your idea&gt;</code>
            </li>
            <li>CB replies with a code and asks for confirmation.</li>
            <li>
              Reply: <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">confirm &lt;code&gt;</code>
              {' '}or{' '}
              <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">cancel &lt;code&gt;</code>
            </li>
          </ol>
        </section>

        {!data ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading board…</p>
        ) : (
          <BoardClient runs={runs} inbox={inbox} />
        )}

        <footer className="text-xs text-zinc-500 pt-4">URL truth &gt; API truth.</footer>
      </main>
    </div>
  );
}
