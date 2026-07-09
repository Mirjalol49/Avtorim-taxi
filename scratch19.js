import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
   const { data, error } = await supabase.from('pg_policies').select('*').in('tablename', ['notifications', 'notification_deletes', 'fines']);
   if (error) {
       console.log('Error:', error);
       // if pg_policies is blocked, maybe we can run a raw SQL function? No, we don't have that.
   } else {
       console.log(data);
   }
}
run();
