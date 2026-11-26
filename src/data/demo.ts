import type { Group } from '../types'

export const demoGroups: Group[] = [
  {
    id: 'group-coast',
    name: 'Pacific coast',
    description: 'Salt air, slow mornings, and the long way home.',
    currency: 'USD',
    type: 'Trip',
    startDate: '2026-07-12',
    endDate: '2026-07-18',
    inviteCode: 'pacific-7h4k2',
    createdAt: '2026-06-18T10:00:00.000Z',
    members: [
      { id: 'member-maya', name: 'Maya Chen', email: 'maya@example.com', color: '#b5c9ad' },
      { id: 'member-jamie', name: 'Jamie Rivera', color: '#e9c2a8' },
      { id: 'member-oliver', name: 'Oliver James', color: '#bbc8df' },
      { id: 'member-sam', name: 'Sam Patel', color: '#dfb9c9' },
    ],
    expenses: [
      { id: 'expense-1', description: 'Airbnb in Big Sur', amount: 840, category: 'Stay', payerId: 'member-maya', date: '2026-07-12', notes: 'Three nights, cabin with a view', shares: { 'member-maya': 210, 'member-jamie': 210, 'member-oliver': 210, 'member-sam': 210 } },
      { id: 'expense-2', description: 'Groceries & road snacks', amount: 126.48, category: 'Food', payerId: 'member-jamie', date: '2026-07-13', shares: { 'member-maya': 31.62, 'member-jamie': 31.62, 'member-oliver': 31.62, 'member-sam': 31.62 } },
      { id: 'expense-3', description: 'Coastal drive gas', amount: 78, category: 'Transport', payerId: 'member-oliver', date: '2026-07-14', shares: { 'member-maya': 19.5, 'member-jamie': 19.5, 'member-oliver': 19.5, 'member-sam': 19.5 } },
      { id: 'expense-4', description: 'Dinner at The Wild Coast', amount: 164.8, category: 'Food', payerId: 'member-sam', date: '2026-07-15', shares: { 'member-maya': 41.2, 'member-jamie': 41.2, 'member-oliver': 41.2, 'member-sam': 41.2 } },
      { id: 'expense-5', description: 'Kayak rental', amount: 96, category: 'Activities', payerId: 'member-maya', date: '2026-07-16', shares: { 'member-maya': 24, 'member-jamie': 24, 'member-oliver': 24, 'member-sam': 24 } },
    ],
    settlements: [],
  },
  {
    id: 'group-flat',
    name: 'The little flat',
    description: 'Home things, split fairly.',
    currency: 'USD',
    type: 'Home',
    inviteCode: 'little-flat-9k2',
    createdAt: '2026-03-01T10:00:00.000Z',
    members: [
      { id: 'member-maya', name: 'Maya Chen', color: '#b5c9ad' },
      { id: 'member-jamie', name: 'Jamie Rivera', color: '#e9c2a8' },
      { id: 'member-oliver', name: 'Oliver James', color: '#bbc8df' },
    ],
    expenses: [
      { id: 'flat-1', description: 'Monthly utilities', amount: 138.6, category: 'Bills', payerId: 'member-oliver', date: '2026-10-28', shares: { 'member-maya': 46.2, 'member-jamie': 46.2, 'member-oliver': 46.2 } },
      { id: 'flat-2', description: 'Sunday dinner', amount: 54, category: 'Food', payerId: 'member-maya', date: '2026-11-02', shares: { 'member-maya': 18, 'member-jamie': 18, 'member-oliver': 18 } },
    ],
    settlements: [],
  },
  {
    id: 'group-weekend',
    name: 'A very good weekend',
    description: 'The annual friends getaway.',
    currency: 'USD',
    type: 'Friends',
    inviteCode: 'good-weekend-4m1',
    createdAt: '2026-01-19T10:00:00.000Z',
    members: [
      { id: 'member-maya', name: 'Maya Chen', color: '#b5c9ad' },
      { id: 'member-sam', name: 'Sam Patel', color: '#dfb9c9' },
      { id: 'member-jamie', name: 'Jamie Rivera', color: '#e9c2a8' },
    ],
    expenses: [
      { id: 'weekend-1', description: 'Cabin for the weekend', amount: 450, category: 'Stay', payerId: 'member-sam', date: '2026-09-10', shares: { 'member-maya': 150, 'member-jamie': 150, 'member-sam': 150 } },
    ],
    settlements: [],
  },
]
