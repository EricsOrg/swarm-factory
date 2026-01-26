import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { postThreadReply } from '@/lib/slack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function reqEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function timingSafeEqualStr(a: string, b: string) {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifySlackSignature(rawBody: string, headers: Headers) {
  const signingSecret = reqEnv('SLACK_SIGNING_SECRET');
  const ts = headers.get('x-slack-request-timestamp');
  const sig = headers.get('x-slack-signature');
  if (!ts || !sig) return { ok: false as const, error: 'Missing Slack signature headers' };

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false as const, error: 'Invalid timestamp' };

  // Replay attack protection: reject requests older than 5 minutes.
  const ageSec = Math.abs(Date.now() / 1000 - tsNum);
  if (ageSec > 60 * 5) return { ok: false as const, error: 'Stale request' };

  const base = `v0:${ts}:${rawBody}`;
  const digest = crypto.createHmac('sha256', signingSecret).update(base, 'utf8').digest('hex');
  const want = `v0=${digest}`;
  if (!timingSafeEqualStr(want, sig)) return { ok: false as const, error: 'Bad signature' };
  return { ok: true as const };
}

type SlackUrlVerification = {
  type: 'url_verification';
  challenge: string;
};

type SlackEventCallback = {
  type: 'event_callback';
  event: any;
};

type Cmd =
  | { kind: 'go'; idea: string }
  | { kind: 'status'; target?: string }
  | { kind: 'approve'; target?: string; toPhase?: string }
  | { kind: 'pause'; target?: string }
  | { kind: 'cancel'; target?: string }
  | { kind: 'help' };

function stripAppMention(text: string) {
  // <@U123ABC> hello
  return text.replace(/^\s*<@[^>]+>\s*/g, '').trim();
}

function parseCommand(textRaw: string): Cmd {
  const text = textRaw.trim();
  if (!text) return { kind: 'help' };

  const [cmd0, ...rest] = text.split(/\s+/g);
  const cmd = cmd0.toLowerCase();
  const tail = rest.join(' ').trim();

  if (cmd === 'go') {
    return tail ? { kind: 'go', idea: tail } : { kind: 'help' };
  }
  if (cmd === 'status') {
    return tail ? { kind: 'status', target: tail } : { kind: 'status' };
  }
  if (cmd === 'approve') {
    // approve <jobId|code> [toPhase]
    const [t, maybePhase] = rest;
    const toPhase = maybePhase ? maybePhase.toUpperCase() : undefined;
    return { kind: 'approve', target: t, toPhase };
  }
  if (cmd === 'pause') {
    const [t] = rest;
    return { kind: 'pause', target: t };
  }
  if (cmd === 'cancel') {
    const [t] = rest;
    return { kind: 'cancel', target: t };
  }

  return { kind: 'help' };
}

function helpText() {
  return [
    '*Swarm Factory controls*',
    '• `go <idea>` — add an idea to the inbox',
    '• `status [jobId|code]` — show status (or board summary)',
    '• `approve <jobId> [PHASE]` — write a decision (default: CUSTOMER_DISCOVERY)',
    '• `pause <jobId>` — mark run for HUMAN_REVIEW',
    '• `cancel <jobId>` — mark run FAILED'
  ].join('\n');
}

async function callLocalApi(req: Request, path: string, body: unknown) {
  const url = new URL(req.url);
  url.pathname = path;
  url.search = '';
  return await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  });
}

