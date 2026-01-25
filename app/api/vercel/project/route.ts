import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { ghPutJson } from '@/lib/github';
import { vercelCreateProject } from '@/lib/vercel';

function safeSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function projectNameFor(jobId: string) {
  const base = safeSlug(jobId.slice(0, 8));
  const suffix = crypto.createHash('sha1').update(jobId).digest('hex').slice(0, 6);
  return `swarm-${base}-${suffix}`;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | {
    jobId?: string;
  };

  const jobId = body?.jobId;
  if (!jobId) return NextResponse.json({ ok: false, error: 'Missing jobId' }, { status: 400 });

  // For MVP, we link to a single repo (later: per-run repos/branches)
  const repo = process.env.SWARM_PRODUCT_REPO ?? `${process.env.GITHUB_OWNER ?? 'EricsOrg'}/${process.env.GITHUB_REPO ?? 'swarm-factory'}`;
  const productionBranch = process.env.SWARM_PRODUCT_BRANCH ?? 'main';

  const name = projectNameFor(jobId);

  try {
    const project = await vercelCreateProject({ name, repo, productionBranch, framework: 'nextjs' });

    const ts = new Date().toISOString();
    const artifact = {
      kind: 'VERCEL_PROJECT',
      jobId,
      createdAt: ts,
      projectId: project.id,
      projectName: project.name,
      repo,
      productionBranch,
      note: 'MVP: project is linked to a shared repo. Later: per-run repo/branch so each product is isolated.'
    };

    const file = `artifacts/${jobId}/deployments/${ts.replace(/[:.]/g, '-')}-vercel-project.json`;
    const out = await ghPutJson({
      path: file,
      json: artifact,
      message: `deploy: vercel project ${project.name} (${jobId.slice(0, 8)})`
    });

    return NextResponse.json({ ok: true, artifactFile: file, commitUrl: out.commitUrl, artifact });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
