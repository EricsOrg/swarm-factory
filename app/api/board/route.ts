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

async function listDecisionFiles(jobId: string) {
  const dir = `artifacts/${jobId}/decisions`;
  const files = (await listDir(dir)).filter((x) => x.type === 'file' && x.download_url && x.name.endsWith('.json'));
  // filenames are ISO-ish; sorting by name is usually enough.
  files.sort((a, b) => (a.name < b.name ? 1 : -1));
  return files;
}

async function latestDecisionFor(jobId: string) {
  const files = await listDecisionFiles(jobId);
  if (files.length === 0) return null;
  const latest = files[0];
  return await fetchJson(latest.download_url!);
}

async function latestDecisionWhere(jobId: string, predicate: (dec: any) => boolean) {
  const files = await listDecisionFiles(jobId);
  for (const f of files) {
    const dec = await fetchJson(f.download_url!);
    if (dec && predicate(dec)) return dec;
  }
  return null;
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

  // Overlay latest decision-derived effective phase + assignment (without rewriting the run file)
  type Decision = { action?: string; toPhase?: string; agent?: string | null; pipeline?: boolean | null };
  type ArtifactSummary = { hasSpec: boolean; decisionCount: number; latestDecisionFile: string | null };
  type EffectiveRun = RunJson & {
    effectivePhase?: string;
    phaseOverridden?: boolean;
    latestDecision?: Decision | null;
    latestPhaseDecision?: Decision | null;
    latestAssignmentDecision?: Decision | null;
    assignment?: { agent: string | null; pipeline: boolean | null };
    artifactSummary?: ArtifactSummary;
  };

  const withEffective: EffectiveRun[] = await Promise.all(
    runObjs.map(async (r) => {
      const [latestDecision, latestPhaseDecision, latestAssignmentDecision, artifactSummary] = await Promise.all([
        latestDecisionFor(r.jobId).catch(() => null),
        latestDecisionWhere(r.jobId, (d) => d?.action === 'SET_PHASE' && !!d?.toPhase).catch(() => null),
        latestDecisionWhere(r.jobId, (d) => d?.action === 'ASSIGN_AGENT' && !!d?.agent).catch(() => null),
        artifactSummaryFor(r.jobId).catch(() => ({ hasSpec: false, decisionCount: 0, latestDecisionFile: null }))
      ]);

      const phaseDecision = latestPhaseDecision as Decision | null;
      const assignDecision = latestAssignmentDecision as Decision | null;

      const effectivePhase = phaseDecision?.toPhase ? phaseDecision.toPhase : r.phase;
      const phaseOverridden = (effectivePhase ?? null) !== (r.phase ?? null);

      const assignment = {
        agent: (assignDecision?.agent as string | null) ?? null,
        pipeline: (assignDecision?.pipeline as boolean | null) ?? null
      };

      return {
        ...r,
        effectivePhase,
        phaseOverridden,
        latestDecision: (latestDecision as Decision | null) ?? null,
        latestPhaseDecision: phaseDecision,
        latestAssignmentDecision: assignDecision,
        assignment,
        artifactSummary
      };
    })
  );

  // Sort newest first
  withEffective.sort((a, b) => ((a.createdAt ?? '') < (b.createdAt ?? '') ? 1 : -1));
  inboxObjs.sort((a, b) => ((a.createdAt ?? '') < (b.createdAt ?? '') ? 1 : -1));

  return NextResponse.json({ ok: true, runs: withEffective, inbox: inboxObjs });
}
