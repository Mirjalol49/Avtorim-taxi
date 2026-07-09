import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: drivers } = await supabase.from('drivers').select('id, name, is_deleted, start_date, quit_date, created_ms, daily_plan, plan_history');
  
  const may6 = new Date('2026-05-06T00:00:00Z').getTime();
  
  const active = drivers.filter(d => {
      const startMs = d.start_date || d.created_ms;
      if (may6 < startMs) return false;
      if (d.quit_date && d.is_deleted && may6 > d.quit_date) return false;
      return true;
  });
  
  console.log("ACTIVE ON MAY 6:");
  active.forEach(a => console.log(a.name));
}
check();
