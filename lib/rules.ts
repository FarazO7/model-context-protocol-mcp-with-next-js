// Business rules (SPEC section 5) live here as pure functions. Slice 2 adds status and due dates.
// Calendar dates are "YYYY-MM-DD" strings in Asia/Kolkata.

const IST_OFFSET_MS = 330 * 60 * 1000; // UTC+5:30; India has no daylight saving.

export function todayIST(now = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
