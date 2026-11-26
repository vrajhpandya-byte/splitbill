import type { Expense, SettlementSuggestion } from '../types'

const toCents = (amount: number) => Math.round((amount + Number.EPSILON) * 100)
const fromCents = (amount: number) => amount / 100

export function splitEqually(amount: number, memberIds: string[]): Record<string, number> {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be a non-negative number.')
  if (memberIds.length === 0) throw new Error('Select at least one participant.')
  if (new Set(memberIds).size !== memberIds.length) throw new Error('Each participant can only be included once.')
  const totalCents = toCents(amount)
  const baseCents = Math.floor(totalCents / memberIds.length)
  const remainder = totalCents - baseCents * memberIds.length
  return Object.fromEntries(memberIds.map((id, index) => [id, fromCents(baseCents + (index < remainder ? 1 : 0))]))
}

export function splitWithAmounts(amount: number, shares: Record<string, number>): Record<string, number> {
  const totalCents = toCents(amount)
  const values = Object.entries(shares)
  if (!Number.isFinite(amount) || amount < 0 || values.length === 0) throw new Error('Enter an amount and select participants.')
  if (values.some(([, share]) => !Number.isFinite(share) || share < 0)) throw new Error('Shares must be non-negative numbers.')
  const sharesCents = values.map(([id, share]) => [id, toCents(share)] as const)
  if (sharesCents.reduce((total, [, cents]) => total + cents, 0) !== totalCents) {
    throw new Error('Custom shares must add up to the expense total.')
  }
  return Object.fromEntries(sharesCents.map(([id, cents]) => [id, fromCents(cents)]))
}

export function splitByPercentage(amount: number, percentages: Record<string, number>): Record<string, number> {
  const values = Object.entries(percentages)
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Amount must be a non-negative number.')
  if (values.length === 0) throw new Error('Select at least one participant.')
  if (values.some(([, percentage]) => !Number.isFinite(percentage) || percentage < 0)) {
    throw new Error('Percentages must be non-negative numbers.')
  }
  if (Math.abs(values.reduce((total, [, percentage]) => total + percentage, 0) - 100) > 0.000001) {
    throw new Error('Percentages must add up to 100%.')
  }

  const totalCents = toCents(amount)
  const rawShares = values.map(([id, percentage]) => ({ id, raw: totalCents * percentage / 100 }))
  const roundedShares = rawShares.map(({ id, raw }) => ({ id, cents: Math.floor(raw), remainder: raw - Math.floor(raw) }))
  let remainderCents = totalCents - roundedShares.reduce((sum, share) => sum + share.cents, 0)
  for (const share of [...roundedShares].sort((a, b) => b.remainder - a.remainder)) {
    if (remainderCents === 0) break
    share.cents += 1
    remainderCents -= 1
  }
  return Object.fromEntries(roundedShares.map(({ id, cents }) => [id, fromCents(cents)]))
}

export function calculateBalances(
  expenses: Expense[],
  settlements: Pick<SettlementSuggestion, 'fromMemberId' | 'toMemberId' | 'amount'>[] = [],
): Record<string, number> {
  const balancesInCents: Record<string, number> = {}
  for (const expense of expenses) {
    if (!Number.isFinite(expense.amount) || expense.amount <= 0) {
      throw new Error('Expense amounts must be finite values greater than zero.')
    }
    const amountCents = toCents(expense.amount)
    const shareEntries = Object.entries(expense.shares)
    if (shareEntries.length === 0 || shareEntries.some(([, share]) => !Number.isFinite(share) || share < 0)) {
      throw new Error('Expense shares must include at least one valid, non-negative amount.')
    }
    const sharesCents = shareEntries.map(([memberId, share]) => [memberId, toCents(share)] as const)
    if (sharesCents.reduce((total, [, cents]) => total + cents, 0) !== amountCents) {
      throw new Error('Expense shares must add up to the expense total.')
    }

    balancesInCents[expense.payerId] = (balancesInCents[expense.payerId] ?? 0) + amountCents
    for (const [memberId, cents] of sharesCents) {
      balancesInCents[memberId] = (balancesInCents[memberId] ?? 0) - cents
    }
  }
  for (const settlement of settlements) {
    if (!Number.isFinite(settlement.amount) || settlement.amount <= 0 || settlement.fromMemberId === settlement.toMemberId) {
      throw new Error('Settlements must have distinct members and a valid positive amount.')
    }
    const cents = toCents(settlement.amount)
    balancesInCents[settlement.fromMemberId] = (balancesInCents[settlement.fromMemberId] ?? 0) + cents
    balancesInCents[settlement.toMemberId] = (balancesInCents[settlement.toMemberId] ?? 0) - cents
  }
  return Object.fromEntries(Object.entries(balancesInCents).map(([id, cents]) => [id, fromCents(cents)]))
}

