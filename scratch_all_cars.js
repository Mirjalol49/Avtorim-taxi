import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: cars } = await supabase.from('cars').select('id, name, license_plate, is_deleted');
  console.log("CARS:", cars);
}
check();
