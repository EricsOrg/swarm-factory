export default async function Home() {
  let data: any = null;
  try {
    const res = await fetch('https://swarm-factory.vercel.app/api/runs', { cache: 'no-store' });
    if (res.ok) data = await res.json();
  } catch {
    // ignore
  }

  const runs = (data?.runs ?? []) as any[];

  return (
    <div className="min-h-screen p-8 sm:p-16 font-sans bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl flex flex-col gap-8 bg-white dark:bg-black rounded-xl border border-black/10 dark:border-white/15 p-6 sm:p-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">Swarm Factory</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Canonical brain + run artifacts. Slack DM intake is orchestrated by CB (Clawdbot).
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
            <li>CB replies with a jobId and asks for confirmation.</li>
            <li>
              Reply: <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">confirm &lt;code&gt;</code>
              {' '}or{' '}
              <code className="px-1 py-0.5 rounded bg-black/[.05] dark:bg-white/[.06]">cancel &lt;code&gt;</code>
            </li>
          </ol>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">Runs</h2>
          {!data ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No run data yet (or GitHub rate-limited). Try again in a bit.</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No runs committed yet.</p>
          ) : (
            <ul className="space-y-2">
              {runs.map((r) => (
                <li key={r.jobId} className="rounded-md border border-black/10 dark:border-white/15 p-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-mono text-sm text-zinc-950 dark:text-zinc-50">{r.jobId}</span>
                      <span className="text-xs text-zinc-500">{r.phase}</span>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{r.idea}</p>
                    <p className="text-xs text-zinc-500">Created: {r.createdAt}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="text-xs text-zinc-500 pt-4">URL truth &gt; API truth.</footer>
      </main>
    </div>
  );
}
