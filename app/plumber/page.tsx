export default function PlumberHome() {
  return (
    <div className="min-h-screen p-8 sm:p-16 font-sans bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl flex flex-col gap-6 bg-white dark:bg-black rounded-xl border border-black/10 dark:border-white/15 p-6 sm:p-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">Plumber Scheduling (MVP)</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Minimal booking form + admin dashboard. Requests are stored as immutable JSON in this repo via GitHub Contents API.
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <a
            className="inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/[.03] dark:hover:bg-white/[.06]"
            href="/plumber/book"
          >
            Book an appointment
          </a>
          <a
            className="inline-flex items-center justify-center rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/[.03] dark:hover:bg-white/[.06]"
            href="/plumber/admin"
          >
            Admin dashboard
          </a>
        </section>
      </main>
    </div>
  );
}
