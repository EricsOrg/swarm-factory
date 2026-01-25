type GhCreateFileResponse = {
  content: { sha: string };
  commit: { sha: string; html_url: string };
};

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function ghConfig() {
  return {
    owner: process.env.GITHUB_OWNER ?? 'EricsOrg',
    repo: process.env.GITHUB_REPO ?? 'swarm-factory',
    token: reqEnv('GITHUB_TOKEN')
  };
}

export async function ghPutJson(params: {
  path: string;
  json: any;
  message: string;
}): Promise<{ ok: true; commitUrl: string; sha: string }> {
  const { owner, repo, token } = ghConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${params.path}`;

  const body = {
    message: params.message,
    content: Buffer.from(JSON.stringify(params.json, null, 2)).toString('base64')
  };

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'swarm-factory'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub PUT failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as GhCreateFileResponse;
  return { ok: true, commitUrl: data.commit.html_url, sha: data.content.sha };
}

export async function ghListDir(dirPath: string) {
  const { owner, repo, token } = ghConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'swarm-factory'
    },
    // don’t cache
    cache: 'no-store'
  });

  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub list failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as Array<{ name: string; path: string; type: string; download_url: string | null }>;
}
