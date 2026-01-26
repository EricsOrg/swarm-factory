type GhCreateFileResponse = {
  content: { sha: string };
  commit: { sha: string; html_url: string };
};

type GhGetFileResponse = {
  type: 'file';
  encoding: 'base64';
  content: string;
  sha: string;
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

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'swarm-factory'
  };
}

export async function ghPutJson(params: {
  path: string;
  json: unknown;
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
      ...authHeaders(token),
      'Content-Type': 'application/json'
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

export async function ghGetJson<T = unknown>(path: string): Promise<T | null> {
  const { owner, repo, token } = ghConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  const res = await fetch(url, {
    headers: authHeaders(token),
    cache: 'no-store'
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub GET failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as GhGetFileResponse;
  if (data.type !== 'file' || data.encoding !== 'base64') return null;

  const decoded = Buffer.from(data.content, 'base64').toString('utf8');
  return JSON.parse(decoded) as T;
}

export async function ghListDir(dirPath: string) {
  const { owner, repo, token } = ghConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}`;

  const res = await fetch(url, {
    headers: authHeaders(token),
    cache: 'no-store'
  });

  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub list failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as Array<{ name: string; path: string; type: string; download_url: string | null }>;
}

export async function ghFetchJsonFromDownloadUrl<T = unknown>(downloadUrl: string): Promise<T | null> {
  const { token } = ghConfig();
  const res = await fetch(downloadUrl, {
    headers: authHeaders(token),
    cache: 'no-store'
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}
