// SIMPLIFIED BROWSER CONSOLE VERSION
// Copy and paste this into browser console to check accounts

const checkAccounts = async () => {
    const { db } = await import('./firebase');
    const { collection, getDocs } = await import('firebase/firestore');

    const snapshot = await getDocs(collection(db, 'admin_users'));

    if (snapshot.empty) {
        console.log('❌ NO ACCOUNTS FOUND!');
        console.log('Run: localStorage.removeItem("avtorim_seed_completed")');
        console.log('Then refresh to recreate accounts');
        return;
    }

    console.log(`Found ${snapshot.size} accounts:\n`);

    snapshot.forEach(doc => {
        const d = doc.data();
        console.log(`Username: ${d.username}`);
        console.log(`Password: ${d.password}`);
        console.log(`Active: ${d.active ? 'YES ✅' : 'NO ❌'}`);
        console.log(`Role: ${d.role}\n`);
    });
};

checkAccounts();
