const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://kbeipwrcdqgmjmhfausn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZWlwd3JjZHFnbWptaGZhdXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTAwMDIxMCwiZXhwIjoyMDkwNTc2MjEwfQ.HqmMkRMyCep9KhgGG0iquSAtyGWeyLfP8F6nhcO1Moc'
);

async function check() {
  const { data, error } = await supabase.from('admin_users').select('username, avatar');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
check();
