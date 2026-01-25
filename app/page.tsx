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
          <h2 className="text-lg font-medium text-black dark:text-zinc-50">Ops Board (v0)</h2>
          {!data ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No run data yet (or GitHub rate-limited). Try again in a bit.</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No runs committed yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ['INTAKE', 'Inbox'],
                ['CUSTOMER_DISCOVERY', 'Customer'],
                ['PRODUCT_SYNTHESIS', 'Product'],
                ['DESIGN', 'Design'],
                ['BUILD', 'Build'],
                ['QA', 'QA'],
                ['DEPLOY', 'Deploy'],
                ['HUMAN_REVIEW', 'Review'],
                ['DONE', 'Done'],
                ['FAILED', 'Failed']
              ] as const).map(([phase, label]) => {
                const items = runs.filter((r) => r.phase === phase);
                return (
                  <div key={phase} className="rounded-lg border border-black/10 dark:border-white/15 p-3">
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-medium text-black dark:text-zinc-50">{label}</h3>
                      <span className="text-xs text-zinc-500">{items.length}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {items.map((r) => (
                        <a
                          key={r.jobId}
                          href={`https://github.com/EricsOrg/swarm-factory/blob/main/runs/${r.jobId}.json`}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-md border border-black/10 dark:border-white/15 p-2 hover:bg-black/[.03] dark:hover:bg-white/[.04]"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="font-mono text-xs text-zinc-950 dark:text-zinc-50">
                              {r.code ?? r.jobId}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1 line-clamp-2">{r.title ?? r.idea}</p>
                          <p className="text-[11px] text-zinc-500 mt-1">{r.createdAt}</p>
                        </a>
                      ))}
                      {items.length === 0 ? (
                        <p className="text-xs text-zinc-500">—</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-zinc-500 mt-2">
            Actions (buttons/drag) next. For now, actions happen in Slack and artifacts live in GitHub.
          </p>
        </section>

        <footer className="text-xs text-zinc-500 pt-4">URL truth &gt; API truth.</footer>
      </main>
    </div>
  );
}
