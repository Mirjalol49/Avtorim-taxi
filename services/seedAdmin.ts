import { supabase } from '../supabase';

const seedSuperAdmin = async () => {
    console.log('Checking admin account status...');

    try {
        const { data: admins, error } = await supabase
            .from('admin_users')
            .select('id, username, active')
            .eq('role', 'super_admin');

        if (error) throw error;

        if (!admins || admins.length === 0) {
            console.log('No super_admin accounts exist. Please create via Admin Console.');
            return;
        }

        const allDisabled = admins.every(a => !a.active);

        if (allDisabled) {
            console.warn('EMERGENCY RECOVERY: All super_admin accounts are disabled!');

            const mirjalol = admins.find(a => a.username === 'mirjalol');
            const target = mirjalol || admins[0];

            await supabase.from('admin_users').update({ active: true, recovered_at: Date.now() }).eq('id', target.id);
            console.log(`RECOVERY: ${target.username} account has been automatically re-enabled`);
        } else {
            const activeCount = admins.filter(a => a.active).length;
            console.log(`Admin system healthy: ${activeCount} active super_admin account(s)`);
        }
    } catch (error) {
        console.error('Error in admin seed check:', error);
    }
};

export default seedSuperAdmin;
