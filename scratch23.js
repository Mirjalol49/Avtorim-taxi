import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data } = await supabase.from('notifications').select('*').eq('id', 'c9ae896d-6da3-4ec4-8da2-f816d9caa715');
  console.log('Does it exist?', data);
}
run();
