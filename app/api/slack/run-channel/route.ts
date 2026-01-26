import { NextResponse } from 'next/server';
import { ghPutJson } from '@/lib/github';
import {
  createPublicRunChannel,
  findPublicChannelByName,
  inviteUser,
  postKickoffThread,
  slackConfig
} from '@/lib/slack';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | {
    jobId?: string;
    code?: string;
    title?: string;
    idea?: string;
  };

  const jobId = body?.jobId;
  const code = body?.code;
  if (!jobId || !code) {
    return NextResponse.json({ ok: false, error: 'Missing jobId/code' }, { status: 400 });
  }

  const chanBase = `sf-${code}`;
  const topic = body?.title ?? body?.idea ?? code;

  try {
    const { userId } = slackConfig();

    let created: { channelId: string; name: string };
    try {
      created = await createPublicRunChannel({ name: chanBase, topic });
    } catch (e: unknown) {
      const msg = String((e as { message?: unknown })?.message ?? e);
      if (msg.includes('name_taken')) {
        const existing = await findPublicChannelByName(chanBase);
        if (!existing) throw e;
        created = existing;
      } else {
        throw e;
      }
    }

    if (userId) {
      // Invite Eric (or whoever SLACK_USER_ID points to)
      await inviteUser(created.channelId, userId);
    }

    const kickoff = [
      `Swarm Factory run started`,
      `code: ${code}`,
      `jobId: ${jobId}`,
      body?.idea ? `idea: ${body.idea}` : null,
      `dashboard: https://swarm-factory.vercel.app`,
      `run file: https://github.com/EricsOrg/swarm-factory/blob/main/runs/${jobId}.json`
    ]
      .filter(Boolean)
      .join('\n');

    const kickoffRes = await postKickoffThread(created.channelId, kickoff);

    const ts = new Date().toISOString();
    const artifact = {
      kind: 'SLACK_RUN_THREAD',
      createdAt: ts,
      jobId,
      code,
      channelId: created.channelId,
      channelName: created.name,
      isPrivate: false,
      thread_ts: kickoffRes.threadTs,
      kickoff_ts: kickoffRes.threadTs
    };

    const file = `artifacts/${jobId}/slack/${ts.replace(/[:.]/g, '-')}-channel.json`;
    const out = await ghPutJson({
      path: file,
      json: artifact,
      message: `slack: channel ${created.name} (${code})`
    });

    return NextResponse.json({
      ok: true,
      channel: created,
      thread_ts: kickoffRes.threadTs,
      kickoff_ts: kickoffRes.threadTs,
      artifactFile: file,
      commitUrl: out.commitUrl
    });
  } catch (e: unknown) {
    // Surface Slack's missing_scope errors clearly
    const msg = String((e as { message?: unknown })?.message ?? e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
