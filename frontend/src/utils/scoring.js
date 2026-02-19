export function scoreFromStatus(status) {
  const s = (status || '').toLowerCase()
  if (s === 'in_place' || s === 'satisfactory') return 5
  if (s === 'partial' || s === 'observation') return 3
  if (s === 'not_in_place' || s === 'not_satisfactory') return 0
  if (s === 'not_relevant' || s === 'na') return 'NA'
  return 0
}

export function computePercentage(statuses) {
  let earned = 0
  let possible = 0
  for (const st of statuses) {
    const val = scoreFromStatus(st)
    if (val !== 'NA') {
      possible += 5
      earned += val
    }
  }
  const pct = possible > 0 ? (earned / possible) * 100 : 0
  return parseFloat(pct.toFixed(1))
}

