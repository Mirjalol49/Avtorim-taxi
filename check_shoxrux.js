import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: drivers } = await supabase.from('drivers').select('id, name, created_ms, start_date');
  const shoxrux = drivers.find(d => d.name === 'Shoxrux');
  
  const { data: txs } = await supabase.from('transactions').select('driver_id, timestamp_ms').eq('driver_id', shoxrux.id).order('timestamp_ms', { ascending: true }).limit(1);
  if (txs.length > 0) {
     console.log(`Shoxrux First TX: ${new Date(txs[0].timestamp_ms).toISOString().split('T')[0]}`);
  }
}
main();
