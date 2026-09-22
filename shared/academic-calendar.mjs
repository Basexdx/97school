export const ACADEMIC_YEAR = '2026-2027'
export const SCHOOL_YEAR_START = '2026-09-01'
export const SCHOOL_YEAR_END = '2027-05-28'

export const SCHOOL_BREAKS = [
  { id: 'autumn-1', title: 'Осенние каникулы', start: '2026-10-05', end: '2026-10-11' },
  { id: 'autumn-2', title: 'Осенние каникулы', start: '2026-11-16', end: '2026-11-22' },
  { id: 'winter', title: 'Зимние каникулы', start: '2026-12-31', end: '2027-01-10' },
  { id: 'february', title: 'Февральские каникулы', start: '2027-02-22', end: '2027-02-28' },
  { id: 'spring', title: 'Весенние каникулы', start: '2027-04-05', end: '2027-04-11' },
]

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

export function isSchoolBreak(iso) {
  return SCHOOL_BREAKS.some(item => iso >= item.start && iso <= item.end)
}

export function generateLessonDates() {
  const dates = []
  const cursor = new Date(`${SCHOOL_YEAR_START}T12:00:00Z`)
  const end = new Date(`${SCHOOL_YEAR_END}T12:00:00Z`)
  while (cursor <= end) {
    const iso = isoDate(cursor)
    const day = cursor.getUTCDay()
    if ((day === 2 || day === 5) && !isSchoolBreak(iso)) dates.push(iso)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

export function formatSchoolDate(iso, options = {}) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: options.short ? 'short' : 'long', weekday: options.weekday ? 'short' : undefined,
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`))
}

export function tomorrowIso(now = new Date()) {
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`
}
