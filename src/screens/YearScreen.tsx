import { useMemo, useState } from 'react'
import { useData } from '../lib/store'
import { cssColor } from '../lib/types'
import { toISODate } from '../lib/format'
import { byCategory, dailySpend, inYear, monthlySpend, sums } from '../lib/stats'
import { SectionLabel } from '../components/ui'

const HEAT = [
  'color-mix(in srgb, var(--color-text) 9%, transparent)',
  'var(--color-accent-200)',
  'var(--color-accent-400)',
  'var(--color-accent-600)',
  'var(--color-accent-900)',
]

export default function YearScreen({ year, setYear }: {
  year: number
  setYear: (y: number) => void
}) {
  const { entries, categories, money } = useData()
  const [picked, setPicked] = useState(new Date().getMonth() + 1)

  const list = useMemo(() => inYear(entries, year), [entries, year])
  const { spend, income, net } = sums(list)
  const months = useMemo(() => monthlySpend(entries, year), [entries, year])
  const maxMonth = Math.max(1, ...months)

  const daily = useMemo(() => dailySpend(list), [list])
  const peak = useMemo(() => {
    let best: { iso: string; v: number } | null = null
    for (const [iso, v] of daily) if (!best || v > best.v) best = { iso, v }
    return best
  }, [daily])

  const heat = useMemo(() => {
    const max = peak?.v ?? 0
    const cells: { iso: string; v: number; c: string }[] = []
    const start = new Date(year, 0, 1)
    const end = new Date(year, 11, 31)
    // 从当年 1 月 1 日所在周的周一开始铺格子，列即一周。
    const lead = (start.getDay() + 6) % 7
    for (let i = -lead; ; i++) {
      const d = new Date(year, 0, 1 + i)
      if (d > end) break
      const iso = toISODate(d)
      const v = d.getFullYear() === year ? (daily.get(iso) ?? 0) : -1
      const level = v < 0 ? -1
        : v === 0 ? 0
        : max <= 0 ? 1
        : v < max * 0.15 ? 1 : v < max * 0.35 ? 2 : v < max * 0.65 ? 3 : 4
      cells.push({
        iso, v,
        c: level < 0 ? 'transparent' : HEAT[level],
      })
    }
    return cells
  }, [daily, year, peak])

  const catRows = useMemo(() => byCategory(list, categories), [list, categories])
  const catMax = Math.max(1, ...catRows.map((r) => r.amount))

  const now = new Date().getFullYear()

  return (
    <div className="screen">
      <div className="kicker">ANNUAL</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h2 className="screen-title">{year}年 年度统计</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn btn-secondary step-btn"
            onClick={() => setYear(year - 1)} aria-label="上一年">‹</button>
          <button type="button" className="btn btn-secondary step-btn"
            onClick={() => setYear(year + 1)} disabled={year >= now} aria-label="下一年">›</button>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, marginTop: 14,
        border: '1px solid var(--color-divider)',
      }}>
        <Cell label="年支出" value={money(spend)} border />
        <Cell label="年收入" value={money(income)} border />
        <Cell label="结余" value={money(net)} accent />
      </div>

      <div style={{
        marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <SectionLabel>逐月支出</SectionLabel>
        <div style={{ fontSize: 11 }}>
          {picked}月{' '}
          <span className="num" style={{ fontSize: 14 }}>
            {months[picked - 1] > 0 ? money(months[picked - 1]) : '未记账'}
          </span>
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 3, height: 110, marginTop: 8,
        borderBottom: '1px solid var(--color-divider)',
      }}>
        {months.map((v, i) => (
          <button
            key={i} type="button" onClick={() => setPicked(i + 1)}
            style={{
              flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end',
              cursor: 'pointer', border: 0, background: 'none', padding: 0,
            }}
            aria-label={`${i + 1}月`}
          >
            <span style={{
              width: '100%',
              height: v > 0 ? `${Math.max((v / maxMonth) * 100, 3)}%` : '2px',
              background: v > 0
                ? (picked === i + 1
                  ? 'var(--color-accent-800)'
                  : 'color-mix(in srgb, var(--color-accent) 45%, transparent)')
                : 'color-mix(in srgb, var(--color-text) 12%, transparent)',
              borderTop: v > 0 ? '1px solid var(--color-accent-900)' : 'none',
            }} />
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
        {months.map((_, i) => (
          <div key={i} className="num" style={{
            flex: 1, textAlign: 'center', fontSize: 9,
            color: picked === i + 1
              ? 'var(--color-accent-700)'
              : 'color-mix(in srgb, var(--color-text) 45%, transparent)',
          }}>
            {i + 1}
          </div>
        ))}
      </div>

      <SectionLabel style={{ marginTop: 22 }}>支出热力日历</SectionLabel>
      <div style={{
        marginTop: 9, display: 'grid', gridTemplateRows: 'repeat(7, 6px)',
        gridAutoFlow: 'column', gap: 1.5, overflowX: 'auto', paddingBottom: 2,
      }}>
        {heat.map((h, i) => (
          <div key={i}
            title={h.v >= 0 ? `${h.iso} ${money(h.v)}` : undefined}
            style={{ width: 6, height: 6, background: h.c }} />
        ))}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
        fontSize: 9.5, opacity: 0.6,
      }}>
        <span>少</span>
        {HEAT.slice(1).map((c, i) => (
          <div key={i} style={{ width: 9, height: 9, background: c }} />
        ))}
        <span>多</span>
        <span style={{ marginLeft: 'auto' }}>
          {peak ? `单日最高 ${money(peak.v)}（${peak.iso.slice(5).replace('-', '月')}日）` : '暂无数据'}
        </span>
      </div>

      <SectionLabel style={{ marginTop: 22 }}>分类年度合计</SectionLabel>
      <div style={{ marginTop: 8, paddingBottom: 10 }}>
        {catRows.filter((r) => r.amount > 0).map((r) => (
          <div key={r.category.id} className="hairline" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
          }}>
            <span className="glyph" style={{
              width: 22, height: 22, fontSize: 11, color: cssColor(r.category.color),
            }}>
              {r.category.glyph}
            </span>
            <span style={{ flex: 1, fontSize: 12 }}>{r.category.short}</span>
            <span style={{ width: 70 }}>
              <span style={{
                display: 'block', height: 5,
                background: 'color-mix(in srgb, var(--color-text) 10%, transparent)',
              }}>
                <span style={{
                  display: 'block', height: '100%', background: cssColor(r.category.color),
                  width: `${(r.amount / catMax) * 100}%`,
                }} />
              </span>
            </span>
            <span className="num" style={{ fontSize: 13.5, width: 84, textAlign: 'right' }}>
              {money(r.amount)}
            </span>
          </div>
        ))}
        {catRows.every((r) => r.amount === 0) && (
          <div className="muted" style={{ fontSize: 12, padding: '12px 0' }}>这一年还没有支出记录。</div>
        )}
      </div>
    </div>
  )
}

function Cell({ label, value, border, accent }: {
  label: string
  value: string
  border?: boolean
  accent?: boolean
}) {
  return (
    <div style={{
      padding: '9px 10px',
      borderRight: border ? '1px solid var(--color-divider)' : undefined,
    }}>
      <div style={{
        fontSize: 9, letterSpacing: '.1em',
        color: accent ? 'var(--color-accent)' : undefined,
        opacity: accent ? 1 : 0.55,
      }}>
        {label}
      </div>
      <div className="num" style={{
        fontSize: 18, color: accent ? 'var(--color-accent-700)' : undefined,
      }}>
        {value}
      </div>
    </div>
  )
}
