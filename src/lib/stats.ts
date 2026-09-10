import type { Category, Entry } from './types'
import { pad2 } from './format'

export const inMonth = (entries: Entry[], year: number, month1: number) => {
  const key = `${year}-${pad2(month1)}`
  return entries.filter((e) => e.occurred_on.startsWith(key))
}

export const inYear = (entries: Entry[], year: number) =>
  entries.filter((e) => e.occurred_on.startsWith(String(year)))

export const onDay = (entries: Entry[], iso: string) =>
  entries.filter((e) => e.occurred_on === iso)

export function sums(entries: Entry[]) {
  let spend = 0
  let income = 0
  for (const e of entries) {
    if (e.kind === 'income') income += e.amount
    else spend += e.amount
  }
  return { spend, income, net: income - spend }
}

export const spendOf = (entries: Entry[]) =>
  entries.reduce((a, e) => (e.kind === 'expense' ? a + e.amount : a), 0)

/** 按分类汇总支出，按金额降序；未分类归入「未分类」。 */
export function byCategory(entries: Entry[], categories: Category[]) {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (e.kind !== 'expense') continue
    const key = e.category_id ?? '∅'
    map.set(key, (map.get(key) ?? 0) + e.amount)
  }
  const rows = categories
    .filter((c) => c.kind === 'expense')
    .map((c) => ({ category: c, amount: map.get(c.id) ?? 0 }))
  const loose = map.get('∅') ?? 0
  if (loose > 0) {
    rows.push({
      category: {
        id: '∅', user_id: '', name: '未分类', short: '未分类', glyph: '未',
        kind: 'expense', budget: 0, color: 'neutral-300', sort: 999,
      },
      amount: loose,
    })
  }
  return rows.sort((a, b) => b.amount - a.amount)
}

/** 一年 12 个月的支出合计；未来的月份保留 0。 */
export function monthlySpend(entries: Entry[], year: number) {
  const out = Array<number>(12).fill(0)
  for (const e of entries) {
    if (e.kind !== 'expense') continue
    if (!e.occurred_on.startsWith(String(year))) continue
    out[Number(e.occurred_on.slice(5, 7)) - 1] += e.amount
  }
  return out
}

export function monthlyIncome(entries: Entry[], year: number) {
  const out = Array<number>(12).fill(0)
  for (const e of entries) {
    if (e.kind !== 'income') continue
    if (!e.occurred_on.startsWith(String(year))) continue
    out[Number(e.occurred_on.slice(5, 7)) - 1] += e.amount
  }
  return out
}

/** 每日支出映射：YYYY-MM-DD → 金额。 */
export function dailySpend(entries: Entry[]) {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (e.kind !== 'expense') continue
    map.set(e.occurred_on, (map.get(e.occurred_on) ?? 0) + e.amount)
  }
  return map
}

/** 每日笔数映射，用于日历圆点。 */
export function dailyCount(entries: Entry[]) {
  const map = new Map<string, number>()
  for (const e of entries) map.set(e.occurred_on, (map.get(e.occurred_on) ?? 0) + 1)
  return map
}

export const yearsCovered = (entries: Entry[]) => {
  const set = new Set<number>()
  for (const e of entries) set.add(Number(e.occurred_on.slice(0, 4)))
  set.add(new Date().getFullYear())
  return [...set].sort((a, b) => a - b)
}
