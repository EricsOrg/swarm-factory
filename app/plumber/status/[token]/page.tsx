import Link from 'next/link';
import { ghFetchJsonFromDownloadUrl, ghGetJson, ghListDir } from '@/lib/github';

type TokenIndex = {
  kind: 'PLUMBER_STATUS_TOKEN';
  token: string;
  requestId: string;
  requestFile: string;
  createdAt?: string;
};

type PlumberRequest = {
  id: string;
  createdAt?: string;
  name?: string;
  phone?: string;
  address?: string;
  problem?: string;
  preferredDate?: string | null;
  preferredTime?: string | null;
};

type PlumberDecision = {
  id: string;
  createdAt?: string;
  kind?: string;
  action?: string;
  note?: string;
};

async function latestDecisionFor(requestId: string): Promise<PlumberDecision | null> {
  const dir = `plumber/decisions/${requestId}`;
  const files = (await ghListDir(dir)).filter((x) => x.type === 'file' && x.download_url && x.name.endsWith('.json'));
  if (files.length === 0) return null;
  files.sort((a, b) => (a.name < b.name ? 1 : -1));
  return await ghFetchJsonFromDownloadUrl<PlumberDecision>(files[0].download_url!);
}

export default async function PlumberStatusPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;

  const idx = await ghGetJson<TokenIndex>(`plumber/status-tokens/${token}.json`);
  if (!idx?.requestFile || !idx.requestId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Status not found</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">That link is invalid or expired.</p>
        <div className="mt-8">
          <Link className="underline text-sm" href="/plumber">
            Back to plumber home
          </Link>
        </div>
      </main>
    );
  }

  const req = await ghGetJson<PlumberRequest>(idx.requestFile);
  const dec = await latestDecisionFor(idx.requestId).catch(() => null);

  const status = dec?.action === 'ACCEPT' ? 'ACCEPTED' : 'PENDING';

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Your request status</h1>

      <div className="mt-6 rounded-md border border-black/10 dark:border-white/15 p-4">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">Current status</div>
        <div className="mt-1 text-lg font-medium text-zinc-950 dark:text-zinc-50">{status}</div>
        {status === 'PENDING' ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">We’re reviewing your request. You’ll be contacted soon.</p>
        ) : (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Your request has been accepted. We’ll reach out to confirm details.</p>
        )}
      </div>

      <div className="mt-6 rounded-md border border-black/10 dark:border-white/15 p-4">
        <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Request details</div>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="grid grid-cols-3 gap-3">
            <dt className="text-zinc-600 dark:text-zinc-400">Name</dt>
            <dd className="col-span-2 text-zinc-950 dark:text-zinc-50">{req?.name ?? '—'}</dd>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <dt className="text-zinc-600 dark:text-zinc-400">Address</dt>
            <dd className="col-span-2 text-zinc-950 dark:text-zinc-50">{req?.address ?? '—'}</dd>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <dt className="text-zinc-600 dark:text-zinc-400">Problem</dt>
            <dd className="col-span-2 text-zinc-950 dark:text-zinc-50 whitespace-pre-wrap">{req?.problem ?? '—'}</dd>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <dt className="text-zinc-600 dark:text-zinc-400">Preferred</dt>
            <dd className="col-span-2 text-zinc-950 dark:text-zinc-50">
              {req?.preferredDate || req?.preferredTime ? `${req?.preferredDate ?? ''} ${req?.preferredTime ?? ''}`.trim() : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {dec ? (
        <div className="mt-6 rounded-md border border-black/10 dark:border-white/15 p-4">
          <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Latest update</div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              <span className="font-medium">Action:</span> {dec.action ?? '—'}
            </div>
            {dec.note ? (
              <div className="mt-1">
                <span className="font-medium">Note:</span> {dec.note}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <Link className="underline text-sm" href="/plumber">
          Back to plumber home
        </Link>
      </div>
    </main>
  );
}
