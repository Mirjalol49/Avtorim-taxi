import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const code = fs.readFileSync('supabase.ts', 'utf8');
const urlMatch = code.match(/VITE_SUPABASE_URL\s*\}?\s*=\s*import\.meta\.env\s*\|\|\s*\{\s*VITE_SUPABASE_URL:\s*'([^']+)'/);
const keyMatch = code.match(/VITE_SUPABASE_ANON_KEY\s*\}?\s*=\s*import\.meta\.env\s*\|\|\s*\{\s*VITE_SUPABASE_ANON_KEY:\s*'([^']+)'/);
const url = urlMatch ? urlMatch[1] : code.match(/VITE_SUPABASE_URL \|\| '([^']+)'/)[1];
const key = keyMatch ? keyMatch[1] : code.match(/VITE_SUPABASE_ANON_KEY \|\| '([^']+)'/)[1];

const supabase = createClient(url, key);

async function run() {
  const { data } = await supabase.from('admin_users').select('username, avatar');
  console.log(JSON.stringify(data, null, 2));
}
run();
