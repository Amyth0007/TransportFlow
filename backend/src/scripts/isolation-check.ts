/**
 * Cross-org isolation smoke test (Stabilize Web / Phase 1 DoD).
 *
 * Requires two org-admin accounts. Super Admin cannot list vehicles (403).
 *
 *   npm run isolation-check
 *
 * Env (optional):
 *   API_URL              default http://localhost:3000
 *   ORG_A_EMAIL          default  admin@transportflow.local
 *   ORG_A_PASSWORD       default  changeme
 *   ORG_B_EMAIL          required — create Org B via Super Admin first
 *   ORG_B_PASSWORD       required
 *   SUPER_EMAIL          default  superadmin@transportflow.local
 *   SUPER_PASSWORD       default  superchangeme
 */
import 'dotenv/config';

const API = process.env.API_URL ?? 'http://localhost:3000';

interface LoginBody {
  data: { token: string };
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${body}`);
  }
  const json = (await res.json()) as LoginBody;
  return json.data.token;
}

async function getJson(path: string, token: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
}

async function main(): Promise<void> {
  const emailA = process.env.ORG_A_EMAIL ?? 'admin@transportflow.local';
  const passA = process.env.ORG_A_PASSWORD ?? 'changeme';
  const emailB = process.env.ORG_B_EMAIL;
  const passB = process.env.ORG_B_PASSWORD;
  const superEmail = process.env.SUPER_EMAIL ?? 'superadmin@transportflow.local';
  const superPass = process.env.SUPER_PASSWORD ?? 'superchangeme';

  if (!emailB || !passB) {
    console.error(
      'Set ORG_B_EMAIL and ORG_B_PASSWORD to a second org admin created via Super Admin.\n' +
        'Example (PowerShell):\n' +
        '  $env:ORG_B_EMAIL="orgb-admin@example.com"; $env:ORG_B_PASSWORD="secret"; npm run isolation-check'
    );
    process.exit(1);
  }

  const tokenA = await login(emailA, passA);
  const tokenB = await login(emailB, passB);
  const tokenSuper = await login(superEmail, superPass);

  const superVehicles = await getJson('/api/vehicles', tokenSuper);
  if (superVehicles.status !== 403) {
    throw new Error(`Expected super_admin GET /api/vehicles → 403, got ${superVehicles.status}`);
  }

  const listA = await getJson('/api/vehicles', tokenA);
  const listB = await getJson('/api/vehicles', tokenB);
  if (listA.status !== 200 || listB.status !== 200) {
    throw new Error(`Vehicle list failed: A=${listA.status} B=${listB.status}`);
  }

  const vehiclesA = (listA.body as { data: { _id: string }[] }).data;
  const vehiclesB = (listB.body as { data: { _id: string }[] }).data;

  if (vehiclesA.length === 0 && vehiclesB.length === 0) {
    console.log(
      'Isolation partial: both orgs have zero vehicles. Super-admin 403 passed.\n' +
        'Create a vehicle in each org and re-run to prove ID cross-access is 404.'
    );
    process.exit(0);
  }

  if (vehiclesA.length > 0) {
    const cross = await getJson(`/api/vehicles/${vehiclesA[0]._id}`, tokenB);
    if (cross.status !== 404) {
      throw new Error(`Org B must not read Org A vehicle — expected 404, got ${cross.status}`);
    }
  }

  if (vehiclesB.length > 0) {
    const cross = await getJson(`/api/vehicles/${vehiclesB[0]._id}`, tokenA);
    if (cross.status !== 404) {
      throw new Error(`Org A must not read Org B vehicle — expected 404, got ${cross.status}`);
    }
  }

  const tripsA = await getJson('/api/trips', tokenA);
  const tripsB = await getJson('/api/trips', tokenB);
  if (tripsA.status !== 200 || tripsB.status !== 200) {
    throw new Error(`Trip list failed: A=${tripsA.status} B=${tripsB.status}`);
  }
  const tA = (tripsA.body as { data: { _id: string }[] }).data;
  if (tA.length > 0) {
    const cross = await getJson(`/api/trips/${tA[0]._id}`, tokenB);
    if (cross.status !== 404) {
      throw new Error(`Org B must not read Org A trip — expected 404, got ${cross.status}`);
    }
  }

  console.log('Isolation check passed.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
