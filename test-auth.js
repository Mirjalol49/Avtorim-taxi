import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbeipwrcqgmjmhfausn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZWlwd3JjZHFnbWptaGZhdXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDAyMTAsImV4cCI6MjA5MDU3NjIxMH0.Cc27jOEeLFxL9AADwYjQqjUxK9o7ecDcpJ5aR8J5EoA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing auth...');
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS:', data);
  }
}

test();
