import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
   const { data } = await supabase.rpc('get_foreign_keys'); 
   // Not sure if this exists, let's just ignore the foreign key constraint by doing a TRY CATCH around the insert!
}
run();
