import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: drivers, error } = await supabase.from('drivers').select('id, name, plan_history, assigned_car_id:cars!assigned_driver_id(id, daily_plan)');
    if (error) {
        console.error('Fetch error:', error);
        return;
    }
    
    let fixedCount = 0;
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const msToday = todayMidnight.getTime();

    for (const driver of drivers || []) {
        const history = driver.plan_history || [];
        
        if (history.length >= 2) {
            const first = history[0];
            const last = history[history.length - 1];
            
            if (first.plan === 0 && first.carId === null && last.effectiveFrom >= msToday) {
                if (driver.assigned_car_id && driver.assigned_car_id.length > 0) {
                    const carData = driver.assigned_car_id[0];
                    if (carData) {
                        console.log(`Fixing driver: ${driver.name} - changing past plan from 0 to ${carData.daily_plan}`);
                        
                        const newHistory = [...history];
                        newHistory[0] = { ...first, plan: carData.daily_plan, carId: carData.id };
                        
                        await supabase.from('drivers').update({ plan_history: newHistory }).eq('id', driver.id);
                        fixedCount++;
                    }
                }
            }
        }
    }
    console.log(`Fixed ${fixedCount} drivers.`);
}
run().catch(console.error);
