export const CURRENCY_SYMBOL: Record<string, string> = {
  'JPY ¥': '¥',
  'CNY ¥': '¥',
  'USD $': '$',
  'EUR €': '€',
}

/** 日元不带小数；其他币种保留两位。 */
export function makeMoney(currency: string) {
  const symbol = CURRENCY_SYMBOL[currency] ?? '¥'
  const fraction = currency === 'JPY ¥' ? 0 : 2
  return (n: number) => {
    const sign = n < 0 ? '−' : ''
    const abs = Math.abs(n)
    return (
      sign +
      symbol +
      abs.toLocaleString('en-US', {
        minimumFractionDigits: fraction,
        maximumFractionDigits: fraction,
      })
    )
  }
}

export const WEEK_CN = ['日', '月', '火', '水', '木', '金', '土']

export const pad2 = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

export const parseISODate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISODate(new Date())

export const nowTime = () => {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export const hhmm = (t: string) => t.slice(0, 5)

export const monthKey = (iso: string) => iso.slice(0, 7)

export const daysInMonth = (year: number, month1: number) =>
  new Date(year, month1, 0).getDate()

export function addMonths(year: number, month1: number, delta: number) {
  const d = new Date(year, month1 - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`
