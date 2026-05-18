import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.from('drivers').select('name, created_ms, start_date, plan_history');
  if (error) { console.error(error); return; }
  
  let nullStartDateCount = 0;
  for (const d of data) {
    if (!d.start_date) nullStartDateCount++;
  }
  console.log(`Total drivers: ${data.length}`);
  console.log(`Drivers with null start_date: ${nullStartDateCount}`);
  
  // Show a few examples of start_date being null
  console.log(JSON.stringify(data.filter(d => !d.start_date).slice(0, 3), null, 2));
}
main();
