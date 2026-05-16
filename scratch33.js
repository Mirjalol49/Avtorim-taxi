const timestampMs = new Date('2026-05-15T12:00:00').getTime(); // midday on the 15th
const anvarQuitDate = 1778803200000; // 2026-05-15T00:00:00.000Z

console.log('Timestamp:', timestampMs);
console.log('Anvar quit:', anvarQuitDate);
console.log('Is Anvar active?', timestampMs <= anvarQuitDate);
