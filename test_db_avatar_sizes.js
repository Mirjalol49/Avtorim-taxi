import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length) env[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('drivers').select('id, name, avatar');
  if (error) { console.error("Error:", error); return; }
  for (const driver of data || []) {
      if (driver.avatar && typeof driver.avatar === 'string' && driver.avatar.length > 500) {
          console.log(`Driver ${driver.name} (id: ${driver.id}): avatar size=${driver.avatar.length} bytes`);
      }
  }
}
check();
