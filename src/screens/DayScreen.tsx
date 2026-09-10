import { useMemo } from 'react'
import { useData } from '../lib/store'
import type { Entry } from '../lib/types'
import { cssColor } from '../lib/types'
import {
  WEEK_CN, daysInMonth, hhmm, pad2, parseISODate, toISODate, todayISO,
} from '../lib/format'
import { inMonth, onDay, sums } from '../lib/stats'
import { Blueprint, Empty } from '../components/ui'

/** 取选中日期所在周（周一起）的 7 天。 */
function weekOf(iso: string) {
  const d = parseISODate(iso)
  const shift = (d.getDay() + 6) % 7
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - shift)
  return Array.from({ length: 7 }, (_, i) =>
    toISODate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)))
}

const shiftMonth = (iso: string, delta: number) => {
  const d = parseISODate(iso)
  const y = d.getFullYear()
  const m = d.getMonth() + 1 + delta
  const target = new Date(y, m - 1, 1)
  const day = Math.min(d.getDate(), daysInMonth(target.getFullYear(), target.getMonth() + 1))
  return toISODate(new Date(target.getFullYear(), target.getMonth(), day))
}

export default function DayScreen({ date, setDate, onAdd, onEdit }: {
  date: string
  setDate: (iso: string) => void
  onAdd: () => void
  onEdit: (e: Entry) => void
}) {
  const { entries, categories, settings, money } = useData()
  const catById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])), [categories])

  const d = parseISODate(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const today = todayISO()

  const monthEntries = useMemo(() => inMonth(entries, year, month), [entries, year, month])
  const { spend, income, net } = sums(monthEntries)
  const budget = settings?.monthly_budget ?? 0
  const used = budget > 0 ? spend / budget : 0

  const week = weekOf(date)
  const dayHits = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) map.set(e.occurred_on, (map.get(e.occurred_on) ?? 0) + 1)
    return map
  }, [entries])

  const dayEntries = useMemo(() => onDay(entries, date), [entries, date])
  const dayTotal = dayEntries.reduce(
    (a, e) => a + (e.kind === 'income' ? -e.amount : e.amount), 0)

  const pastDays = useMemo(() => {
    const out: { iso: string; note: string; amount: number }[] = []
    const from = parseISODate(date)
    for (let i = 1; i <= 30 && out.length < 3; i++) {
      const prev = new Date(from.getFullYear(), from.getMonth(), from.getDate() - i)
      const iso = toISODate(prev)
      const list = onDay(entries, iso)
      if (list.length === 0) continue
      const names = [...new Set(list.map((e) =>
        catById.get(e.category_id ?? '')?.short ?? '未分类'))]
      out.push({
        iso,
        note: `${names.slice(0, 3).join(' · ')}（${list.length} 笔）`,
        amount: list.reduce((a, e) => a + (e.kind === 'income' ? -e.amount : e.amount), 0),
      })
    }
    return out
  }, [entries, date, catById])

  return (
    <>
      <div className="screen">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="kicker">DAILY LEDGER</div>
          <div className="muted" style={{ fontSize: 10, letterSpacing: '.08em' }}>
            FY{year} / M{pad2(month)}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6,
        }}>
          <h2 style={{ margin: 0, fontSize: 30 }}>{year}年{month}月</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-secondary step-btn"
              onClick={() => setDate(shiftMonth(date, -1))} aria-label="上个月">‹</button>
            <button type="button" className="btn btn-secondary step-btn"
              onClick={() => setDate(shiftMonth(date, 1))} aria-label="下个月">›</button>
          </div>
        </div>

        <Blueprint style={{
          marginTop: 16, padding: '12px 14px',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
        }}>
          <Stat label="支出" value={money(spend)} />
          <Stat label="收入" value={money(income)} />
          <Stat label="结余" value={money(net)} accent />
        </Blueprint>

        <div style={{ marginTop: 14 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 10.5, letterSpacing: '.06em',
          }} className="muted">
            <span>月预算 {money(budget)}</span>
            <span>
              {budget > 0
                ? `已用 ${(used * 100).toFixed(0)}% · ${spend > budget
                    ? `超支 ${money(spend - budget)}` : `余 ${money(budget - spend)}`}`
                : '未设预算'}
            </span>
          </div>
          <div className="bar" style={{ marginTop: 5 }}>
            <i style={{
              width: `${Math.min(used, 1) * 100}%`,
              background: spend > budget ? 'var(--color-accent-900)' : 'var(--color-accent)',
            }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 1, padding: '0 16px 14px' }}>
        {week.map((iso) => {
          const wd = parseISODate(iso)
          const on = iso === date
          const future = iso > today
          const hit = (dayHits.get(iso) ?? 0) > 0
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setDate(iso)}
              style={{
                flex: 1, padding: '7px 0 8px', textAlign: 'center', cursor: 'pointer',
                border: '1px solid var(--color-divider)', font: 'inherit',
                background: on ? 'var(--color-accent)' : 'transparent',
                color: on ? 'var(--color-bg)'
                  : future ? 'color-mix(in srgb, var(--color-text) 35%, transparent)'
                  : 'var(--color-text)',
              }}
            >
              <div style={{ fontSize: 9, letterSpacing: '.06em', opacity: 0.7 }}>
                {WEEK_CN[wd.getDay()]}
              </div>
              <div className="num" style={{ fontSize: 16, lineHeight: 1.3 }}>{wd.getDate()}</div>
              <div style={{
                width: 4, height: 4, margin: '2px auto 0',
                background: hit
                  ? (on ? 'var(--color-bg)' : 'var(--color-accent-400)')
                  : 'transparent',
              }} />
            </button>
          )
        })}
      </div>

      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        padding: '10px 16px 8px',
        borderTop: '1px solid var(--color-divider)',
        borderBottom: '1px solid var(--color-divider)',
        background: 'color-mix(in srgb, var(--color-text) 3%, transparent)',
      }}>
        <div className="num" style={{ fontSize: 17 }}>
          {month}月{d.getDate()}日{' '}
          <span style={{ fontSize: 12, opacity: 0.6 }}>（{WEEK_CN[d.getDay()]}）</span>
        </div>
        <div className="num" style={{ fontSize: 17 }}>{money(dayTotal)}</div>
      </div>

      {dayEntries.length === 0 ? (
        <Empty>
          这一天还没有记录。
          <div style={{ marginTop: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onAdd}>＋ 记一笔</button>
          </div>
        </Empty>
      ) : (
        dayEntries.map((e) => {
          const cat = catById.get(e.category_id ?? '')
          return (
            <button key={e.id} type="button" className="entry" onClick={() => onEdit(e)}>
              <span className="glyph" style={cat ? { color: cssColor(cat.color) } : undefined}>
                {cat?.glyph ?? '未'}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, lineHeight: 1.3 }}>
                  {e.note || cat?.name || '未命名'}
                </span>
                <span className="muted" style={{ display: 'flex', gap: 7, fontSize: 10.5 }}>
                  <span>{hhmm(e.occurred_at)}</span>
                  <span>{cat?.short ?? '未分类'}</span>
                  <span>{e.pay_method}</span>
                </span>
              </span>
              <span className="num" style={{
                fontSize: 16,
                color: e.kind === 'income' ? 'var(--color-accent-700)' : undefined,
              }}>
                {e.kind === 'income' ? '+' : ''}{money(e.amount)}
              </span>
            </button>
          )
        })
      )}

      {pastDays.length > 0 && (
        <>
          <div className="section-label" style={{ padding: '16px 16px 4px' }}>往前几天</div>
          {pastDays.map((p) => (
            <button key={p.iso} type="button" className="entry" onClick={() => setDate(p.iso)}>
              <span className="num" style={{ fontSize: 14, width: 52, flex: 'none' }}>
                {p.iso.slice(5).replace('-', '/')}
              </span>
              <span className="muted" style={{ flex: 1, fontSize: 11 }}>{p.note}</span>
              <span className="num" style={{ fontSize: 15 }}>{money(p.amount)}</span>
            </button>
          ))}
        </>
      )}
      <div style={{ height: 8 }} />
    </>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{
        fontSize: 9.5, letterSpacing: '.1em',
        color: accent ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-text) 55%, transparent)',
      }}>
        {label}
      </div>
      <div className="num" style={{
        fontSize: value.length > 9 ? 17 : value.length > 7 ? 19 : 22,
        lineHeight: 1.1, whiteSpace: 'nowrap',
        color: accent ? 'var(--color-accent-700)' : undefined,
      }}>
        {value}
      </div>
    </div>
  )
}
