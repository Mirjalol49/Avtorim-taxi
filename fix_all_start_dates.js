import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: drivers, error } = await supabase.from('drivers').select('id, name, created_ms, start_date, plan_history, status');
  if (error) { console.error(error); return; }
  
  const { data: txs, error: txError } = await supabase.from('transactions').select('driver_id, timestamp_ms').order('timestamp_ms', { ascending: true });
  if (txError) { console.error(txError); return; }
  
  let updatedCount = 0;
  
  for (const d of drivers) {
    if (!d.start_date && d.status !== 'DELETED') {
      const d_txs = txs.filter(t => t.driver_id === d.id);
      
      if (d_txs.length > 0) {
        const first_tx = d_txs[0];
        
        // Get start of the day in UTC for that transaction
        const firstDate = new Date(first_tx.timestamp_ms);
        firstDate.setUTCHours(0, 0, 0, 0);
        const newStartDateMs = firstDate.getTime();
        
        console.log(`Fixing driver ${d.name}... Earliest TX: ${firstDate.toISOString().split('T')[0]}`);
        
        const newPlanHistory = d.plan_history ? d.plan_history.map((p, index) => {
          if (index === 0) {
            return { ...p, effectiveFrom: newStartDateMs };
          }
          return p;
        }) : [];
        
        const { error: updateError } = await supabase
          .from('drivers')
          .update({
            start_date: newStartDateMs,
            plan_history: newPlanHistory
          })
          .eq('id', d.id);
          
        if (updateError) console.error(`Error updating ${d.name}:`, updateError);
        else updatedCount++;
      }
    }
  }
  console.log(`Successfully updated ${updatedCount} drivers.`);
}
main();
