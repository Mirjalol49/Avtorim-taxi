import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing URL or KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const { data: drivers } = await supabase.from('drivers').select('id, name').limit(1);
  if (!drivers || drivers.length === 0) return console.log("No drivers");
  
  const id = drivers[0].id;
  console.log("Updating driver:", id);
  
  const { error } = await supabase.from('drivers').update({ day_overrides: { "2026-05-15": { type: "OFF" } } }).eq('id', id);
  console.log("Update error:", error);
  
  const { data } = await supabase.from('drivers').select('id, day_overrides').eq('id', id).single();
  console.log("Result:", data);
}

testUpdate();
