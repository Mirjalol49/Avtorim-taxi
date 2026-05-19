import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: drivers } = await supabase.from('drivers').select('id, name, is_deleted, start_date, quit_date, created_ms, daily_plan, plan_history').in('name', ['Anvar']);
  console.dir(drivers, {depth: null});
  
  if (drivers && drivers.length > 0) {
      const { data: txs } = await supabase.from('transactions').select('*').eq('driver_id', drivers[0].id).gte('timestamp_ms', new Date('2026-05-14T00:00:00Z').getTime()).lte('timestamp_ms', new Date('2026-05-14T23:59:59Z').getTime());
      console.log("MAY 14 TXS:", txs);
  }
}
check();
