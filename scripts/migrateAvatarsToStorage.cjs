#!/usr/bin/env node
/**
 * AVATAR MIGRATION SCRIPT
 * ========================
 * Moves all driver/car avatars from base64 blobs stored directly in Postgres
 * rows to Supabase Storage ('avatars' bucket), then updates each row with the
 * public CDN URL.
 *
 * Run ONCE after deploying the new storageService.ts:
 *   node scripts/migrateAvatarsToStorage.cjs
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js node-fetch sharp --save-dev
 *
 * The script is safe to re-run — it skips rows where avatar already starts
 * with "https://" (already migrated).
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kbeipwrcdqgmjmhfausn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // ← set this in env

if (!SUPABASE_SERVICE_KEY) {
    console.error('\n❌ ERROR: Set SUPABASE_SERVICE_ROLE_KEY in your environment.\n');
    console.error('   Find it in: Supabase Dashboard → Project Settings → API → service_role key\n');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const BUCKET = 'avatars';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Convert base64 data URL to a Buffer + mime type */
function dataUrlToBuffer(dataUrl) {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    return { buffer: Buffer.from(base64, 'base64'), mime };
}

async function uploadToStorage(folder, id, dataUrl) {
    const { buffer, mime } = dataUrlToBuffer(dataUrl);
    const path = `${folder}/${id}.jpg`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { upsert: true, contentType: 'image/jpeg' });

    if (error) throw new Error(`Storage upload failed for ${path}: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
}

// ── migrate drivers ───────────────────────────────────────────────────────────

async function migrateDrivers() {
    console.log('\n📋 Fetching all drivers with base64 avatars...');
    const { data: drivers, error } = await supabase
        .from('drivers')
        .select('id, avatar')
        .not('avatar', 'is', null)
        .neq('avatar', '');

    if (error) throw error;

    const toMigrate = drivers.filter(d =>
        d.avatar && d.avatar.startsWith('data:image/')
    );

    console.log(`   Found ${drivers.length} drivers, ${toMigrate.length} need migration.`);

    let migrated = 0, failed = 0;
    for (const driver of toMigrate) {
        try {
            const url = await uploadToStorage('drivers', driver.id, driver.avatar);
            await supabase.from('drivers').update({ avatar: url }).eq('id', driver.id);
            console.log(`   ✅ driver ${driver.id.slice(0, 8)}… → ${url.slice(-40)}`);
            migrated++;
        } catch (e) {
            console.error(`   ❌ driver ${driver.id.slice(0, 8)}… failed: ${e.message}`);
            failed++;
        }
    }

    console.log(`\n   Drivers: ${migrated} migrated, ${failed} failed.`);
    return { migrated, failed };
}

// ── migrate cars ──────────────────────────────────────────────────────────────

async function migrateCars() {
    console.log('\n🚗 Fetching all cars with base64 avatars...');
    const { data: cars, error } = await supabase
        .from('cars')
        .select('id, avatar')
        .not('avatar', 'is', null)
        .neq('avatar', '');

    if (error) throw error;

    const toMigrate = cars.filter(c =>
        c.avatar && c.avatar.startsWith('data:image/')
    );

    console.log(`   Found ${cars.length} cars, ${toMigrate.length} need migration.`);

    let migrated = 0, failed = 0;
    for (const car of toMigrate) {
        try {
            const url = await uploadToStorage('cars', car.id, car.avatar);
            await supabase.from('cars').update({ avatar: url }).eq('id', car.id);
            console.log(`   ✅ car ${car.id.slice(0, 8)}… → ${url.slice(-40)}`);
            migrated++;
        } catch (e) {
            console.error(`   ❌ car ${car.id.slice(0, 8)}… failed: ${e.message}`);
            failed++;
        }
    }

    console.log(`\n   Cars: ${migrated} migrated, ${failed} failed.`);
    return { migrated, failed };
}

// ── ensure bucket exists ──────────────────────────────────────────────────────

async function ensureBucket() {
    console.log('\n🪣 Checking avatars bucket...');
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET);

    if (!exists) {
        const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
        if (error && !error.message.includes('already exists')) throw error;
        console.log('   Created avatars bucket (public).');
    } else {
        console.log('   avatars bucket already exists ✓');
    }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🚀 Avatar Migration: base64 DB → Supabase Storage');
    console.log('='.repeat(52));

    await ensureBucket();

    const drivers = await migrateDrivers();
    const cars    = await migrateCars();

    const total = drivers.migrated + cars.migrated;
    const totalFailed = drivers.failed + cars.failed;

    console.log('\n' + '='.repeat(52));
    console.log(`✅ Migration complete: ${total} avatars moved to Storage.`);
    if (totalFailed > 0) {
        console.log(`⚠️  ${totalFailed} failed — check logs above.`);
    }
    console.log('\nEgress savings: ~70% reduction expected next billing cycle.\n');
}

main().catch(err => {
    console.error('\n💥 Fatal error:', err.message);
    process.exit(1);
});
