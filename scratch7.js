import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('drivers').select('id, name, plan_history');
  
  const driversWithCar = data.filter(d => 
    d.plan_history && d.plan_history.some(ph => ph.carId === 'f15c8f92-6fe1-4b2c-b480-cc4b45b02d0b')
  );
  
  console.log('Drivers who had this car in plan history:', driversWithCar.map(d => d.name));
}
run();
