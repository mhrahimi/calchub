/** Keep at most `maxPoints` rows, always including the first and last. */
export function downsamplePoints<T>(rows: T[], maxPoints: number): T[] {
  if (rows.length <= maxPoints) return rows
  const last = rows.length - 1
  const out: T[] = []
  let prev = -1
  for (let i = 0; i < maxPoints; i++) {
    const idx = i === maxPoints - 1 ? last : Math.round((i * last) / (maxPoints - 1))
    if (idx !== prev) {
      out.push(rows[idx])
      prev = idx
    }
  }
  return out
}

/** Bin a long amortization-style schedule so principal/interest charts cover the full term. */
export function aggregatePrincipalInterest(
  schedule: Array<{ period: number; principal: number; interest: number }>,
  maxPoints = 30,
): Array<{ period: number; principal: number; interest: number }> {
  if (schedule.length <= maxPoints) {
    return schedule.map((r) => ({
      period: r.period,
      principal: r.principal,
      interest: r.interest,
    }))
  }
  const binSize = Math.ceil(schedule.length / maxPoints)
  const bins: Array<{ period: number; principal: number; interest: number }> = []
  for (let i = 0; i < schedule.length; i += binSize) {
    const chunk = schedule.slice(i, i + binSize)
    bins.push({
      period: chunk[chunk.length - 1].period,
      principal: chunk.reduce((s, r) => s + r.principal, 0),
      interest: chunk.reduce((s, r) => s + r.interest, 0),
    })
  }
  return bins
}
