export type GroupType = 'Trip' | 'Home' | 'Couple' | 'Friends' | 'Other'
export type ExpenseCategory = 'Food' | 'Stay' | 'Transport' | 'Shopping' | 'Activities' | 'Bills' | 'Other'
export type SplitType = 'equal' | 'custom' | 'percentage'
export type Page = 'overview' | 'groups' | 'balances' | 'activity' | 'settings'

export interface Member {
  id: string
  name: string
  email?: string
  color: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  payerId: string
  date: string
  notes?: string
  shares: Record<string, number>
  splitType?: SplitType
  splitValues?: Record<string, number>
}

export interface Settlement {
  id: string
  fromMemberId: string
  toMemberId: string
  amount: number
  completedAt: string
}

export interface Group {
  id: string
  name: string
  description: string
  currency: string
  type: GroupType
  startDate?: string
  endDate?: string
  inviteCode: string
  members: Member[]
  expenses: Expense[]
  settlements: Settlement[]
  createdAt: string
}

export interface SettlementSuggestion {
  fromMemberId: string
  toMemberId: string
  amount: number
}
