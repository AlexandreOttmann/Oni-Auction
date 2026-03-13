export function anonymizeBidder(userId: string, bidHistory: Array<{ bidder?: string; user_id?: string }>): string {
  const ids: string[] = []
  for (const entry of [...bidHistory].reverse()) {
    const id = entry.user_id ?? entry.bidder ?? ''
    if (id && !ids.includes(id)) ids.push(id)
  }
  const idx = ids.indexOf(userId)
  if (idx === -1) {
    ids.push(userId)
    return `Bidder #${ids.length}`
  }
  return `Bidder #${idx + 1}`
}
