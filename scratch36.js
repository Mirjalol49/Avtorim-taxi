const quitDateUTC = 1778803200000; // May 15 2026 00:00:00 UTC

// 15th of May midday local time
const may15Midday = new Date('2026-05-15T12:00:00.000+05:00').getTime(); // May 15 07:00:00 UTC

console.log('May 15 midday <= quit:', may15Midday <= quitDateUTC);
