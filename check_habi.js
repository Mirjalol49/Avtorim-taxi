import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('transactions').select('*').ilike('driver_name', '%Habibulloh%').eq('amount', 600000);
  console.log("Habibulloh 600k:", data);
}
main();
