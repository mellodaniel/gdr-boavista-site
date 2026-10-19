import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withBudget, RESERVATION } from '../server/chatBudget.ts';
const root = await mkdtemp(join(tmpdir(), 'boavista-budget-'));
const date = new Date('2026-10-19T12:00:00Z');
const ledger = () => readFile(join(root, 'usage.json'), 'utf8').then(JSON.parse);
try {
  await withBudget(root, 4.5, async settle => { await settle(0.003); }, date);
  assert.equal((await ledger()).months['2026-10'], 0.003);
  await assert.rejects(withBudget(root, 4.5, async () => { throw Error('timeout'); }, date), /timeout/);
  assert.ok(Math.abs((await ledger()).months['2026-10'] - (0.003 + RESERVATION)) < 0.000002);
  await withBudget(root, 4.5, async settle => {
    await assert.rejects(withBudget(root, 4.5, async () => {}, date), /CHAT_BUSY/);
    await settle(0.001);
  }, date);
  assert.ok(Math.abs((await ledger()).months['2026-10'] - 0.054) < 0.000003);
  await writeFile(join(root, 'usage.json'), JSON.stringify({version:1, months:{'2026-10':4.46}}));
  let called = false;
  await assert.rejects(withBudget(root, 100, async () => { called = true; }, date), /CHAT_BUDGET/);
  assert.equal(called, false);
  await withBudget(root, 4.5, async settle => settle(0.002), new Date('2026-11-01T00:00:00Z'));
  assert.equal((await ledger()).months['2026-10'], 4.46);
  assert.equal((await ledger()).months['2026-11'], 0.002);
  await writeFile(join(root, 'usage.json'), 'broken');
  await assert.rejects(withBudget(root, 4.5, async () => {}, date), /CHAT_LEDGER/);
  console.log('PASS: budget reservation, settlement, timeout, concurrency, hard ceiling, UTC rollover, corrupt ledger fail-closed');
} finally { await rm(root, {recursive:true, force:true}); }
