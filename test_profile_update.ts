import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdate() {
    console.log('Testing updateAdminProfile insert audit_logs...');
    const admin = { name: 'Super Admin', avatar: 'data:image/png;base64,...' };
    
    const { error: upsertError } = await supabase
        .from('admin_profile')
        .upsert({ id: 'profile', ...admin, updated_ms: Date.now() });
    console.log('Upsert result:', { upsertError });

    if (admin.avatar || admin.name) {
        const updates: any = {};
        if (admin.avatar) updates.avatar = admin.avatar;
        if (admin.name) updates.username = admin.name;

        const { error } = await supabase.from('admin_users').update(updates).eq('role', 'super_admin');
        console.log('Update admin_users result:', { error });
    }

    const { error: auditError } = await supabase.from('audit_logs').insert({
        action: 'UPDATE_ADMIN_PROFILE',
        performed_by_name: admin.name || 'Admin',
        details: {
            avatar_type: admin.avatar && typeof admin.avatar === 'string' && admin.avatar.startsWith('data:image/') ? 'dataUrl' : 'url'
        },
        timestamp_ms: Date.now()
    });
    console.log('Audit log insert result:', { auditError });
}
testUpdate();
