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

async function artifactSummaryFor(jobId: string) {
  const baseDir = `artifacts/${jobId}`;
  const top = await listDir(baseDir);
  const hasSpec = top.some((x) => x.type === 'file' && x.name.startsWith('spec') && x.name.endsWith('.json'));
  const decisionsDir = `${baseDir}/decisions`;
  const decisions = (await listDir(decisionsDir)).filter((x) => x.type === 'file' && x.name.endsWith('.json'));
  decisions.sort((a, b) => (a.name < b.name ? 1 : -1));
  const latestDecisionFile = decisions[0]?.name ?? null;

  return {
    hasSpec,
    decisionCount: decisions.length,
    latestDecisionFile
  };
}

export async function GET() {
  const runs = (await listDir('runs'))
    .filter((x) => x.type === 'file' && x.name.endsWith('.json') && x.download_url)
    .slice(0, 50);

  const inbox = (await listDir('inbox'))
    .filter((x) => x.type === 'file' && x.name.endsWith('.json') && x.download_url)
    .slice(0, 50);

  type RunJson = Record<string, unknown> & { jobId: string; phase?: string; createdAt?: string };
  type InboxJson = Record<string, unknown> & { createdAt?: string };

  const runObjs = (await Promise.all(runs.map((f) => fetchJson(f.download_url!)))).filter(Boolean) as RunJson[];
  const inboxObjs = (await Promise.all(inbox.map((f) => fetchJson(f.download_url!)))).filter(Boolean) as InboxJson[];

  // Overlay latest decision-derived effective phase (without rewriting the run file)
  type Decision = { action?: string; toPhase?: string };
  type ArtifactSummary = { hasSpec: boolean; decisionCount: number; latestDecisionFile: string | null };
  type EffectiveRun = RunJson & {
    effectivePhase?: string;
    phaseOverridden?: boolean;
    latestDecision?: Decision | null;
    artifactSummary?: ArtifactSummary;
  };

  const withEffective: EffectiveRun[] = await Promise.all(
    runObjs.map(async (r) => {
      const [dec, artifactSummary] = await Promise.all([
        latestDecisionFor(r.jobId).catch(() => null),
        artifactSummaryFor(r.jobId).catch(() => ({ hasSpec: false, decisionCount: 0, latestDecisionFile: null }))
      ]);
      const decision = dec as Decision | null;
      const effectivePhase = decision?.action === 'SET_PHASE' && decision?.toPhase ? decision.toPhase : r.phase;
      const phaseOverridden = (effectivePhase ?? null) !== (r.phase ?? null);
      return { ...r, effectivePhase, phaseOverridden, latestDecision: decision, artifactSummary };
    })
  );

  // Sort newest first
  withEffective.sort((a, b) => ((a.createdAt ?? '') < (b.createdAt ?? '') ? 1 : -1));
  inboxObjs.sort((a, b) => ((a.createdAt ?? '') < (b.createdAt ?? '') ? 1 : -1));

  return NextResponse.json({ ok: true, runs: withEffective, inbox: inboxObjs });
}
