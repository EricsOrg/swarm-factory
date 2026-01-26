function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function slackConfig() {
  return {
    botToken: reqEnv('SLACK_BOT_TOKEN'),
    userId: process.env.SLACK_USER_ID ?? undefined
  };
}

async function slackApi(method: string, params: Record<string, unknown>) {
  const { botToken } = slackConfig();
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botToken}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(params)
  });

  const json: unknown = await res.json().catch(() => ({}));
  const ok = (json as { ok?: boolean })?.ok;
  if (!ok) {
    const err = (json as { error?: string })?.error ?? 'unknown_error';
    const meta = (() => {
      try {
        return JSON.stringify(json);
      } catch {
        return String(json);
      }
    })();
    throw new Error(`Slack ${method} failed: ${err} :: ${meta}`);
  }
  return json as Record<string, unknown>;
}

export function normalizeChannelName(s: string) {
  // Slack channel name rules: lowercase, no spaces, <=80 chars, may include hyphens.
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function createPublicRunChannel(params: { name: string; topic?: string }) {
  const name = normalizeChannelName(params.name);
  const out = await slackApi('conversations.create', {
    name,
    is_private: false
  });
  const channelId = (out as { channel?: { id?: string } })?.channel?.id;
  if (!channelId) throw new Error('Slack conversations.create missing channel id');

  if (params.topic) {
    // Topic setting can fail if missing scope; non-fatal.
    try {
      await slackApi('conversations.setTopic', { channel: channelId, topic: params.topic.slice(0, 250) });
    } catch {
      // ignore
    }
  }

  return { channelId, name };
}

export async function inviteUser(channelId: string, userId: string) {
  try {
    return await slackApi('conversations.invite', { channel: channelId, users: userId });
  } catch (e: unknown) {
    const msg = String((e as { message?: unknown })?.message ?? e);
    if (msg.includes('already_in_channel')) return { ok: true, alreadyInChannel: true };
    throw e;
  }
}

export async function postMessage(channelId: string, text: string) {
  return await slackApi('chat.postMessage', { channel: channelId, text });
}

export async function findPublicChannelByName(name: string) {
  const want = normalizeChannelName(name);
  let cursor: string | undefined = undefined;
  for (let i = 0; i < 20; i++) {
    const out = await slackApi('conversations.list', {
      types: 'public_channel',
      limit: 1000,
      cursor
    });
    const chans = (out.channels || []) as Array<{ id: string; name: string }>;
    const hit = chans.find((c) => c?.name === want);
    if (hit) return { channelId: hit.id, name: hit.name };
    cursor = (out as { response_metadata?: { next_cursor?: string } })?.response_metadata?.next_cursor || undefined;
    if (!cursor) break;
  }
  return null;
}
