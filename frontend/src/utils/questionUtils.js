export function normalizeGroupAQuestions(items) {
  const result = []
  for (const item of items) {
    const requirement =
      item.requirement !== undefined && item.requirement !== null
        ? String(item.requirement).trim()
        : ''
    // Exclude "Requirement as per NBC" header and empty requirements
    if (
      !requirement ||
      requirement.toLowerCase() === 'requirement as per nbc'
    ) {
      continue
    }
    const block =
      item.block !== undefined && item.block !== null
        ? String(item.block).trim()
        : ''
    const clause =
      item.clause !== undefined && item.clause !== null
        ? String(item.clause).trim()
        : ''
    const base = {
      id: item.id,
      block,
      clause,
      requirement,
    }
    const lowerBlock = block.toLowerCase()
    const isLongComment =
      item.longComment ||
      lowerBlock.includes('additional observations') ||
      lowerBlock.includes('aditional observations')
    if (isLongComment) {
      result.push({ ...base, longComment: true })
    } else {
      result.push(base)
    }
  }
  return result
}
