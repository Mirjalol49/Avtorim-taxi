import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('drivers').select('id, name, car, car_number');
  
  const drivers = data.filter(d => 
    d.car_number && d.car_number.replace(/\s+/g, '').toLowerCase().includes('337')
  );
  
  console.log('Drivers with matching car string:', drivers);
}
run();
