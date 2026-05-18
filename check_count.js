import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { count, error } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  console.log("total txs:", count);
}
main();
