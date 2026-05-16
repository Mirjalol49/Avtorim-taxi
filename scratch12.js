import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const adminId = '243c82ac-1cdd-4e59-b617-69fd1e641848'; // Or 'global' ? 
  // Let's try to delete a notification manually as the frontend would (using ANON key? no we use service key here so it bypasses RLS)
  // Let's check RLS policies for notification_deletes
  
  const { data, error } = await supabase.rpc('get_policies'); // If we have such RPC, or we can just query pg_policies
  
  if (error) {
     const { data: p } = await supabase.from('pg_policies').select('*').limit(5); // pg_policies might not be exposed to REST
     console.log('Error:', error);
  } else {
     console.log(data);
  }
}
run();
