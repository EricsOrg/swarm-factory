import { NextResponse } from 'next/server';

type GhContent = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
};

const OWNER = process.env.GITHUB_OWNER ?? 'EricsOrg';
const REPO = process.env.GITHUB_REPO ?? 'swarm-factory';

function ghHeaders() {
  const h: Record<string, string> = { 'User-Agent': 'swarm-factory' };
  // If token is present (we set it in Vercel), use it for higher rate limits.
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function listDir(dir: string): Promise<GhContent[]> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${dir}`;
  const res = await fetch(url, {
    headers: ghHeaders(),
    next: { revalidate: 5 }
  });
  if (res.status === 404) return [];
  if (!res.ok) return [];
  return (await res.json()) as GhContent[];
}

async function fetchJson(downloadUrl: string) {
  const res = await fetch(downloadUrl, { headers: ghHeaders(), next: { revalidate: 5 } });
  if (!res.ok) return null;
  return await res.json();
}

async function latestDecisionFor(jobId: string) {
  const dir = `artifacts/${jobId}/decisions`;
  const files = (await listDir(dir)).filter((x) => x.type === 'file' && x.download_url && x.name.endsWith('.json'));
  if (files.length === 0) return null;
  // filenames are ISO-ish; sorting by name is usually enough.
  files.sort((a, b) => (a.name < b.name ? 1 : -1));
  const latest = files[0];
  return await fetchJson(latest.download_url!);
}

export async function GET() {
  const runs = (await listDir('runs'))
    .filter((x) => x.type === 'file' && x.name.endsWith('.json') && x.download_url)
    .slice(0, 50);

  const inbox = (await listDir('inbox'))
    .filter((x) => x.type === 'file' && x.name.endsWith('.json') && x.download_url)
    .slice(0, 50);

  const runObjs = (await Promise.all(runs.map((f) => fetchJson(f.download_url!)))).filter(Boolean) as any[];
  const inboxObjs = (await Promise.all(inbox.map((f) => fetchJson(f.download_url!)))).filter(Boolean) as any[];

  // Overlay latest decision-derived effective phase (without rewriting the run file)
  const withEffective = await Promise.all(
    runObjs.map(async (r) => {
      const dec = await latestDecisionFor(r.jobId).catch(() => null);
      const effectivePhase = dec?.action === 'SET_PHASE' && dec?.toPhase ? dec.toPhase : r.phase;
      const phaseOverridden = effectivePhase !== r.phase;
      return { ...r, effectivePhase, phaseOverridden, latestDecision: dec };
    })
  );

  // Sort newest first
  withEffective.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  inboxObjs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({ ok: true, runs: withEffective, inbox: inboxObjs });
}
