const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// We have to parse .env file manually or just grep the credentials from src/supabase.ts
const code = fs.readFileSync('src/supabase.ts', 'utf8');
const urlMatch = code.match(/VITE_SUPABASE_URL\s*\}?\s*=\s*import\.meta\.env\s*\|\|\s*\{\s*VITE_SUPABASE_URL:\s*'([^']+)'/);
const keyMatch = code.match(/VITE_SUPABASE_ANON_KEY\s*\}?\s*=\s*import\.meta\.env\s*\|\|\s*\{\s*VITE_SUPABASE_ANON_KEY:\s*'([^']+)'/);
const url = urlMatch ? urlMatch[1] : code.match(/VITE_SUPABASE_URL \|\| '([^']+)'/)[1];
const key = keyMatch ? keyMatch[1] : code.match(/VITE_SUPABASE_ANON_KEY \|\| '([^']+)'/)[1];

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('admin_users').select('username, avatar');
  if (error) console.error(error);
  console.log(data);
}
check();
