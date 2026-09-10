export type Kind = 'expense' | 'income'

export type Settings = {
  user_id: string
  currency: string
  monthly_budget: number
  theme: 'paper' | 'steel'
  start_day: number
}

export type Category = {
  id: string
  user_id: string
  name: string
  short: string
  glyph: string
  kind: Kind
  budget: number
  color: string
  sort: number
}

export type Entry = {
  id: string
  user_id: string
  occurred_on: string // YYYY-MM-DD
  occurred_at: string // HH:MM:SS
  kind: Kind
  amount: number
  category_id: string | null
  note: string
  pay_method: string
}

export type Account = {
  id: string
  user_id: string
  name: string
  sub: string
  glyph: string
  balance: number
  sort: number
}

export const PAY_METHODS = ['现金', 'IC卡', '信用卡', '银行'] as const

export const COLOR_TOKENS = [
  'accent-800', 'accent-700', 'accent-600', 'accent-500',
  'accent-400', 'accent-300', 'accent-2-600', 'accent-2-400',
  'neutral-400', 'neutral-300',
] as const

export const cssColor = (token: string) => `var(--color-${token})`
