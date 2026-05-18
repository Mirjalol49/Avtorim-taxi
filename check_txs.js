import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: drivers } = await supabase.from('drivers').select('id, name, created_ms, start_date');
  const { data: txs, error } = await supabase.from('transactions').select('driver_id, timestamp_ms').order('timestamp_ms', { ascending: true });
  if (error) { console.error(error); return; }
  
  for (const d of drivers) {
    if (!d.start_date) {
      const d_txs = txs.filter(t => t.driver_id === d.id);
      if (d_txs.length > 0) {
        const first_tx = d_txs[0];
        console.log(`Driver ${d.name} created_ms: ${new Date(d.created_ms).toISOString().split('T')[0]}, First TX: ${new Date(first_tx.timestamp_ms).toISOString().split('T')[0]}`);
      } else {
        console.log(`Driver ${d.name} created_ms: ${new Date(d.created_ms).toISOString().split('T')[0]}, No TXs`);
      }
    }
  }
}
main();
