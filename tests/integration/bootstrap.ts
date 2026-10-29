import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Client } from "pg";
import { compare, hash } from "bcryptjs";
import { assertIsolatedTestProcess } from "../../src/config/test-environment";
const target = assertIsolatedTestProcess();
const name = `realitna_bootstrap_${randomBytes(6).toString("hex")}_test`;
assert.match(name, /^realitna_bootstrap_[a-f0-9]+_test$/);
const admin = new Client({ connectionString: target.databaseUrl });
await admin.connect();
const url = new URL(target.databaseUrl);
url.pathname = `/${name}`;
const password = randomBytes(24).toString("hex"),
  email = "bootstrap@example.invalid";
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  SEED_ADMIN_EMAIL: email,
  SEED_ADMIN_PASSWORD: password,
};
function run(
  file: string,
  args: string[] = [],
  override: Record<string, string> = {},
) {
  return spawnSync(process.execPath, ["--import", "tsx", file, ...args], {
    env: { ...env, ...override },
    encoding: "utf8",
  });
}
let client: Client | undefined;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  assert.equal(
    run("scripts/migrate.ts").status,
    0,
    "scratch migrations must pass",
  );
  client = new Client({ connectionString: url.toString() });
  await client.connect();
  assert.equal(
    run("scripts/bootstrap-admin.ts").status,
    0,
    "first owner creation",
  );
  const first = (await client.query('SELECT * FROM "User"')).rows;
  assert.equal(first.length, 1);
  assert.equal(first[0].role, "SUPER_ADMIN");
  assert(await compare(password, first[0].passwordHash));
  assert.equal(
    (await client.query('SELECT count(*)::int AS count FROM "Property"'))
      .rows[0].count,
    0,
    "bootstrap must not seed demo",
  );
  assert.equal(
    run("scripts/bootstrap-admin.ts", [], {
      SEED_ADMIN_PASSWORD: randomBytes(24).toString("hex"),
    }).status,
    1,
    "repeat bootstrap fails closed",
  );
  assert.equal(
    (await client.query('SELECT "passwordHash" FROM "User"')).rows[0]
      .passwordHash,
    first[0].passwordHash,
  );
  assert.equal(
    run("prisma/seed.ts", [], { APP_ENV: "production" }).status,
    1,
    "production seed must be refused",
  );
  assert.equal(
    (await client.query('SELECT count(*)::int AS count FROM "Property"'))
      .rows[0].count,
    0,
  );
  await client.query('DELETE FROM "User"');
  await client.query(
    'INSERT INTO "User" (id,email,name,"passwordHash",role) VALUES ($1,$2,$3,$4,$5)',
    [
      "legacy-admin",
      email,
      "DEMO existing admin",
      await hash(password, 12),
      "ADMIN",
    ],
  );
  assert.equal(
    run("scripts/bootstrap-admin.ts", ["--promote-existing"], {
      SEED_ADMIN_PASSWORD: randomBytes(24).toString("hex"),
    }).status,
    1,
    "promotion requires current password",
  );
  assert.equal(
    run("scripts/bootstrap-admin.ts", ["--promote-existing"]).status,
    0,
    "explicit promotion of existing admin",
  );
  const promoted = (await client.query('SELECT role,"authVersion" FROM "User"'))
    .rows[0];
  assert.equal(promoted.role, "SUPER_ADMIN");
  assert.equal(promoted.authVersion, 2);
  console.log(
    "Bootstrap integration: first owner, repeat protection, no demo side effects, production seed rejection and explicit legacy promotion passed on disposable database.",
  );
} finally {
  if (client) await client.end();
  await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.end();
}
