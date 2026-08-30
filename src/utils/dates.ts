export interface DateParts {
  year: number
  month: number
  day: number
}

export function parseIsoDate(iso: string): DateParts {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) throw new Error('Invalid date format')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidDateParts({ year, month, day })) throw new Error('Invalid calendar date')
  return { year, month, day }
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  if ([4, 6, 9, 11].includes(month)) return 30
  return 31
}

export function isValidDateParts(d: DateParts): boolean {
  if (d.month < 1 || d.month > 12) return false
  if (d.day < 1 || d.day > daysInMonth(d.year, d.month)) return false
  return true
}

export function toIsoDate(d: DateParts): string {
  return `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

export function toDateSerial(d: DateParts): number {
  let y = d.year
  let m = d.month
  const day = d.day
  if (m <= 2) {
    y -= 1
    m += 12
  }
  const era = Math.floor(y / 400)
  const yoe = y - era * 400
  const doy = Math.floor((153 * (m - 3) + 2) / 5) + day - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

function fromDateSerial(serial: number): DateParts {
  const era = Math.floor((serial >= 0 ? serial : serial - 146096) / 146097)
  const doe = serial - era * 146097
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
  const y = yoe + era * 400
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp < 10 ? mp + 3 : mp - 9
  const year = month <= 2 ? y + 1 : y
  return { year, month, day }
}

export interface DateDifferenceResult {
  years: number
  months: number
  days: number
  totalDays: number
  totalWeeks: number
}

export function dateDifference(start: DateParts, end: DateParts): DateDifferenceResult {
  const startSerial = toDateSerial(start)
  const endSerial = toDateSerial(end)
  const totalDays = endSerial - startSerial
  const negative = totalDays < 0
  let a = negative ? end : start
  let b = negative ? start : end

  let years = b.year - a.year
  let months = b.month - a.month
  let days = b.day - a.day

  if (days < 0) {
    months--
    const prevMonth = b.month === 1 ? 12 : b.month - 1
    const prevYear = b.month === 1 ? b.year - 1 : b.year
    days += daysInMonth(prevYear, prevMonth)
  }
  if (months < 0) {
    years--
    months += 12
  }

  if (negative) {
    years = -years
    months = -months
    days = -days
  }

  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks: totalDays / 7,
  }
}

export interface DateOffset {
  years?: number
  months?: number
  weeks?: number
  days?: number
}

export function addToDate(start: DateParts, offset: DateOffset): DateParts {
  let { year, month, day } = start
  const yearDelta = offset.years ?? 0
  const monthDelta = offset.months ?? 0

  if (yearDelta !== 0 || monthDelta !== 0) {
    const totalMonths = year * 12 + (month - 1) + monthDelta + yearDelta * 12
    year = Math.floor(totalMonths / 12)
    month = (totalMonths % 12) + 1
    const dim = daysInMonth(year, month)
    if (day > dim) day = dim
  }

  const weeks = offset.weeks ?? 0
  const days = offset.days ?? 0
  if (weeks !== 0 || days !== 0) {
    const serial = toDateSerial({ year, month, day }) + weeks * 7 + days
    return fromDateSerial(serial)
  }

  return { year, month, day }
}
