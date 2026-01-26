import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { ghPutJson } from '@/lib/github';

function safe(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | null
    | {
        name?: string;
        phone?: string;
        address?: string;
        problem?: string;
        preferredDate?: string | null;
        preferredTime?: string | null;
      };

  const name = body?.name?.trim();
  const phone = body?.phone?.trim();
  const address = body?.address?.trim();
  const problem = body?.problem?.trim();

  if (!name || !phone || !address || !problem) {
    return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
  }

  const ts = new Date().toISOString();
  const id = crypto.randomUUID();
  const statusToken = crypto.randomBytes(16).toString('hex');

  const item = {
    id,
    createdAt: ts,
    kind: 'PLUMBER_REQUEST',
    statusToken,
    name,
    phone,
    address,
    problem,
    preferredDate: body?.preferredDate ?? null,
    preferredTime: body?.preferredTime ?? null
  };

  const file = `plumber/requests/${ts.replace(/[:.]/g, '-')}-${safe(name) || 'request'}-${id.slice(0, 8)}.json`;
  const tokenFile = `plumber/status-tokens/${statusToken}.json`;

  const out = await ghPutJson({
    path: file,
    json: item,
    message: `plumber request: ${safe(name) || id}`
  });

  await ghPutJson({
    path: tokenFile,
    json: { kind: 'PLUMBER_STATUS_TOKEN', token: statusToken, requestId: id, requestFile: file, createdAt: ts },
    message: `plumber status token: ${id}`
  });

  return NextResponse.json({ ok: true, file, commitUrl: out.commitUrl, item, statusToken, statusUrl: `/plumber/status/${statusToken}` });
}
