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
  const { data: driver } = await supabase.from('drivers').select('id').limit(1).single();
  if (!driver) return console.log("No driver");
  
  console.log("Updating driver:", driver.id);
  const fakeDoc = [{ category: 'passport', name: 'test.jpg', type: 'image/jpeg', data: 'data:image/jpeg;base64,123', uploadDate: Date.now() }];
  
  const { error } = await supabase.from('drivers').update({ documents: fakeDoc }).eq('id', driver.id);
  console.log("Update Error:", error);
  
  const { data } = await supabase.from('drivers').select('documents').eq('id', driver.id).single();
  console.log("Fetched documents length:", data?.documents?.length);
  console.log("Fetched documents:", JSON.stringify(data?.documents));
}
check();
