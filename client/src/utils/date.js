export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_DAYS = 14;

/**
 * The report period always ends on the chosen meeting date and covers the
 * 14 days before it. Returns the covered range's start date (YYYY-MM-DD).
 */
export function coverageStartFor(meetingDateISO) {
  const endMs = Date.parse(`${meetingDateISO}T00:00:00Z`);
  return new Date(endMs - PERIOD_DAYS * DAY_MS).toISOString().slice(0, 10);
}
