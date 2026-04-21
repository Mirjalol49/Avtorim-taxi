import https from 'https';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kbeipwrcqgmjmhfausn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZWlwd3JjZHFnbWptaGZhdXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDAyMTAsImV4cCI6MjA5MDU3NjIxMH0.Cc27jOEeLFxL9AADwYjQqjUxK9o7ecDcpJ5aR8J5EoA';

const url = new URL(`${supabaseUrl}/rest/v1/admin_users?select=username,password`);

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('DB SUCCESS:', data));
});

req.on('error', (e) => console.error('DB ERROR:', e.message));
req.end();
