import { NextResponse } from 'next/server';
import { postMessage } from '@/lib/slack';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | {
    channelId?: string;
    thread_ts?: string;
    threadTs?: string;
    text?: string;
  };

  const channelId = body?.channelId;
  const threadTs = body?.threadTs ?? body?.thread_ts;
  const text = body?.text;

  if (!channelId || !threadTs || !text) {
    return NextResponse.json({ ok: false, error: 'Missing channelId/thread_ts/text' }, { status: 400 });
  }

  try {
    const out = await postMessage(channelId, text, { threadTs, unfurlLinks: false, unfurlMedia: false });
    return NextResponse.json({ ok: true, ts: out.ts, thread_ts: threadTs });
  } catch (e: unknown) {
    const msg = String((e as { message?: unknown })?.message ?? e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
