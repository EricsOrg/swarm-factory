import Link from 'next/link';

export default async function PlumberRequestSuccessPage(props: { searchParams: Promise<{ token?: string }> }) {
  const sp = await props.searchParams;
  const token = (sp.token ?? '').trim();

  const statusHref = token ? `/plumber/status/${encodeURIComponent(token)}` : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Request received</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Thanks — we’ll contact you shortly. You can check the request status anytime using the private link below.</p>

      {statusHref ? (
        <div className="mt-6 rounded-md border border-black/10 dark:border-white/15 p-4">
          <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Your status link</div>
          <div className="mt-2 break-all text-sm">
            <Link className="underline" href={statusHref}>
              {statusHref}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-red-500/30 text-red-700 dark:text-red-300 p-4 text-sm">Missing token. Please return to the booking page and submit again.</div>
      )}

      <div className="mt-8">
        <Link className="underline text-sm" href="/plumber">
          Back to plumber home
        </Link>
      </div>
    </main>
  );
}
