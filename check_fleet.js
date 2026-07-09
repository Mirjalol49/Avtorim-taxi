import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('fleet_metadata').select('*').limit(1);
  console.log("fleet_metadata:", data);
}
main();
