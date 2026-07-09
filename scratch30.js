import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const timestampMs = new Date('2026-05-15').getTime();
  console.log('Target timestamp:', timestampMs, new Date(timestampMs).toISOString());
  
  const { data: drivers } = await supabase.from('drivers').select('id, name, car_number, start_date, quit_date, is_deleted');
  
  const normalizePlate = (p) => p ? p.replace(/\s+/g, '').toUpperCase().replace(/O/g, '0') : '';
  const carPlate = normalizePlate('01 337 UKA');
  
  const matchingDrivers = drivers.filter(d => normalizePlate(d.car_number) === carPlate);
  console.log('Matching drivers by plate:', matchingDrivers);
  
  const activeMatches = matchingDrivers.filter(d => {
      const start = typeof d.start_date === 'number' ? d.start_date : 0;
      const quit = typeof d.quit_date === 'number' ? d.quit_date : Infinity;
      return timestampMs >= start && timestampMs <= quit;
  });
  console.log('Active matches on date:', activeMatches);
  
  // also check history
  const { data: history } = await supabase.from('car_assignments_history').select('*');
  console.log('History:', history);
}
run();
