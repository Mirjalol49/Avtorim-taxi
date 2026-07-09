import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { error } = await supabase.from('card_ledger').select('*').limit(1);
  console.log("card_ledger exists:", !error);
}
main();
