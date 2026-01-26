import AdminClient from './AdminClient';

export default function PlumberAdminPage() {
  return (
    <div className="min-h-screen p-8 sm:p-16 font-sans bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-5xl flex flex-col gap-6 bg-white dark:bg-black rounded-xl border border-black/10 dark:border-white/15 p-6 sm:p-10">
        <header className="flex flex-col gap-2">
          <a className="text-xs underline text-zinc-600 dark:text-zinc-400" href="/plumber">
            ← Back
          </a>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">Admin dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">View and accept booking requests.</p>
        </header>

        <AdminClient />

        <p className="text-xs text-zinc-500">
          Note: This MVP has no auth. Add auth before sharing publicly.
        </p>
      </main>
    </div>
  );
}