export function calculateSettlementPlan(balances: Record<string, number>): SettlementSuggestion[] {
  const memberIds = Object.keys(balances)
  const initialCents = memberIds.map((id) => {
    const balance = balances[id]
    if (!Number.isFinite(balance)) throw new Error('Member balances must be finite numbers.')
    return Math.abs(balance) < 0.005 ? 0 : toCents(balance)
  })
  if (initialCents.reduce((total, cents) => total + cents, 0) !== 0) {
    throw new Error('Member balances must sum to zero before creating a settlement plan.')
  }
  const memo = new Map<string, number>()

  const minimumTransfers = (state: number[]): number => {
    const first = state.findIndex((cents) => cents !== 0)
    if (first === -1) return 0
    const key = state.join(',')
    const cached = memo.get(key)
    if (cached !== undefined) return cached

    let creditors = 0
    let debtors = 0
    for (const cents of state) {
      if (cents > 0) creditors += 1
      if (cents < 0) debtors += 1
    }
    const lowerBound = Math.max(creditors, debtors)
    if (lowerBound === 1) return 1

    const candidates = state
      .map((cents, index) => ({ cents, index }))
      .filter(({ cents, index }) => index > first && cents * state[first] < 0)
      .sort((a, b) => Math.min(Math.abs(state[first]), Math.abs(b.cents))
        - Math.min(Math.abs(state[first]), Math.abs(a.cents)))
    const seenBalances = new Set<number>()
    let best = Number.POSITIVE_INFINITY
    for (const { cents, index } of candidates) {
      if (seenBalances.has(cents)) continue
      seenBalances.add(cents)
      const amount = Math.min(Math.abs(state[first]), Math.abs(cents))
      const next = [...state]
      next[first] += state[first] < 0 ? amount : -amount
      next[index] += cents < 0 ? amount : -amount
      best = Math.min(best, 1 + minimumTransfers(next))
      if (best === lowerBound) break
    }
    memo.set(key, best)
    return best
  }

  const plan: SettlementSuggestion[] = []
  const state = [...initialCents]
  let remaining = minimumTransfers(state)
  while (remaining > 0) {
    const first = state.findIndex((cents) => cents !== 0)
    const candidates = state
      .map((cents, index) => ({ cents, index }))
      .filter(({ cents, index }) => index > first && cents * state[first] < 0)
      .sort((a, b) => Math.min(Math.abs(state[first]), Math.abs(b.cents))
        - Math.min(Math.abs(state[first]), Math.abs(a.cents)))
    const seenBalances = new Set<number>()
    let nextState: number[] | undefined

    for (const { cents, index } of candidates) {
      if (seenBalances.has(cents)) continue
      seenBalances.add(cents)
      const amount = Math.min(Math.abs(state[first]), Math.abs(cents))
      const next = [...state]
      next[first] += state[first] < 0 ? amount : -amount
      next[index] += cents < 0 ? amount : -amount
      if (1 + minimumTransfers(next) !== remaining) continue

      const fromIndex = state[first] < 0 ? first : index
      const toIndex = state[first] < 0 ? index : first
      plan.push({
        fromMemberId: memberIds[fromIndex],
        toMemberId: memberIds[toIndex],
        amount: fromCents(amount),
      })
      nextState = next
      break
    }

    if (!nextState) throw new Error('Could not construct a valid settlement plan.')
    state.splice(0, state.length, ...nextState)
    remaining -= 1
  }
  return plan
}

export function formatCurrency(amount: number, currency = 'USD', compact = false): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function getExpenseTotal(expenses: Expense[]): number {
  return Math.round(expenses.reduce((total, expense) => total + toCents(expense.amount), 0)) / 100
}
