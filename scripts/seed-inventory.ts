/**
 * One-time seed: merges menu_items + psita_items from the website's Supabase
 * project into inventory_products. Safe to re-run (skips names already seeded).
 *
 * Usage: npm run seed
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (bypasses RLS for this
 * one-off write; never used by the app itself).
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Mirrors the SQL normalize_order_name() function in
// leschi-axiwmatikon-website/sql/orders.sql, so dedup matching here lines up
// with how the rest of the system already normalizes Greek names.
function normalizeName(value: string): string {
  const accentMap: Record<string, string> = {
    ά: 'α', έ: 'ε', ή: 'η', ί: 'ι', ό: 'ο', ύ: 'υ', ώ: 'ω',
    ϊ: 'ι', ΐ: 'ι', ϋ: 'υ', ΰ: 'υ', ς: 'σ',
  };
  return (value ?? '')
    .toLowerCase()
    .split('')
    .map((ch) => accentMap[ch] ?? ch)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

const WEIGHT_OR_COUNT_PATTERN = /(\d+\s?γρ\.?|\d+\s?(τεμ(άχια)?|κομμάτια))/i;

type MenuRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  category_name: string | null;
};

type SourceRow = {
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  sourceTable: 'menu_items' | 'psita_items';
  sourceId: string;
};

async function fetchMenuItems(): Promise<SourceRow[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, description, price, category_id, menu_categories(name)');
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.menu_categories?.name ?? null,
    sourceTable: 'menu_items' as const,
    sourceId: row.id,
  }));
}

async function fetchPsitaItems(): Promise<SourceRow[]> {
  const { data, error } = await supabase
    .from('psita_items')
    .select('id, name, description, price, category_id, psita_categories(name)');
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    name: row.name,
    description: row.description,
    price: row.price,
    category: row.psita_categories?.name ?? null,
    sourceTable: 'psita_items' as const,
    sourceId: row.id,
  }));
}

async function fetchExistingNormalizedNames(): Promise<Set<string>> {
  const { data, error } = await supabase.from('inventory_products').select('name');
  if (error) throw error;
  return new Set((data ?? []).map((row: { name: string }) => normalizeName(row.name)));
}

async function main() {
  console.log('Fetching menu_items and psita_items...');
  const [menuItems, psitaItems] = await Promise.all([fetchMenuItems(), fetchPsitaItems()]);
  console.log(`  menu_items: ${menuItems.length}`);
  console.log(`  psita_items: ${psitaItems.length}`);

  // Dedup by normalized name. Prefer the psita_items version when an item
  // appears in both lists (more specific listing for grilled/BBQ items).
  const byNormalizedName = new Map<string, SourceRow>();
  let mergeCount = 0;
  for (const row of [...menuItems, ...psitaItems]) {
    const key = normalizeName(row.name);
    const existing = byNormalizedName.get(key);
    if (existing) {
      mergeCount++;
      if (row.sourceTable === 'psita_items') {
        console.log(
          `  Merged duplicate: "${existing.name}" (${existing.sourceTable}) + "${row.name}" (psita_items) -> kept psita_items version`
        );
        byNormalizedName.set(key, row);
      } else {
        console.log(
          `  Merged duplicate: "${existing.name}" (${existing.sourceTable}) + "${row.name}" (menu_items) -> kept ${existing.sourceTable} version`
        );
      }
      continue;
    }
    byNormalizedName.set(key, row);
  }

  const alreadySeeded = await fetchExistingNormalizedNames();

  const reviewFlags: string[] = [];
  const toInsert: Array<{
    name: string;
    category: string | null;
    unit: string;
    source_menu_item_id: string | null;
    source_psita_item_id: string | null;
  }> = [];

  let skippedAlreadySeeded = 0;

  for (const [key, row] of Array.from(byNormalizedName.entries())) {
    if (alreadySeeded.has(key)) {
      skippedAlreadySeeded++;
      console.log(`  Skipped (already seeded): ${row.name}`);
      continue;
    }

    // Default everything to "μερίδα" — this is a finished/prepared portion
    // list, not raw ingredients. Flag for manual review rather than guess.
    const text = `${row.name} ${row.description ?? ''}`;
    if (WEIGHT_OR_COUNT_PATTERN.test(text)) {
      reviewFlags.push(`${row.name} (${row.sourceTable}) — mentions weight/piece-count, defaulted to μερίδα`);
    }

    toInsert.push({
      name: row.name,
      category: row.category,
      unit: 'μερίδα',
      source_menu_item_id: row.sourceTable === 'menu_items' ? row.sourceId : null,
      source_psita_item_id: row.sourceTable === 'psita_items' ? row.sourceId : null,
    });
  }

  console.log(`\nInserting ${toInsert.length} products...`);
  const CHUNK_SIZE = 50;
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from('inventory_products').insert(chunk);
    if (error) throw error;
  }

  console.log('\n--- Summary ---');
  console.log(`Source rows: ${menuItems.length} menu_items + ${psitaItems.length} psita_items`);
  console.log(`Merged duplicates: ${mergeCount}`);
  console.log(`Skipped (already seeded): ${skippedAlreadySeeded}`);
  console.log(`Inserted: ${toInsert.length}`);
  if (reviewFlags.length > 0) {
    console.log(`\nReview these ${reviewFlags.length} items in the app and confirm/override their unit:`);
    reviewFlags.forEach((line) => console.log(`  - ${line}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
