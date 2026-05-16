import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: car } = await supabase.from('cars').select('assigned_driver_id, license_plate').ilike('license_plate', '%337%UKA%').single();
  console.log('Car:', car);
  const { data: d } = await supabase.from('drivers').select('id, name').eq('id', car.assigned_driver_id).single();
  console.log('Currently assigned driver:', d);
}
run();
