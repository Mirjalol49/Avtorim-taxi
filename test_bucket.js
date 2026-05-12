import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const VITE_SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const VITE_SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.storage.from('avatars').list('admins');
    console.log('List admins folder:', data, error);
    
    // Try to upload
    const blob = new Blob(['test file contents'], { type: 'image/jpeg' });
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload('admins/test_admin2.jpg', blob, { upsert: true, contentType: 'image/jpeg' });
    
    console.log('Upload result:', uploadData, uploadError);
}
test();
