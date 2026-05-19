import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const start = new Date('2026-05-06T00:00:00Z').getTime();
  const end = new Date('2026-05-06T23:59:59Z').getTime();
  const { data: txs } = await supabase.from('transactions').select('*').gte('timestamp_ms', start).lte('timestamp_ms', end);
  
  console.log("MAY 6 TRANSACTIONS:");
  txs.forEach(t => console.log(t.driver_name, t.amount, t.type, t.car_name));
}
check();
