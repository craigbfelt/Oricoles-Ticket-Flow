// Minimal smoke test — connects via REST using service role key to run a simple query
// Assumptions: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY provided via env
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing envs'); process.exit(2); }
  const sql = `select to_regclass('public.tenants') is not null as tenants_exists, to_regclass('public.profiles') is not null as profiles_exists;`;
  const resp = await fetch(`${url.replace(/\/$/,'')}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: sql })
  });
  if (!resp.ok) {
    console.error('Smoke test failed:', await resp.text());
    process.exit(3);
  }
  console.log('Smoke test response:', await resp.text());
  process.exit(0);
})();
