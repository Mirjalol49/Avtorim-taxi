import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: drivers } = await supabase.from('drivers').select('id, name, start_date, quit_date').in('id', ['f930e6d9-2140-4eb1-9458-c193b27b3aca', '79ba9d78-07e1-4c8f-9e59-7d3b0ba2c6b3', '23f80505-0002-42bb-86f7-9a672c7c2519']);
  console.log('Driver dates:', drivers);
}
run();
