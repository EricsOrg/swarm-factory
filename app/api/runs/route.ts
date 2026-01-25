import { NextResponse } from 'next/server';

type GhContent = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
};

const OWNER = 'EricsOrg';
const REPO = 'swarm-factory';
const RUNS_PATH = 'runs';

export async function GET() {
  const base = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${RUNS_PATH}`;

  const listRes = await fetch(base, {
    headers: {
      // Avoid aggressive caching; still subject to GitHub API caching.
      'User-Agent': 'swarm-factory'
    },
    // Revalidate frequently; this is fine for an MVP.
    next: { revalidate: 10 }
  });

  if (!listRes.ok) {
    return NextResponse.json(
      { ok: false, error: `Failed to list runs: ${listRes.status}` },
      { status: 500 }
    );
  }

  const items = (await listRes.json()) as GhContent[];
  const files = items.filter((x) => x.type === 'file' && x.name.endsWith('.json'));

  const runs = await Promise.all(
    files.map(async (f) => {
      if (!f.download_url) return null;
      const r = await fetch(f.download_url, {
        headers: { 'User-Agent': 'swarm-factory' },
        next: { revalidate: 10 }
      });
      if (!r.ok) return null;
      const json = await r.json();
      return { file: f.name, path: f.path, ...json };
    })
  );

  const cleaned = runs.filter(Boolean) as any[];
  cleaned.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json({ ok: true, count: cleaned.length, runs: cleaned });
}
