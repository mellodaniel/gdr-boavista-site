import { mkdir, readFile, writeFile, rename, rmdir } from 'node:fs/promises';
import { join } from 'node:path';

// USD, conservatively rounded up. Reservations survive crashes/unknown API outcomes.
export const RESERVATION = 0.05;
export const MAX_BUDGET = 4.50;
type Ledger = { version: 1; months: Record<string, number> };
export async function withBudget<T>(directory: string, budget: number, run: (settle: (cost: number) => Promise<void>) => Promise<T>, now = new Date()): Promise<T> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lock = join(directory, 'lock');
  try { await mkdir(lock); } catch { throw new Error('CHAT_BUSY'); }
  try {
    const path = join(directory, 'usage.json');
    let ledger: Ledger;
    try { ledger = JSON.parse(await readFile(path, 'utf8')); }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('CHAT_LEDGER', { cause: e });
      ledger = { version: 1, months: {} };
    }
    if (ledger.version !== 1 || !ledger.months || Object.values(ledger.months).some(n => !Number.isFinite(n) || n < 0)) throw new Error('CHAT_LEDGER');
    const month = now.toISOString().slice(0, 7);
    const spent = ledger.months[month] || 0;
    const limit = Math.min(MAX_BUDGET, budget);
    if (!Number.isFinite(limit) || spent + RESERVATION > limit) throw new Error('CHAT_BUDGET');
    async function save() {
      await writeFile(`${path}.tmp`, JSON.stringify(ledger), { mode: 0o600 });
      await rename(`${path}.tmp`, path);
    }
    ledger.months[month] = Math.ceil((spent + RESERVATION) * 1e6) / 1e6;
    await save();
    let settled = false;
    return await run(async cost => {
      if (settled || !Number.isFinite(cost) || cost < 0) throw new Error('CHAT_USAGE');
      settled = true;
      ledger.months[month] = Math.ceil((spent + cost) * 1e6) / 1e6;
      await save();
    });
  } finally { await rmdir(lock); }
}
