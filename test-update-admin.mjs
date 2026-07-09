import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const base64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    console.log("Trying to update admin_profile avatar...");
    const { error } = await supabase.from('admin_profile').upsert({ id: 'profile', avatar: base64, updated_ms: Date.now() });
    if (error) {
        console.error("UPSERT ERROR:", error);
    } else {
        console.log("SUCCESS!");
    }
}
test();
