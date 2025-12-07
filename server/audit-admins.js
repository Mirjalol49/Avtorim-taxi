/**
 * Comprehensive Super Admin Audit Script
 * Audits and reports on all admin accounts across the system
 * 
 * Run: node audit-admins.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// ANSI colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

const log = {
    header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`),
    title: (msg) => console.log(`${colors.bold}${colors.blue}${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
    item: (msg) => console.log(`  ${msg}`)
};

async function auditAdminUsers() {
    log.header();
    log.title('📋 PHASE 1: Auditing admin_users Collection');
    log.header();

    const snapshot = await db.collection('admin_users').get();

    if (snapshot.empty) {
        log.warning('No admin users found in collection');
        return { accounts: [], issues: ['No accounts exist'] };
    }

    const accounts = [];
    const issues = [];
    const duplicates = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        const account = {
            id: doc.id,
            username: data.username || 'MISSING',
            email: data.email || 'N/A',
            role: data.role || 'UNDEFINED',
            active: data.active !== undefined ? data.active : 'UNDEFINED',
            hasPassword: !!data.password,
            hasPasswordHash: !!data.passwordHash,
            createdAt: data.createdAt,
            status: data.status || 'N/A'
        };
        accounts.push(account);

        // Track duplicates
        const key = (data.username || '').toLowerCase();
        if (!duplicates[key]) duplicates[key] = [];
        duplicates[key].push(doc.id);
    });

    console.log(`\nFound ${accounts.length} admin accounts:\n`);

    accounts.forEach((acc, i) => {
        const statusIcon = acc.active === true ? '🟢' : acc.active === false ? '🔴' : '⚪';
        const roleColor = acc.role === 'super_admin' ? colors.magenta : colors.blue;

        console.log(`${i + 1}. ${statusIcon} ${colors.bold}${acc.username}${colors.reset}`);
        console.log(`   ID: ${colors.cyan}${acc.id}${colors.reset}`);
        console.log(`   Role: ${roleColor}${acc.role}${colors.reset}`);
        console.log(`   Email: ${acc.email}`);
        console.log(`   Password: ${acc.hasPasswordHash ? '🔐 Hashed' : acc.hasPassword ? '⚠️ Plain text' : '❌ Missing'}`);
        console.log(`   Active: ${acc.active}`);
        console.log('');
    });

    // Check for issues
    log.title('\n🔍 Issue Detection:');

    // 1. Duplicate usernames
    Object.entries(duplicates).forEach(([username, ids]) => {
        if (ids.length > 1) {
            log.error(`Duplicate username "${username}": ${ids.length} accounts`);
            ids.forEach(id => log.item(`  - ${id}`));
            issues.push({ type: 'DUPLICATE_USERNAME', username, ids });
        }
    });

    // 2. Plain text passwords
    accounts.filter(a => a.hasPassword && !a.hasPasswordHash).forEach(acc => {
        log.warning(`Plain text password: ${acc.username} (${acc.id})`);
        issues.push({ type: 'PLAIN_PASSWORD', id: acc.id, username: acc.username });
    });

    // 3. Multiple super_admins
    const superAdmins = accounts.filter(a => a.role === 'super_admin');
    if (superAdmins.length > 1) {
        log.warning(`Multiple super_admin accounts detected: ${superAdmins.length}`);
        superAdmins.forEach(acc => log.item(`  - ${acc.username} (${acc.id})`));
        issues.push({ type: 'MULTIPLE_SUPER_ADMINS', count: superAdmins.length });
    }

    // 4. Missing required fields
    accounts.filter(a => a.username === 'MISSING' || a.role === 'UNDEFINED').forEach(acc => {
        log.error(`Missing required fields: ${acc.id}`);
        issues.push({ type: 'MISSING_FIELDS', id: acc.id });
    });

    // 5. Inactive but role = super_admin
    accounts.filter(a => a.role === 'super_admin' && a.active === false).forEach(acc => {
        log.warning(`Inactive super_admin: ${acc.username}`);
        issues.push({ type: 'INACTIVE_SUPER_ADMIN', id: acc.id, username: acc.username });
    });

    if (issues.length === 0) {
        log.success('No issues detected!');
    }

    return { accounts, issues };
}

async function auditAccountsCollection() {
    log.header();
    log.title('📋 PHASE 2: Auditing accounts Collection (Tenants)');
    log.header();

    const snapshot = await db.collection('accounts').get();

    if (snapshot.empty) {
        log.info('No tenant accounts found (this is normal if using admin_users only)');
        return { accounts: [], issues: [] };
    }

    console.log(`\nFound ${snapshot.size} tenant accounts:\n`);

    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`• ${colors.bold}${data.accountName || 'Unnamed'}${colors.reset}`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  Owner: ${data.ownerEmail || 'N/A'}`);
        console.log(`  Status: ${data.status || 'N/A'}`);
        console.log('');
    });

    return { accounts: snapshot.docs.map(d => ({ id: d.id, ...d.data() })), issues: [] };
}

async function auditAuditLogs() {
    log.header();
    log.title('📋 PHASE 3: Checking Audit Trail');
    log.header();

    const snapshot = await db.collection('audit_logs')
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

    if (snapshot.empty) {
        log.warning('No audit logs found');
        return;
    }

    console.log(`\nLast 20 audit entries:\n`);

    snapshot.forEach(doc => {
        const data = doc.data();
        const ts = data.timestamp?._seconds
            ? new Date(data.timestamp._seconds * 1000).toLocaleString()
            : 'N/A';
        console.log(`${colors.cyan}${ts}${colors.reset} | ${colors.yellow}${data.action}${colors.reset} | by: ${data.performedBy || 'system'}`);
    });
}

async function generateReport(adminResult, accountsResult) {
    log.header();
    log.title('📊 AUDIT SUMMARY REPORT');
    log.header();

    console.log(`
┌─────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN AUDIT                        │
├─────────────────────────────────────────────────────────────┤
│  Total Admin Users:     ${String(adminResult.accounts.length).padEnd(35)}│
│  Super Admins:          ${String(adminResult.accounts.filter(a => a.role === 'super_admin').length).padEnd(35)}│
│  Active Accounts:       ${String(adminResult.accounts.filter(a => a.active === true).length).padEnd(35)}│
│  Inactive Accounts:     ${String(adminResult.accounts.filter(a => a.active === false).length).padEnd(35)}│
│  Tenant Accounts:       ${String(accountsResult.accounts.length).padEnd(35)}│
├─────────────────────────────────────────────────────────────┤
│  Issues Found:          ${String(adminResult.issues.length).padEnd(35)}│
└─────────────────────────────────────────────────────────────┘
`);

    if (adminResult.issues.length > 0) {
        log.error('\nIssues requiring attention:');
        adminResult.issues.forEach((issue, i) => {
            console.log(`  ${i + 1}. [${issue.type}] ${JSON.stringify(issue)}`);
        });

        console.log(`\n${colors.yellow}Recommended actions:${colors.reset}`);
        console.log('  1. Run cleanup script: node cleanup-admins.js');
        console.log('  2. Migrate plain passwords: node migrate-passwords.js');
        console.log('  3. Remove duplicate accounts manually');
    } else {
        log.success('\n✨ System is clean! No remediation needed.');
    }
}

async function main() {
    console.log(`
${colors.bold}${colors.magenta}
╔═══════════════════════════════════════════════════════════════╗
║           SUPER ADMIN ACCOUNT AUDIT SYSTEM                    ║
║           Avtorim Taxi Fleet Management                       ║
║           ${new Date().toLocaleString().padEnd(45)}║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

    try {
        const adminResult = await auditAdminUsers();
        const accountsResult = await auditAccountsCollection();
        await auditAuditLogs();
        await generateReport(adminResult, accountsResult);
    } catch (error) {
        log.error(`Audit failed: ${error.message}`);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

main();
