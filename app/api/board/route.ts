import { NextResponse } from 'next/server';

type GhContent = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
};

const OWNER = process.env.GITHUB_OWNER ?? 'EricsOrg';
const REPO = process.env.GITHUB_REPO ?? 'swarm-factory';

async function listDir(dir: string): Promise<GhContent[]> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${dir}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'swarm-factory' },
    next: { revalidate: 5 }
  });
  if (res.status === 404) return [];
  if (!res.ok) return [];
  return (await res.json()) as GhContent[];
}

async function fetchJson(downloadUrl: string) {
  const res = await fetch(downloadUrl, { headers: { 'User-Agent': 'swarm-factory' }, next: { revalidate: 5 } });
  if (!res.ok) return null;
  return await res.json();
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

  // Sort newest first
  runObjs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  inboxObjs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({ ok: true, runs: runObjs, inbox: inboxObjs });
}
