export function calendarDate(value: string | Date): Date {
  const d = typeof value === 'string' ? new Date(`${value.slice(0,10)}T00:00:00Z`) : new Date(value)
  if (!Number.isFinite(d.getTime()) || (typeof value === 'string' && d.toISOString().slice(0,10) !== value.slice(0,10))) throw new Error('Invalid cash-flow date')
  return d
}
export function dateText(d: Date): string { return d.toISOString().slice(0,10) }
export function eventDate(anchor: Date, index: number, frequency = 'monthly'): Date {
  const days = { daily: 1, weekly: 7, 'bi-weekly': 14 }[frequency]
  if (days) return new Date(anchor.getTime() + index * days * 86400000)
  if (frequency === 'bi-monthly' || frequency === 'semimonthly') {
    // Twice per calendar month, anchored on the first and sixteenth.
    const month = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1))
    const offset = anchor.getUTCDate() > 16 ? 2 : anchor.getUTCDate() > 1 ? 1 : 0
    const n = index + offset
    const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + Math.floor(n / 2), n % 2 ? 16 : 1))
    return date
  }
  const months = { monthly: 1, quarterly: 3, 'semi-annual': 6, annual: 12, yearly: 12 }[frequency]
  if (!months) throw new Error(`Unsupported frequency: ${frequency}`)
  const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + index * months, 1))
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(anchor.getUTCDate(), last))
  return d
}
export function periodCoordinate(date: Date, anchor: Date, frequency: string): number {
  const days = { daily: 1, weekly: 7, 'bi-weekly': 14 }[frequency]
  if (days) return (date.getTime()-anchor.getTime())/(days*86400000)
  const months = { monthly:1, quarterly:3, 'semi-annual':6, annual:12, yearly:12 }[frequency]
  const monthDistance = (date.getUTCFullYear()-anchor.getUTCFullYear())*12+date.getUTCMonth()-anchor.getUTCMonth()
  let i = months ? Math.max(0, Math.floor(monthDistance/months)-1) : Math.max(0,monthDistance*2-3)
  while(eventDate(anchor,i+1,frequency)<=date) { if(++i>200000) throw new Error('Timeline too long') }
  const a=eventDate(anchor,i,frequency).getTime(), b=eventDate(anchor,i+1,frequency).getTime()
  return i+(date.getTime()-a)/(b-a)
}
