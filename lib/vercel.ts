function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function vercelConfig() {
  return {
    token: reqEnv('VERCEL_TOKEN'),
    teamId: process.env.VERCEL_TEAM_ID ?? undefined
  };
}

export async function vercelCreateProject(params: {
  name: string;
  repo: string; // owner/name
  productionBranch?: string;
  framework?: string;
}) {
  const { token, teamId } = vercelConfig();
  const url = new URL('https://api.vercel.com/v10/projects');
  if (teamId) url.searchParams.set('teamId', teamId);

  const payload: any = {
    name: params.name,
    framework: params.framework ?? 'nextjs',
    gitRepository: {
      type: 'github',
      repo: params.repo,
      productionBranch: params.productionBranch ?? 'main'
    }
  };

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json && (json.error?.message || json.error?.code || json.message)) ?? 'Vercel API error';
    throw new Error(`Vercel create project failed (${res.status}): ${msg}`);
  }

  return json as { id: string; name: string }; // plus more
}
