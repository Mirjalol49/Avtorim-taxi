import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Update all records that have end_ms IS NULL and start_ms > Date.now() - 1 hour (the ones we just created)
  // Let's set start_ms to 0 so they act as "from the beginning of time"
  
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const { data, error } = await supabase
    .from('car_assignments_history')
    .update({ start_ms: 0 })
    .is('end_ms', null)
    .gt('start_ms', oneHourAgo);
    
  console.log('Fixed:', error || 'Success');
}
run();
