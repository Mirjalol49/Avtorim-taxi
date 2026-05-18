import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('transactions').select('*').eq('amount', 505000);
  if (error) console.error("error:", error.message);
  else console.log("505000 txs:", data);
  
  const { data: d2 } = await supabase.from('transactions').select('*').order('timestamp_ms', { ascending: false }).limit(5);
  console.log("last 5 txs:", d2);
}
main();
