import { dataUrl } from '$lib/utils/url.js';

/**
 * @typedef {Object} CFMWeek
 * @property {string} start_date  YYYY-MM-DD
 * @property {string} end_date    YYYY-MM-DD
 * @property {string} verse_title regex snippet for the verseTitleFilter input
 */

export async function loadCFMSchedule() {
  try {
    const res = await fetch(dataUrl('cfm2026.json'));
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function parseDateLocal(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateRange(startDate, endDate) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const s = parseDateLocal(startDate);
  const e = parseDateLocal(endDate);
  return `${months[s.getMonth()]} ${s.getDate()}-${e.getDate()}`;
}

export function currentWeekIndex(schedule, today = new Date()) {
  return schedule.findIndex((week) => {
    const start = parseDateLocal(week.start_date);
    const end = parseDateLocal(week.end_date);
    end.setHours(23, 59, 59, 999);
    return today >= start && today <= end;
  });
}
