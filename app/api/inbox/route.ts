import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { ghPutJson } from '@/lib/github';

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | {
    idea?: string;
    requester?: string;
  };

  const idea = body?.idea?.trim();
  if (!idea) return NextResponse.json({ ok: false, error: 'Missing idea' }, { status: 400 });

  const requester = (body?.requester ?? 'web').toString();
  const ts = new Date().toISOString();
  const id = crypto.randomUUID();

  const item = {
    id,
    createdAt: ts,
    kind: 'INBOX_ITEM',
    idea,
    requester,
    status: 'PENDING'
  };

  const file = `inbox/${ts.replace(/[:.]/g, '-')}-${slugify(idea) || 'item'}.json`;

  const out = await ghPutJson({
    path: file,
    json: item,
    message: `inbox: ${slugify(idea) || id}`
  });

  return NextResponse.json({ ok: true, file, commitUrl: out.commitUrl, item });
}
