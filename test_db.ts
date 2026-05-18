import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('cars').select('id, name, damage').limit(5);
  console.log("Error:", error);
  for (const car of data || []) {
     for (const dmg of car.damage || []) {
        console.log(`Car ${car.name} Damage ${dmg.id}: ${dmg.images.length} images`);
        if (dmg.images.length > 4) {
            console.log(JSON.stringify(dmg.images, null, 2));
        }
     }
  }
}
check();
