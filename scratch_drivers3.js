import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('drivers').select('name, is_deleted, start_date, quit_date, created_ms');
  
  const may5 = new Date('2026-05-05T00:00:00Z').getTime();
  
  const active = data.filter(d => {
      const startMs = d.start_date || d.created_ms;
      if (may5 < startMs) return false;
      if (d.quit_date && d.is_deleted && may5 > d.quit_date) return false;
      return true;
  });
  
  console.log("ACTIVE ON MAY 5:");
  active.forEach(a => console.log(a.name, 'deleted:', a.is_deleted));
}
check();
