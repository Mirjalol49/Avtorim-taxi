import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: cars } = await supabase.from('cars').select('id, name, license_plate').ilike('name', '%Hongqi%');
  console.log('Cars:', cars);

  if (cars.length > 0) {
    const { data: history } = await supabase.from('car_assignments_history').select('*').in('car_id', cars.map(c => c.id));
    console.log('History:', history);
  }
}
run();
