import { describe, expect, it } from 'vitest'
import type { Expense } from '../types'
import { calculateBalances, calculateSettlementPlan, splitByPercentage, splitEqually, splitWithAmounts } from './calculations'

describe('expense splits', () => {
  it('splits cents evenly without losing the remainder', () => {
    expect(splitEqually(10, ['a', 'b', 'c'])).toEqual({ a: 3.34, b: 3.33, c: 3.33 })
  })

  it('splits only across participating members', () => {
    expect(splitEqually(24, ['a', 'c'])).toEqual({ a: 12, c: 12 })
  })

  it('rejects custom shares that do not match the total', () => {
    expect(() => splitWithAmounts(18, { a: 10, b: 7 })).toThrow(/add up/)
    expect(() => splitWithAmounts(18, { a: -1, b: 19 })).toThrow(/non-negative/)
    expect(splitWithAmounts(18, { a: 10.25, b: 7.75 })).toEqual({ a: 10.25, b: 7.75 })
  })

  it('rejects splits without participants and percentages not adding to 100', () => {
    expect(() => splitEqually(10, [])).toThrow(/at least one/)
    expect(() => splitEqually(10, ['a', 'a'])).toThrow(/included once/)
    expect(() => splitByPercentage(10, { a: 60, b: 39.9 })).toThrow(/100%/)
  })

  it('allocates percentage remainders to preserve every cent', () => {
    expect(splitByPercentage(10, { a: 33.33, b: 33.33, c: 33.34 })).toEqual({ a: 3.33, b: 3.33, c: 3.34 })
  })
})

describe('balances and settlements', () => {
  const expenses: Expense[] = [
    { id: 'one', description: 'Dinner', amount: 30, category: 'Food', payerId: 'a', date: '2026-06-01', shares: { a: 10, b: 10, c: 10 } },
    { id: 'two', description: 'Cab', amount: 12, category: 'Transport', payerId: 'b', date: '2026-06-01', shares: { a: 6, b: 6 } },
  ]

  it('keeps the group total balanced at zero', () => {
    const balances = calculateBalances(expenses)
    expect(balances).toEqual({ a: 14, b: -4, c: -10 })
    expect(Object.values(balances).reduce((sum, balance) => sum + balance, 0)).toBe(0)
  })

  it('rejects malformed expense shares instead of creating non-zero group balances', () => {
    expect(() => calculateBalances([{
      ...expenses[0],
      shares: { a: 10, b: 10 },
    }])).toThrow(/add up/)
    expect(calculateBalances([expenses[0]])).toEqual({ a: 20, b: -10, c: -10 })
  })

  it('minimizes transfers and reflects completed settlements exactly once', () => {
    const plan = calculateSettlementPlan(calculateBalances(expenses))
    expect(plan).toEqual([
      { fromMemberId: 'c', toMemberId: 'a', amount: 10 },
      { fromMemberId: 'b', toMemberId: 'a', amount: 4 },
    ])
    const afterPayment = calculateBalances(expenses, [{ fromMemberId: 'b', toMemberId: 'a', amount: 4 }])
    expect(afterPayment).toEqual({ a: 10, b: 0, c: -10 })
    expect(calculateSettlementPlan(afterPayment)).toEqual([{ fromMemberId: 'c', toMemberId: 'a', amount: 10 }])
  })

  it('finds a smaller plan than largest-balance greedy pairing', () => {
    const plan = calculateSettlementPlan({ a: -7, b: -6, c: 1, d: 6, e: 6 })
    expect(plan).toHaveLength(3)
    expect(plan.reduce((sum, item) => sum + item.amount, 0)).toBe(13)
    const settled: Record<string, number> = { a: -7, b: -6, c: 1, d: 6, e: 6 }
    for (const payment of plan) {
      settled[payment.fromMemberId] += payment.amount
      settled[payment.toMemberId] -= payment.amount
    }
    expect(settled).toEqual({ a: 0, b: 0, c: 0, d: 0, e: 0 })
  })

  it('rejects balances that cannot produce a complete settlement plan', () => {
    expect(() => calculateSettlementPlan({ a: 10, b: -9 })).toThrow(/sum to zero/)
    expect(calculateSettlementPlan({ a: 0, b: 0 })).toEqual([])
  })
})
