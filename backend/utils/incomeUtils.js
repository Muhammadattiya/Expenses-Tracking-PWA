/**
 * Pure deterministic calculation engine for Fixed Income based on IncomeProfile configurations.
 * Bounded by O(profiles), zero transaction scans, zero database queries, zero timestamp loops.
 */

const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;

const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

const getDaysInYear = (year) => (isLeapYear(year) ? 366 : 365);

const getDaysInMonth = (year, monthZeroIndexed) => {
  return new Date(Date.UTC(year, monthZeroIndexed + 1, 0)).getUTCDate();
};

/**
 * Calculate expected fixed income for a given set of profiles and filter range.
 * Current periods strictly terminate at TODAY (current UTC day).
 * Profile start dates are strictly respected.
 * 
 * @param {Array} profiles - Array of IncomeProfile objects
 * @param {Object} filters - { from, to, filterType }
 * @param {Date} [nowDate] - Current date reference (defaults to new Date())
 * @returns {number} Expected fixed income rounded to 2 decimal places
 */
const calculateFixedIncome = (profiles = [], filters = {}, nowDate = new Date()) => {
  if (!Array.isArray(profiles) || profiles.length === 0) return 0;
  const activeProfiles = profiles.filter((p) => p && p.isActive !== false);
  if (activeProfiles.length === 0) return 0;

  const now = new Date(nowDate);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentDay = now.getUTCDate();
  const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);

  const todayStart = new Date(Date.UTC(currentYear, currentMonth, currentDay, 0, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(currentYear, currentMonth, currentDay, 23, 59, 59, 999));

  const filterType = filters?.filterType;

  // "All Time": calculate cumulative fixed income over the profile's active lifetime up to TODAY
  if (filterType === 'all' || (!filterType && !filters?.from && !filters?.to)) {
    let total = 0;
    for (const p of activeProfiles) {
      const amount = Number(p.amount) || 0;
      if (amount <= 0) continue;
      const freq = p.frequency || 'monthly';
      const profileStart = p.startDate
        ? new Date(p.startDate)
        : (filters?.from ? new Date(filters.from) : (p.createdAt ? new Date(p.createdAt) : null));

      if (profileStart) {
        if (profileStart > todayEnd) continue;
        const startMidnight = Date.UTC(profileStart.getUTCFullYear(), profileStart.getUTCMonth(), profileStart.getUTCDate());
        const endMidnight = Date.UTC(currentYear, currentMonth, currentDay);
        const days = Math.max(1, Math.floor((endMidnight - startMidnight) / 86400000) + 1);
        if (freq === 'daily') total += amount * days;
        else if (freq === 'weekly') total += (days / 7) * amount;
        else if (freq === 'yearly') total += (days / 365.25) * amount;
        else total += (days / 30.4375) * amount;
      } else {
        // Baseline fallback if profile has no timestamp or start reference
        if (freq === 'daily') total += amount * 30;
        else if (freq === 'weekly') total += (amount * 52) / 12;
        else if (freq === 'yearly') total += amount / 12;
        else total += amount;
      }
    }
    return round2(total);
  }

  // Determine standard bounds
  let filterFrom;
  let filterTo;

  if (filterType === 'today') {
    filterFrom = todayStart;
    filterTo = todayEnd;
  } else if (filterType === 'yesterday') {
    filterFrom = new Date(Date.UTC(currentYear, currentMonth, currentDay - 1, 0, 0, 0, 0));
    filterTo = new Date(Date.UTC(currentYear, currentMonth, currentDay - 1, 23, 59, 59, 999));
  } else if (filterType === 'this_week') {
    if (filters?.from) {
      filterFrom = new Date(filters.from);
    } else {
      const dow = now.getUTCDay();
      const diff = (dow - 6 + 7) % 7;
      filterFrom = new Date(Date.UTC(currentYear, currentMonth, currentDay - diff, 0, 0, 0, 0));
    }
    filterTo = todayEnd;
  } else if (filterType === 'last_week') {
    if (filters?.from && filters?.to) {
      filterFrom = new Date(filters.from);
      filterTo = new Date(filters.to);
    } else {
      const dow = now.getUTCDay();
      const diff = (dow - 6 + 7) % 7;
      filterFrom = new Date(Date.UTC(currentYear, currentMonth, currentDay - diff - 7, 0, 0, 0, 0));
      filterTo = new Date(Date.UTC(currentYear, currentMonth, currentDay - diff - 1, 23, 59, 59, 999));
    }
  } else if (filterType === 'this_month') {
    filterFrom = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
    filterTo = todayEnd;
  } else if (filterType === 'last_month') {
    filterFrom = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0, 0));
    filterTo = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));
  } else if (filterType === 'year') {
    filterFrom = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
    filterTo = todayEnd;
  } else {
    filterFrom = new Date(filters.from);
    filterTo = new Date(filters.to);
  }

  let totalIncome = 0;

  for (const p of activeProfiles) {
    const amount = Number(p.amount) || 0;
    if (amount <= 0) continue;

    const freq = p.frequency || 'monthly';
    const profileStart = p.startDate ? new Date(p.startDate) : null;

    // Respect explicit future startDate
    if (profileStart && profileStart > filterTo) {
      continue;
    }

    let effectiveFrom = filterFrom;
    if (profileStart && profileStart > effectiveFrom) {
      effectiveFrom = profileStart;
    }

    if (effectiveFrom > filterTo) {
      continue;
    }

    if (filterType === 'today') {
      if (freq === 'daily') totalIncome += amount;
      else if (freq === 'weekly') totalIncome += amount / 7;
      else if (freq === 'yearly') totalIncome += amount / getDaysInYear(currentYear);
      else totalIncome += amount / daysInCurrentMonth;
    } else if (filterType === 'yesterday') {
      const yDate = new Date(Date.UTC(currentYear, currentMonth, currentDay - 1));
      const yDays = getDaysInMonth(yDate.getUTCFullYear(), yDate.getUTCMonth());
      if (freq === 'daily') totalIncome += amount;
      else if (freq === 'weekly') totalIncome += amount / 7;
      else if (freq === 'yearly') totalIncome += amount / getDaysInYear(yDate.getUTCFullYear());
      else totalIncome += amount / yDays;
    } else if (filterType === 'last_week') {
      if (freq === 'daily') totalIncome += amount * 7;
      else if (freq === 'weekly') totalIncome += amount;
      else if (freq === 'yearly') totalIncome += (7 / getDaysInYear(currentYear)) * amount;
      else totalIncome += (7 / 30.4375) * amount;
    } else if (filterType === 'last_month') {
      const lmDate = new Date(Date.UTC(currentYear, currentMonth, 0));
      const lmDays = lmDate.getUTCDate();
      const lmYear = lmDate.getUTCFullYear();
      if (freq === 'daily') totalIncome += amount * lmDays;
      else if (freq === 'weekly') totalIncome += (lmDays / 7) * amount;
      else if (freq === 'yearly') totalIncome += (lmDays / getDaysInYear(lmYear)) * amount;
      else totalIncome += amount;
    } else if (filterType === 'this_month') {
      const sDate = effectiveFrom.getUTCDate();
      const activeDays = currentDay - sDate + 1;
      if (freq === 'daily') totalIncome += amount * activeDays;
      else if (freq === 'weekly') totalIncome += (activeDays / 7) * amount;
      else if (freq === 'yearly') totalIncome += (activeDays / getDaysInYear(currentYear)) * amount;
      else totalIncome += (activeDays / daysInCurrentMonth) * amount;
    } else if (filterType === 'this_week') {
      const startMidnight = Date.UTC(effectiveFrom.getUTCFullYear(), effectiveFrom.getUTCMonth(), effectiveFrom.getUTCDate());
      const endMidnight = Date.UTC(filterTo.getUTCFullYear(), filterTo.getUTCMonth(), filterTo.getUTCDate());
      const daysElapsed = Math.min(7, Math.max(1, Math.floor((endMidnight - startMidnight) / 86400000) + 1));
      if (freq === 'daily') totalIncome += amount * daysElapsed;
      else if (freq === 'weekly') totalIncome += (daysElapsed / 7) * amount;
      else if (freq === 'yearly') totalIncome += (daysElapsed / getDaysInYear(currentYear)) * amount;
      else totalIncome += (daysElapsed / daysInCurrentMonth) * amount;
    } else if (filterType === 'year') {
      const startMidnight = Date.UTC(effectiveFrom.getUTCFullYear(), effectiveFrom.getUTCMonth(), effectiveFrom.getUTCDate());
      const endMidnight = Date.UTC(filterTo.getUTCFullYear(), filterTo.getUTCMonth(), filterTo.getUTCDate());
      const daysElapsed = Math.max(1, Math.floor((endMidnight - startMidnight) / 86400000) + 1);
      if (freq === 'daily') totalIncome += amount * daysElapsed;
      else if (freq === 'weekly') totalIncome += (daysElapsed / 7) * amount;
      else if (freq === 'yearly') totalIncome += (daysElapsed / getDaysInYear(currentYear)) * amount;
      else totalIncome += (currentMonth + (currentDay / daysInCurrentMonth)) * amount;
    } else {
      // Custom date range
      const startMidnight = Date.UTC(effectiveFrom.getUTCFullYear(), effectiveFrom.getUTCMonth(), effectiveFrom.getUTCDate());
      const endMidnight = Date.UTC(filterTo.getUTCFullYear(), filterTo.getUTCMonth(), filterTo.getUTCDate());
      const days = Math.max(1, Math.floor((endMidnight - startMidnight) / 86400000) + 1);
      if (freq === 'daily') totalIncome += amount * days;
      else if (freq === 'weekly') totalIncome += (days / 7) * amount;
      else if (freq === 'yearly') totalIncome += (days / 365.25) * amount;
      else totalIncome += (days / 30.4375) * amount;
    }
  }

  return round2(totalIncome);
};

module.exports = {
  calculateFixedIncome,
  isLeapYear,
  getDaysInYear,
  getDaysInMonth,
  round2,
};
