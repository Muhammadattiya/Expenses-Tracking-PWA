const filters = { from: '2024-09-01T00:00:00.000Z', to: '2024-09-30T23:59:59.999Z', filterType: 'this_month' };
const eventDate = '2023-09-10T00:00:00.000Z';
const frequency = 'monthly';

const calculateOccurrences = (eventDate, frequency, filters) => {
    if (!eventDate) return 0;
    
    // User requested: For "All Time" (no filters), always show exactly ONE cycle in the overview.
    if (!filters?.from || !filters?.to) {
      return 1;
    }

    const start = new Date(eventDate);
    const fromDate = new Date(filters.from);
    let toDate = new Date(filters.to);
    
    // User requested: Cap future dates to 'today' so "This Year" only counts YTD (Year-to-date)
    const today = new Date();
    if (filters?.filterType === 'year' && toDate > today) {
      toDate = today;
    }
    
    // If the fromDate is now somehow after toDate (e.g., viewing a strictly future custom filter capped to today)
    if (fromDate > toDate) return 0;

    if (frequency === 'never') {
      return (start >= fromDate && start <= toDate) ? 1 : 0;
    }

    // Helper to get the i-th occurrence strictly mathematically
    const getOccurrence = (i) => {
      const d = new Date(start);
      if (frequency === 'daily') d.setDate(d.getDate() + i);
      else if (frequency === 'weekly') d.setDate(d.getDate() + i * 7);
      else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + i);
      else if (frequency === 'monthly') {
        const targetMonth = d.getMonth() + i;
        const expectedMonth = ((targetMonth % 12) + 12) % 12; // safe modulo for JS
        d.setMonth(targetMonth);
        if (d.getMonth() !== expectedMonth) d.setDate(0); // Clamp to end of month if JS rolled it over
      }
      return d;
    };

    let count = 0;
    let i = 0;
    
    // Fast forward 'i' if the event started way in the past (to avoid large loops)
    if (start < fromDate) {
      if (frequency === 'daily') i = Math.max(0, Math.floor((fromDate - start) / (1000 * 60 * 60 * 24)));
      else if (frequency === 'weekly') i = Math.max(0, Math.floor((fromDate - start) / (1000 * 60 * 60 * 24 * 7)));
      else if (frequency === 'monthly') i = Math.max(0, (fromDate.getFullYear() - start.getFullYear()) * 12 + (fromDate.getMonth() - start.getMonth()) - 1);
      else if (frequency === 'yearly') i = Math.max(0, fromDate.getFullYear() - start.getFullYear() - 1);
    }

    while (true) {
      const current = getOccurrence(i);
      if (current > toDate) break;
      if (current >= fromDate) count++;
      i++;
      if (i > 10000) break; // failsafe
    }
    
    return count;
  };

console.log('Occurrences:', calculateOccurrences(eventDate, frequency, filters));
