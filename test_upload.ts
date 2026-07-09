import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpload() {
    console.log('Testing avatar upload...');
    const blob = new Blob(['test file contents'], { type: 'image/jpeg' });
    const { data, error } = await supabase.storage
        .from('avatars')
        .upload('admins/test_admin.jpg', blob, { upsert: true, contentType: 'image/jpeg' });
    
    console.log('Upload result:', { data, error });
}
testUpload();