async function handleCommand(req: Request, ctx: { channel: string; threadTs: string; user: string }, cmd: Cmd) {
  if (cmd.kind === 'help') {
    await postThreadReply(ctx.channel, ctx.threadTs, helpText());
    return;
  }

  if (cmd.kind === 'go') {
    const res = await callLocalApi(req, '/api/inbox', {
      idea: cmd.idea,
      requester: `slack:${ctx.user}`
    });
    const json = (await res.json().catch(() => null)) as any;

    if (!res.ok || !json?.ok) {
      await postThreadReply(ctx.channel, ctx.threadTs, `Failed to add inbox item.\n${json?.error ? `error: ${json.error}` : ''}`.trim());
      return;
    }

    const item = json.item;
    const lines = [
      '*Added to inbox*',
      item?.id ? `• id: ${item.id}` : null,
      json?.file ? `• file: ${json.file}` : null,
      json?.commitUrl ? `• commit: ${json.commitUrl}` : null,
      'Next: when it becomes a run, use `status` from the dashboard or `status <jobId>` here.'
    ].filter(Boolean);

    await postThreadReply(ctx.channel, ctx.threadTs, lines.join('\n'));
    return;
  }

  if (cmd.kind === 'status') {
    // Lightweight: if a target is provided, provide direct links; otherwise, point to dashboard.
    const base = process.env.SWARM_FACTORY_BASE_URL || new URL(req.url).origin;
    if (!cmd.target) {
      await postThreadReply(
        ctx.channel,
        ctx.threadTs,
        ['*Status*', `• dashboard: ${base.replace(/\/$/, '')}`, 'Tip: `status <jobId>` for a direct run link.'].join('\n')
      );
      return;
    }

    const t = cmd.target.trim();
    const lines = [
      '*Status*',
      `• run (by jobId): ${base.replace(/\/$/, '')}/runs/${encodeURIComponent(t)}`,
      `• run file: https://github.com/${process.env.GITHUB_OWNER ?? 'EricsOrg'}/${process.env.GITHUB_REPO ?? 'swarm-factory'}/blob/main/runs/${encodeURIComponent(t)}.json`
    ];
    await postThreadReply(ctx.channel, ctx.threadTs, lines.join('\n'));
    return;
  }

  if (cmd.kind === 'approve') {
    const jobId = cmd.target;
    if (!jobId) {
      await postThreadReply(ctx.channel, ctx.threadTs, 'Usage: `approve <jobId> [PHASE]`');
      return;
    }

    const toPhase = cmd.toPhase ?? 'CUSTOMER_DISCOVERY';
    const res = await callLocalApi(req, '/api/decision', {
      jobId,
      action: 'SET_PHASE',
      toPhase,
      note: `slack:${ctx.user}`
    });
    const json = (await res.json().catch(() => null)) as any;

    if (!res.ok || !json?.ok) {
      await postThreadReply(ctx.channel, ctx.threadTs, `Failed to write decision.\n${json?.error ? `error: ${json.error}` : ''}`.trim());
      return;
    }

    await postThreadReply(
      ctx.channel,
      ctx.threadTs,
      ['*Approved*', `• jobId: ${jobId}`, `• toPhase: ${toPhase}`, json?.commitUrl ? `• commit: ${json.commitUrl}` : null].filter(Boolean).join('\n')
    );
    return;
  }

  if (cmd.kind === 'pause') {
    const jobId = cmd.target;
    if (!jobId) {
      await postThreadReply(ctx.channel, ctx.threadTs, 'Usage: `pause <jobId>`');
      return;
    }

    const res = await callLocalApi(req, '/api/decision', {
      jobId,
      action: 'SET_PHASE',
      toPhase: 'HUMAN_REVIEW',
      note: `paused via slack:${ctx.user}`
    });
    const json = (await res.json().catch(() => null)) as any;

    if (!res.ok || !json?.ok) {
      await postThreadReply(ctx.channel, ctx.threadTs, `Failed to pause.\n${json?.error ? `error: ${json.error}` : ''}`.trim());
      return;
    }

    await postThreadReply(ctx.channel, ctx.threadTs, ['*Paused*', `• jobId: ${jobId}`, json?.commitUrl ? `• commit: ${json.commitUrl}` : null].filter(Boolean).join('\n'));
    return;
  }

  if (cmd.kind === 'cancel') {
    const jobId = cmd.target;
    if (!jobId) {
      await postThreadReply(ctx.channel, ctx.threadTs, 'Usage: `cancel <jobId>`');
      return;
    }

    const res = await callLocalApi(req, '/api/decision', {
      jobId,
      action: 'SET_PHASE',
      toPhase: 'FAILED',
      note: `cancelled via slack:${ctx.user}`
    });
    const json = (await res.json().catch(() => null)) as any;

    if (!res.ok || !json?.ok) {
      await postThreadReply(ctx.channel, ctx.threadTs, `Failed to cancel.\n${json?.error ? `error: ${json.error}` : ''}`.trim());
      return;
    }

    await postThreadReply(ctx.channel, ctx.threadTs, ['*Cancelled*', `• jobId: ${jobId}`, json?.commitUrl ? `• commit: ${json.commitUrl}` : null].filter(Boolean).join('\n'));
    return;
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  // Slack retries: ack quickly; skip duplicated side effects.
  if (req.headers.get('x-slack-retry-num')) {
    return NextResponse.json({ ok: true });
  }

  const verified = verifySlackSignature(rawBody, req.headers);
  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: verified.error }, { status: 401 });
  }

  const body = (JSON.parse(rawBody) as SlackUrlVerification | SlackEventCallback | any) ?? null;
  if (!body) return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });

  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: (body as SlackUrlVerification).challenge });
  }

  if (body.type !== 'event_callback') {
    return NextResponse.json({ ok: true });
  }

  const event = (body as SlackEventCallback).event;
  if (!event) return NextResponse.json({ ok: true });

  // Ignore bot messages / loops.
  if (event.bot_id || event.subtype === 'bot_message') {
    return NextResponse.json({ ok: true });
  }

  const eventType = String(event.type || '');

  if (eventType === 'app_mention') {
    const channel = String(event.channel || '');
    const user = String(event.user || '');
    const text = stripAppMention(String(event.text || ''));
    const threadTs = String(event.thread_ts || event.ts || '');

    const cmd = parseCommand(text);
    // Fire and await so failures surface in logs; still should complete quickly.
    await handleCommand(req, { channel, user, threadTs }, cmd);
    return NextResponse.json({ ok: true });
  }

  // DM (message.im)
  if (eventType === 'message' && event.channel_type === 'im') {
    const channel = String(event.channel || '');
    const user = String(event.user || '');
    const text = String(event.text || '').trim();
    const threadTs = String(event.thread_ts || event.ts || '');

    const cmd = parseCommand(text);
    await handleCommand(req, { channel, user, threadTs }, cmd);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
