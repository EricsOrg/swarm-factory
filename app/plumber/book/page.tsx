import BookingFormClient from './BookingFormClient';

export default function PlumberBookPage() {
  return (
    <div className="min-h-screen p-8 sm:p-16 font-sans bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl flex flex-col gap-6 bg-white dark:bg-black rounded-xl border border-black/10 dark:border-white/15 p-6 sm:p-10">
        <header className="flex flex-col gap-2">
          <a className="text-xs underline text-zinc-600 dark:text-zinc-400" href="/plumber">
            ← Back
          </a>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">Book a plumber</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Fill this out and we’ll confirm by phone/text.</p>
        </header>

        <BookingFormClient />

        <p className="text-xs text-zinc-500">Tip: admin can view requests at /plumber/admin.</p>
      </main>
    </div>
  );
}
