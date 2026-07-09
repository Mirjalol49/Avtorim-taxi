import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('cars').select('id, name, license_plate, assigned_driver_id').eq('id', 'f15c8f92-6fe1-4b2c-b480-cc4b45b02d0b').single();
  console.log('Car:', data);
}
run();
