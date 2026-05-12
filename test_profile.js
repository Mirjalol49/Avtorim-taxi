import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const VITE_SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)[1];
const VITE_SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1];

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function test() {
    console.log('Testing admin update...');
    const payload = {
        username: 'Mirjalol',
        avatar: 'https://example.com/new_avatar.jpg'
    };
    // There is an admin user with username Mirjalol?
    const { data: users } = await supabase.from('admin_users').select('*');
    console.log('Admin users:', users.map(u => ({ id: u.id, username: u.username, avatar: u.avatar })));

    if (users.length > 0) {
        const id = users[0].id;
        const { error } = await supabase.from('admin_users').update(payload).eq('id', id);
        console.log('Update result for admin_users:', error);
    }
}
test();
