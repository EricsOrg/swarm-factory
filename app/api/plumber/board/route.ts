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
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function listDir(dir: string): Promise<GhContent[]> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${dir}`;
  const res = await fetch(url, { headers: ghHeaders(), next: { revalidate: 5 } });
  if (res.status === 404) return [];
  if (!res.ok) return [];
  return (await res.json()) as GhContent[];
}

async function fetchJson(downloadUrl: string) {
  const res = await fetch(downloadUrl, { headers: ghHeaders(), next: { revalidate: 5 } });
  if (!res.ok) return null;
  return await res.json();
}

async function latestDecisionFor(id: string) {
  const dir = `plumber/decisions/${id}`;
  const files = (await listDir(dir)).filter((x) => x.type === 'file' && x.download_url && x.name.endsWith('.json'));
  if (files.length === 0) return null;
  files.sort((a, b) => (a.name < b.name ? 1 : -1));
  return await fetchJson(files[0].download_url!);
}

export async function GET() {
  const reqFiles = (await listDir('plumber/requests'))
    .filter((x) => x.type === 'file' && x.name.endsWith('.json') && x.download_url)
    .slice(0, 100);

  type PlumberRequest = Record<string, unknown> & { id: string; createdAt?: string };
  const reqObjs = (await Promise.all(reqFiles.map((f) => fetchJson(f.download_url!)))).filter(Boolean) as PlumberRequest[];

  const withStatus = await Promise.all(
    reqObjs.map(async (r) => {
      const dec = await latestDecisionFor(r.id).catch(() => null);
      const status = dec?.action === 'ACCEPT' ? 'ACCEPTED' : 'PENDING';
      return { ...r, status, latestDecision: dec };
    })
  );

  withStatus.sort((a, b) => (((a.createdAt as string | undefined) ?? '') < (((b.createdAt as string | undefined) ?? '')) ? 1 : -1));

  return NextResponse.json({ ok: true, requests: withStatus });
}
