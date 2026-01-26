import { NextRequest, NextResponse } from 'next/server';
import { ghPutJson } from '@/lib/github';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

  const body = (await req.json().catch(() => null)) as null | { note?: string };
  const note = (body?.note ?? '').toString().slice(0, 500);

  const ts = new Date().toISOString();
  const decision = {
    id,
    createdAt: ts,
    kind: 'PLUMBER_DECISION',
    action: 'ACCEPT',
    note
  };

  const safeId = id.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 80);
  const file = `plumber/decisions/${safeId}/${ts.replace(/[:.]/g, '-')}-accept.json`;

  const out = await ghPutJson({
    path: file,
    json: decision,
    message: `plumber accept: ${id}`
  });

  return NextResponse.json({ ok: true, file, commitUrl: out.commitUrl, decision });
}
