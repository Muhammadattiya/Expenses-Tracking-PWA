/**
 * Centralized Canonical Cycle & Tracking Utilities for Finova
 * Authoritative mathematical calculation for weekly tracking cycles.
 */

/**
 * Format a Date to UTC "YYYY-MM-DD"
 */
const toDateKey = (d) => {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Calculate the canonical weekly tracking cycle for a given date and user preference.
 * 
 * @param {Date|string|number} dateVal - Transaction timestamp or reference date
 * @param {number} trackingStartDayWeekly - Authoritative user preference (0=Sun, 1=Mon, ..., 6=Sat)
 * @param {string} timezone - Timezone identifier (default: 'UTC')
 * @returns {{ weekKey: string, startDate: Date, endDate: Date, cycleStartDay: number }}
 */
const getWeeklyCycle = (dateVal, trackingStartDayWeekly = 6, timezone = 'UTC') => {
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date passed to getWeeklyCycle: ${dateVal}`);
  }

  const startDayPref = Math.max(0, Math.min(6, Number(trackingStartDayWeekly) || 0));

  if (timezone === 'UTC' || !timezone) {
    const dow = d.getUTCDay(); // 0 (Sun) to 6 (Sat)
    const diff = (dow - startDayPref + 7) % 7;

    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const dateNum = d.getUTCDate();

    const startDate = new Date(Date.UTC(y, m, dateNum - diff, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(y, m, dateNum - diff + 6, 23, 59, 59, 999));
    const weekKey = startDate.toISOString().slice(0, 10); // "YYYY-MM-DD"

    return {
      weekKey,
      startDate,
      endDate,
      cycleStartDay: startDayPref,
    };
  }

  // Timezone-aware calculation (e.g. 'Africa/Cairo')
  // Format parts to extract exact local calendar date and day-of-week
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });

  const parts = formatter.formatToParts(d);
  const partMap = {};
  for (const p of parts) partMap[p.type] = p.value;

  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const localDow = weekdayMap[partMap.weekday] ?? d.getUTCDay();
  const diff = (localDow - startDayPref + 7) % 7;

  const localY = parseInt(partMap.year, 10);
  const localM = parseInt(partMap.month, 10) - 1;
  const localD = parseInt(partMap.day, 10);

  // Compute boundaries in target timezone
  const startDate = new Date(Date.UTC(localY, localM, localD - diff, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(localY, localM, localD - diff + 6, 23, 59, 59, 999));
  const weekKey = startDate.toISOString().slice(0, 10);

  return {
    weekKey,
    startDate,
    endDate,
    cycleStartDay: startDayPref,
  };
};

/**
 * Checks if a date range (from, to) matches a single canonical weekly cycle
 * for a user's configured cycle start day.
 * 
 * @param {string|Date} from 
 * @param {string|Date} to 
 * @param {number} trackingStartDayWeekly 
 * @returns {boolean}
 */
const isMatchingWeeklyCycle = (from, to, trackingStartDayWeekly = 6) => {
  if (!from || !to) return false;
  const dFrom = new Date(from);
  const dTo = new Date(to);
  if (Number.isNaN(dFrom.getTime()) || Number.isNaN(dTo.getTime())) return false;

  const cycle = getWeeklyCycle(dFrom, trackingStartDayWeekly);
  
  // Tolerance check (within 2 seconds of exact cycle boundaries)
  const diffStart = Math.abs(dFrom.getTime() - cycle.startDate.getTime());
  const diffEnd = Math.abs(dTo.getTime() - cycle.endDate.getTime());

  if (diffStart < 2000 && diffEnd < 2000) {
    return true;
  }

  // Also check if duration is approx 7 days and starts on user's cycleStartDay in UTC
  const durationDays = (dTo.getTime() - dFrom.getTime()) / (1000 * 60 * 60 * 24);
  const isApprox7Days = durationDays >= 6.8 && durationDays <= 7.2;

  if (isApprox7Days && dFrom.getUTCDay() === cycle.cycleStartDay) {
    return true;
  }

  // Current tracking week (week-to-date up to today in UTC)
  const now = new Date();
  const currentCycle = getWeeklyCycle(now, trackingStartDayWeekly);
  if (cycle.weekKey === currentCycle.weekKey && diffStart < 2000) {
    const todayEndUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    const diffTodayEnd = Math.abs(dTo.getTime() - todayEndUTC.getTime());
    if (diffTodayEnd < 2000) {
      return true;
    }
  }

  return false;
};

module.exports = {
  toDateKey,
  getWeeklyCycle,
  isMatchingWeeklyCycle,
};
