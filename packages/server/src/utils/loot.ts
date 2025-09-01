import { LOOT_TABLES, type LootTable } from '@toodee/shared';
import type { Rng } from './rng';

export interface DropSpec {
  itemId: string;
  quantity: number;
}

export function rollDrops(lootTableId: string, rng: Rng): DropSpec[] {
  const table: LootTable | undefined = LOOT_TABLES[lootTableId];
  if (!table) return [];
  const results: DropSpec[] = [];
  for (const entry of table.entries) {
    if (rng.next() <= entry.dropChance) {
      results.push({ itemId: entry.itemId, quantity: entry.quantity });
    }
  }
  return results;
}
