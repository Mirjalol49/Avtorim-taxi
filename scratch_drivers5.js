import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: drivers } = await supabase.from('drivers').select('id, name, is_deleted').in('name', ['Davron']);
  const { data: cars } = await supabase.from('cars').select('name, license_plate, assigned_driver_id, is_deleted');
  
  const davron = drivers[0];
  console.log("Davron:", davron);
  
  const assigned = cars.find(c => c.assigned_driver_id === davron.id);
  console.log("Assigned Car:", assigned);
}
check();
