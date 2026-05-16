const quitDateUTC = 1778803200000; // May 15 2026 00:00:00 UTC
const quitDateWithBuffer = quitDateUTC + (24 * 60 * 60 * 1000 - 1); // May 15 2026 23:59:59 UTC

// 16th of May local time in Uzbekistan (UTC+5)
const targetDateLocal = new Date('2026-05-16T00:00:00.000+05:00');
const timestampMs = targetDateLocal.getTime();

console.log('Quit date with buffer (UTC):', new Date(quitDateWithBuffer).toISOString());
console.log('Target timestamp (UTC):', new Date(timestampMs).toISOString());
console.log('Is active?', timestampMs <= quitDateWithBuffer);
