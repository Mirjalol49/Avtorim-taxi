const activeMatches = [
  { name: 'Doston', start_date: null, quit_date: null },
  { name: 'Davron', start_date: null, quit_date: null },
  { name: 'Anvar', start_date: 1778266800000, quit_date: 1778803200000 }
];

activeMatches.sort((a, b) => {
    const startA = typeof a.start_date === 'number' ? a.start_date : 0;
    const startB = typeof b.start_date === 'number' ? b.start_date : 0;
    return startB - startA;
});

console.log('Winner:', activeMatches[0].name);
