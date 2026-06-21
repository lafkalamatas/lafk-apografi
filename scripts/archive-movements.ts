/**
 * Quarterly archive-and-prune for inventory_movements.
 *
 * The ledger is append-only and grows forever, which would eventually blow
 * past Supabase's free 500MB. This job keeps the DB lean while never losing
 * history: every run exports all movements older than the retention window to
 * an .xlsx, EMAILS that file off-site (so it survives even if the Supabase
 * project is ever deleted), and only THEN deletes exactly the rows it archived.
 *
 * Safe ordering (do not reorder):
 *   1. Snapshot a cutoff = now - RETENTION_MONTHS, fetch every row created at
 *      or before it (capturing their ids).
 *   2. Build the .xlsx and confirm the email was accepted by Resend.
 *   3. Delete only those captured ids — never re-derive "older than X" for the
 *      delete, or rows inserted between steps 1 and 3 could be dropped unarchived.
 *
 * Deleting old movements does NOT affect current stock: quantity_on_hand is a
 * denormalized column maintained by the inventory_movements_apply trigger, and
 * each archived row carries its own resulting_quantity, so the export is fully
 * self-contained.
 *
 * Usage:  npm run archive            (manual / local, reads .env.local)
 * Also runs automatically every 3 months via .github/workflows/archive-movements.yml
 *
 * Requires (env / .env.local / GitHub secrets):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   bypasses the deliberate no-DELETE RLS policy
 *   RESEND_API_KEY              https://resend.com (free tier)
 * Optional:
 *   ARCHIVE_EMAIL_TO            default giannisvrn@gmail.com
 *   ARCHIVE_EMAIL_FROM          default 'Λέσχη Απογραφή <onboarding@resend.dev>'
 *   ARCHIVE_RETENTION_MONTHS    default 3
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const emailTo = process.env.ARCHIVE_EMAIL_TO || 'giannisvrn@gmail.com';
const emailFrom = process.env.ARCHIVE_EMAIL_FROM || 'Λέσχη Απογραφή <onboarding@resend.dev>';
const retentionMonths = Number(process.env.ARCHIVE_RETENTION_MONTHS || '3');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!resendApiKey) {
  console.error('Missing RESEND_API_KEY (sign up free at https://resend.com)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const PAGE = 1000; // Supabase caps a single select at 1000 rows
const DELETE_CHUNK = 500;

const MOVEMENT_LABEL: Record<string, string> = {
  in: 'Εισαγωγή',
  out: 'Εξαγωγή',
  adjustment: 'Διόρθωση',
};

type ArchivedRow = {
  id: string;
  movement_type: string;
  quantity: number;
  resulting_quantity: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  inventory_products: { name: string; unit: string; category: string | null } | null;
};

async function fetchOlderThan(cutoffIso: string): Promise<ArchivedRow[]> {
  const rows: ArchivedRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select(
        'id, movement_type, quantity, resulting_quantity, reason, created_by, created_at, inventory_products(name, unit, category)'
      )
      .lte('created_at', cutoffIso)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`Fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as ArchivedRow[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

function buildWorkbook(rows: ArchivedRow[]): Buffer {
  const sheetRows = rows.map((r) => ({
    Ημερομηνία: new Date(r.created_at).toLocaleString('el-GR'),
    Προϊόν: r.inventory_products?.name ?? '(διαγραμμένο προϊόν)',
    Κατηγορία: r.inventory_products?.category ?? '',
    Τύπος: MOVEMENT_LABEL[r.movement_type] ?? r.movement_type,
    Ποσότητα: r.quantity,
    'Υπόλοιπο μετά': r.resulting_quantity,
    Μονάδα: r.inventory_products?.unit ?? '',
    Αιτία: r.reason ?? '',
    Χρήστης: r.created_by ?? '',
    ID: r.id,
  }));
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Κινήσεις');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

async function emailArchive(filename: string, buffer: Buffer, count: number, cutoffIso: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [emailTo],
      subject: `Αρχείο κινήσεων αποθήκης — ${count} εγγραφές έως ${cutoffIso.slice(0, 10)}`,
      html: `<p>Συνημμένο αρχείο με <strong>${count}</strong> κινήσεις αποθήκης παλαιότερες από ${retentionMonths} μήνες (έως ${cutoffIso.slice(0, 10)}).</p>
             <p>Μετά την αποστολή αυτές οι εγγραφές διαγράφονται από τη βάση για εξοικονόμηση χώρου. Φυλάξτε αυτό το email — είναι το μόνο αντίγραφο.</p>`,
      attachments: [{ filename, content: buffer.toString('base64') }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed (${res.status}): ${body}`);
  }
}

async function deleteByIds(ids: string[]) {
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    const chunk = ids.slice(i, i + DELETE_CHUNK);
    const { error } = await supabase.from('inventory_movements').delete().in('id', chunk);
    if (error) throw new Error(`Delete failed at chunk ${i}: ${error.message}`);
  }
}

async function main() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);
  const cutoffIso = cutoff.toISOString();

  console.log(`Archiving movements with created_at <= ${cutoffIso} (retention: ${retentionMonths} months)`);

  const rows = await fetchOlderThan(cutoffIso);
  if (rows.length === 0) {
    console.log('Nothing to archive. Done.');
    return;
  }
  console.log(`Fetched ${rows.length} rows.`);

  const filename = `inventory-movements-archive-${cutoffIso.slice(0, 10)}.xlsx`;
  const buffer = buildWorkbook(rows);
  console.log(`Built ${filename} (${(buffer.length / 1024).toFixed(1)} KB).`);

  // Email FIRST — if this throws we exit non-zero having deleted nothing.
  await emailArchive(filename, buffer, rows.length, cutoffIso);
  console.log(`Emailed to ${emailTo}.`);

  // Only now prune exactly what we archived.
  await deleteByIds(rows.map((r) => r.id));
  console.log(`Deleted ${rows.length} archived rows. Done.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
