import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: drivers, error } = await supabase.from('drivers').select('id, name, created_ms, start_date, plan_history, status');
  if (error) { console.error(error); return; }
  
  // Find Shoxrux
  const shoxrux = drivers.find(d => d.name === 'Shoxrux' && d.status !== 'DELETED');
  if (shoxrux) {
    console.log("Found Shoxrux:", JSON.stringify(shoxrux, null, 2));
    
    // Set start date to April 15, 2026 (Local time or UTC?)
    // April 15, 2026 UTC = 1776211200000
    // April 15, 2026 00:00:00 UTC
    const april15 = new Date('2026-04-15T00:00:00Z').getTime();
    
    // update start_date and plan_history
    const newPlanHistory = shoxrux.plan_history.map((p, index) => {
      if (index === 0) {
        return { ...p, effectiveFrom: april15 };
      }
      return p;
    });
    
    const { data: updateData, error: updateError } = await supabase
      .from('drivers')
      .update({
        start_date: april15,
        plan_history: newPlanHistory
      })
      .eq('id', shoxrux.id);
      
    if (updateError) console.error("Error updating Shoxrux", updateError);
    else console.log("Updated Shoxrux successfully.");
  }
}
main();
