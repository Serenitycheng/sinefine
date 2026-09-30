// Optional PostgreSQL integration check, using an isolated in-memory PGlite DB.
// Pass the installed @electric-sql/pglite dist/index.js path as argv[2]. This
// script never connects to Supabase and never spends API credit.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

if (!process.argv[2]) throw new Error('Pass a local PGlite dist/index.js path.');
const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table public.fate_accounts(user_id uuid primary key);`);
  await db.exec(await readFile(new URL('../supabase/migrations/202609300001_background_life.sql', import.meta.url), 'utf8'));
  const user = '00000000-0000-4000-8000-000000000001';
  const backup = JSON.stringify({ format: 'sine-fine/fate-backup', version: 1, save: {} });
  const origin = 'a'.repeat(64);
  const query = (sql, params = []) => db.query(sql, params);
  await query('insert into fate_accounts values ($1)', [user]);
  const settings = (expected, enabled = true) => query('select * from fate_configure_background($1,$2,$3,$4,$5)', [user, expected, enabled, backup, origin]);
  const due = () => query("update fate_background_sessions set next_run_at = clock_timestamp() - interval '1 minute'");
  const claim = () => query('select * from fate_claim_background()');
  const reserve = (lease, amount) => query('select fate_reserve_background($1,$2,$3) as ok', [user, lease, amount]);
  const finish = (lease, cost = 0, notice = '', budget = false) => query('select fate_finish_background($1,$2,$3,$4,0,$5,$6) as ok', [user, lease, backup, cost, notice, budget]);
  const state = async () => (await query('select * from fate_background_sessions')).rows[0];

  assert.equal((await query('select fate_background_ready() as ready')).rows[0].ready, false);
  assert.equal((await settings(null)).rows.length, 1);
  assert.equal((await reserve(null, 1)).rows[0].ok, false, 'a missing worker lease cannot reserve money');
  assert.equal((await finish(null)).rows[0].ok, false, 'a missing worker lease cannot overwrite progress');
  assert.equal((await settings(null)).rows.length, 0, 'create cannot overwrite an existing world');
  assert.equal((await settings(999)).rows.length, 0, 'stale settings cannot replace a world');
  await due();
  const claims = await Promise.all([claim(), claim()]);
  assert.equal(claims.reduce((count, r) => count + r.rows.length, 0), 1, 'overlapping workers get only one lease');
  const lease = claims.find((r) => r.rows.length).rows[0].lease;
  await query('update fate_background_sessions set spent_micros = 4980000');
  assert.equal((await reserve(lease, 40000)).rows[0].ok, false, 'reserve rejects the request before crossing five yuan');
  assert.equal(Number((await state()).spent_micros), 4980000);
  assert.equal((await reserve(lease, 20000)).rows[0].ok, true);
  assert.equal((await reserve(lease, 1)).rows[0].ok, false, 'a worker cannot issue a second billable request');
  assert.equal((await finish(lease, 12000)).rows[0].ok, true);
  assert.equal(Number((await state()).spent_micros), 4992000, 'known usage releases only the unused reservation');
  assert.equal((await finish(lease, 12000)).rows[0].ok, false, 'duplicate finish cannot refund twice');

  let row = await state();
  assert.equal((await settings(row.revision, false)).rows.length, 1);
  row = await state();
  assert.equal((await settings(row.revision)).rows.length, 1);
  assert.equal(Number((await state()).spent_micros), 4992000, 'restart preserves the daily budget');
  await query("update fate_background_sessions set budget_day = current_date - 2");
  await due();
  const fresh = (await claim()).rows[0];
  assert.equal((await reserve(fresh.lease, 50000)).rows[0].ok, true);
  assert.equal(Number((await state()).spent_micros), 50000, 'new Beijing day resets the old budget');
  await settings(fresh.revision, false);
  assert.equal((await finish(fresh.lease, 1000)).rows[0].ok, false, 'a stopped worker cannot overwrite newer progress');
  assert.equal(Number((await state()).spent_micros), 50000, 'uncertain in-flight request keeps its pre-debit');

  row = await state(); await settings(row.revision); await due();
  const lost = (await claim()).rows[0];
  await reserve(lost.lease, 60000);
  await query("update fate_background_sessions set lease_until = clock_timestamp() - interval '1 second'");
  assert.equal((await finish(lost.lease, 1000)).rows[0].ok, false, 'expired workers cannot finish');
  await due();
  const replacement = (await claim()).rows[0];
  assert.notEqual(replacement.lease, lost.lease);
  assert.equal(Number((await state()).spent_micros), 110000, 'lease recovery does not erase uncertain spending');
  assert.equal((await finish(lost.lease, 1000)).rows[0].ok, false);
  await finish(replacement.lease, 0, '今日预算不足，次日继续。', true);
  row = await state();
  assert.equal(row.enabled, true);
  assert.equal(new Date(row.next_run_at).getTime() % 86400000, 16 * 3600000, 'budget pause resumes at Beijing midnight');

  const grants = await query("select has_function_privilege('anon', 'fate_claim_background()', 'execute') as claim, has_table_privilege('authenticated', 'fate_background_sessions', 'select') as read");
  assert.deepEqual(grants.rows[0], { claim: false, read: false });
  console.log('Background PostgreSQL checks passed: CAS, overlapping leases, daily budget, restart, uncertain billing, stop races, expiry and permissions.');
} finally { await db.close(); }
