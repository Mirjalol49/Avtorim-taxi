const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kbeipwrcqgmjmhfausn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZWlwd3JjZHFnbWptaGZhdXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDAyMTAsImV4cCI6MjA5MDU3NjIxMH0.Cc27jOEeLFxL9AADwYjQqjUxK9o7ecDcpJ5aR8J5EoA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Fetching admin users...');
  const { data: admins } = await supabase.from('admin_users').select('id').limit(1);
  if (!admins || admins.length === 0) {
    console.error('No admin_users found. Cannot test addNote.');
    return;
  }
  const fleetId = admins[0].id;
  console.log('Using fleetId:', fleetId);

  console.log('Adding note...');
  const { data: note, error: insertError } = await supabase.from('notes').insert({
    fleet_id: fleetId,
    title: 'Test Note',
    content: 'Testing 123',
    created_ms: Date.now(),
    updated_ms: Date.now()
  }).select().single();

  if (insertError) {
    console.error('Insert Error:', insertError);
    return;
  }
  console.log('Inserted note:', note.id);

  console.log('Testing update...');
  const { error: updateError } = await supabase.from('notes').update({ title: 'Updated' }).eq('id', note.id);
  if (updateError) console.error('Update Error:', updateError);
  else console.log('Update success');

  console.log('Testing delete...');
  const { error: deleteError } = await supabase.from('notes').delete().eq('id', note.id);
  if (deleteError) console.error('Delete Error:', deleteError);
  else console.log('Delete success');
}

test();
