import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — set them in Netlify environment variables');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        realtime: {
            params: { eventsPerSecond: 20 },
            heartbeatIntervalMs: 15000,
            reconnectAfterMs: (tries: number) => Math.min(500 * (tries + 1), 10000),
            timeout: 20000,
        },
        db: { schema: 'public' },
    }
);

export default supabase;
