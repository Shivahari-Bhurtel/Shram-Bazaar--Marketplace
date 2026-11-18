/** Return a date-only value for Nepal's calendar date, independent of device timezone. */
export function nepalDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}

export function nepalYear(date = new Date()): number {
  return Number(nepalDateString(date).slice(0, 4))
}

export function daysUntilNepalDate(value: string, now = new Date()): number {
  if (!isDateOnlyString(value)) return Number.NaN
  const target = Date.parse(`${value}T00:00:00.000Z`)
  const today = Date.parse(`${nepalDateString(now)}T00:00:00.000Z`)
  return Math.round((target - today) / 86_400_000)
}

export function isDateOnlyString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

export function formatNepalDate(
  value: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = isDateOnlyString(value)
    ? new Date(`${value}T12:00:00+05:45`)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-NP", {
    ...options,
    timeZone: "Asia/Kathmandu",
  }).format(date)
}
