import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function run() {
    const { data } = await supabase.from('transactions')
        .select('id, cheque_image')
        .not('cheque_image', 'is', null)
        .limit(5);
    
    if (data) {
        console.log(data.map(d => ({
            id: d.id,
            isBase64: d.cheque_image.startsWith('data:image'),
            prefix: d.cheque_image.substring(0, 100),
            length: d.cheque_image.length
        })));
    } else {
        console.log('No data');
    }
}
run();
