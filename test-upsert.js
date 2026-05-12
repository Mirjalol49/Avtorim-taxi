import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const lines = env.split('\n');
let url = '';
let key = '';
lines.forEach(l => {
  if (l.startsWith('VITE_SUPABASE_URL=')) url = l.split('=')[1];
  if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) key = l.split('=')[1];
});
const supabase = createClient(url, key);
const base64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
async function run() {
  const { error } = await supabase.from('admin_profile').upsert({ id: 'profile', avatar: base64, updated_ms: Date.now() });
  console.log(error ? error : "Success!");
}
run();
