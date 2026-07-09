const quitDateUTC = 1778803200000; // May 15 2026 00:00:00 UTC

// 15th of May local time
const may15Local = new Date('2026-05-15T00:00:00.000+05:00').getTime(); // May 14 19:00:00 UTC

// 16th of May local time
const may16Local = new Date('2026-05-16T00:00:00.000+05:00').getTime(); // May 15 19:00:00 UTC

console.log('May 15 local <= quit:', may15Local <= quitDateUTC);
console.log('May 16 local <= quit:', may16Local <= quitDateUTC);
