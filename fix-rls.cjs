const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://kbeipwrcdqgmjmhfausn.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZWlwd3JjZHFnbWptaGZhdXNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTAwMDIxMCwiZXhwIjoyMDkwNTc2MjEwfQ.HqmMkRMyCep9KhgGG0iquSAtyGWeyLfP8F6nhcO1Moc';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fix() {
  console.log("Checking car-damages bucket...");
  const { data: buckets, error: bError } = await supabase.storage.listBuckets();
  if (bError) {
      console.error("Error listing buckets:", bError);
      return;
  }
  
  const hasBucket = buckets.find(b => b.name === 'car-damages');
  if (!hasBucket) {
      console.log("Bucket not found, creating it as public...");
      const { error: cError } = await supabase.storage.createBucket('car-damages', { public: true });
      if (cError) console.error("Error creating bucket:", cError);
      else console.log("Bucket created.");
  } else {
      console.log("Bucket exists. Ensure it is public.");
      await supabase.storage.updateBucket('car-damages', { public: true });
  }

  // To fix RLS, we need to execute SQL. We can try to use the rpc or just output the SQL needed.
  console.log("\nTo fully fix this, you need the following SQL executed in Supabase SQL editor:");
  console.log(`
-- Allow public access to car-damages bucket
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = 'car-damages');
  `);
}

fix();
