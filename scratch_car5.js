import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: cars } = await supabase.from('cars').select('id, name, license_plate').ilike('license_plate', '%337%');
  console.log("CARS:", cars);
  
  if (cars.length > 0) {
      const carId = cars[0].id;
      // Find drivers whose plan_history had this carId
      const { data: drivers } = await supabase.from('drivers').select('name, is_deleted, plan_history');
      const driversWithCar = drivers.filter(d => {
          if (!d.plan_history) return false;
          return d.plan_history.some(ph => ph.carId === carId);
      });
      console.log("DRIVERS WITH THIS CAR:");
      driversWithCar.forEach(d => console.log(d.name, d.is_deleted));
  }
}
check();
