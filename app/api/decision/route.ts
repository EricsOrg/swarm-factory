import { NextResponse } from 'next/server';
import { ghPutJson } from '@/lib/github';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | {
    jobId?: string;
    action?: string;
    toPhase?: string;
    agent?: 'designer' | 'coder' | 'qa' | 'deploy' | 'customer' | 'product';
    pipeline?: boolean;
    note?: string;
  };

  const jobId = body?.jobId;
  const action = body?.action;
  if (!jobId || !action) {
    return NextResponse.json({ ok: false, error: 'Missing jobId/action' }, { status: 400 });
  }

  const ts = new Date().toISOString();

  // Minimal schema, append-only: we only ever write new decision artifacts.
  // Existing clients use SET_PHASE; board lanes use ASSIGN_AGENT.
  if (action === 'ASSIGN_AGENT') {
    if (!body?.agent) {
      return NextResponse.json({ ok: false, error: 'Missing agent for ASSIGN_AGENT' }, { status: 400 });
    }
  }

  const dec = {
    kind: 'DECISION',
    jobId,
    createdAt: ts,
    action,
    toPhase: body?.toPhase ?? null,
    agent: body?.agent ?? null,
    pipeline: body?.pipeline ?? null,
    note: body?.note ?? null
  };

  const file = `artifacts/${jobId}/decisions/${ts.replace(/[:.]/g, '-')}.json`;

  const out = await ghPutJson({
    path: file,
    json: dec,
    message: `decision: ${action} ${jobId}`
  });

  return NextResponse.json({ ok: true, file, commitUrl: out.commitUrl, decision: dec });
}
