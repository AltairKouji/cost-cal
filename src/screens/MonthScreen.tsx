import { useMemo } from 'react'
import { useData } from '../lib/store'
import { cssColor } from '../lib/types'
import { addMonths, pad2 } from '../lib/format'
import { byCategory, inMonth, spendOf, sums } from '../lib/stats'
import { Empty, SectionLabel } from '../components/ui'

const C = 2 * Math.PI * 54 // 圆环周长

export type MonthCursor = { year: number; month: number }

export default function MonthScreen({ cursor, setCursor }: {
  cursor: MonthCursor
  setCursor: (c: MonthCursor) => void
}) {
  const { entries, categories, settings, money } = useData()
  const { year, month } = cursor

  const list = useMemo(() => inMonth(entries, year, month), [entries, year, month])
  const { spend, income, net } = sums(list)
  const budget = settings?.monthly_budget ?? 0

  const prev = addMonths(year, month, -1)
  const prevSpend = useMemo(
    () => spendOf(inMonth(entries, prev.year, prev.month)), [entries, prev.year, prev.month])

  const rows = useMemo(() => byCategory(list, categories), [list, categories])
  const spent = rows.filter((r) => r.amount > 0)

  const donut = useMemo(() => {
    let acc = 0
    return spent.map((r) => {
      const len = spend > 0 ? (r.amount / spend) * C : 0
      const off = -acc
      acc += len
      return {
        id: r.category.id,
        color: cssColor(r.category.color),
        dash: `${Math.max(len - 2, 0).toFixed(1)} ${C.toFixed(2)}`,
        off: off.toFixed(1),
      }
    })
  }, [spent, spend])

  // 近六个月支出，含当前月
  const six = useMemo(() => {
    const out: { label: string; month: number; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const m = addMonths(year, month, -i)
      const v = spendOf(inMonth(entries, m.year, m.month))
      out.push({ label: `${(v / 10000).toFixed(1)}万`, month: m.month, value: v })
    }
    return out
  }, [entries, year, month])
  const sixMax = Math.max(1, ...six.map((s) => s.value))

  const topThree = useMemo(
    () => [...list].filter((e) => e.kind === 'expense')
      .sort((a, b) => b.amount - a.amount).slice(0, 3), [list])
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const delta = prevSpend > 0
    ? `${spend >= prevSpend ? '+' : '−'}${(Math.abs(spend - prevSpend) / prevSpend * 100).toFixed(1)}%`
    : '—'

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="kicker">MONTHLY · M{pad2(month)}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="btn btn-secondary step-btn"
            onClick={() => setCursor(addMonths(year, month, -1))} aria-label="上个月">‹</button>
          <button type="button" className="btn btn-secondary step-btn"
            onClick={() => setCursor(addMonths(year, month, 1))} aria-label="下个月">›</button>
        </div>
      </div>
      <h2 className="screen-title">{year}年{month}月 统计</h2>

      {list.length === 0 ? (
        <Empty>这个月还没有记录。</Empty>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
            <div style={{ position: 'relative', width: 150, height: 150, flex: 'none' }}>
              <svg viewBox="0 0 120 120" style={{ width: 150, height: 150, display: 'block' }}>
                <circle cx="60" cy="60" r="54" fill="none" strokeWidth="11"
                  stroke="color-mix(in srgb, var(--color-text) 10%, transparent)" />
                {donut.map((s) => (
                  <circle key={s.id} cx="60" cy="60" r="54" fill="none" strokeWidth="11"
                    stroke={s.color} strokeDasharray={s.dash} strokeDashoffset={s.off}
                    transform="rotate(-90 60 60)" />
                ))}
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              }}>
                <div className="muted" style={{ fontSize: 9, letterSpacing: '.1em' }}>支出合计</div>
                <div className="num" style={{ fontSize: 21, lineHeight: 1.1 }}>{money(spend)}</div>
                <div style={{ fontSize: 9.5, color: 'var(--color-accent-700)' }}>较上月 {delta}</div>
              </div>
            </div>
            <div style={{
              flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5,
            }}>
              {spent.map((r) => (
                <div key={r.category.id} style={{
                  display: 'flex', alignItems: 'center', gap: 7, fontSize: 11,
                }}>
                  <span style={{
                    width: 8, height: 8, flex: 'none', background: cssColor(r.category.color),
                  }} />
                  <span style={{
                    flex: 1, minWidth: 0, whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {r.category.name}
                  </span>
                  <span className="num" style={{ fontSize: 12, opacity: 0.7 }}>
                    {((r.amount / spend) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
            border: '1px solid var(--color-divider)', marginTop: 20,
          }}>
            <div style={{ padding: '10px 12px', borderRight: '1px solid var(--color-divider)' }}>
              <div className="muted" style={{ fontSize: 9.5, letterSpacing: '.1em' }}>支出 / 预算</div>
              <div className="num" style={{ fontSize: 26, lineHeight: 1.1 }}>{money(spend)}</div>
              <div style={{ fontSize: 10, opacity: 0.55 }}>
                预算 {money(budget)} · {spend > budget
                  ? `超支 ${money(spend - budget)}` : `余 ${money(budget - spend)}`}
              </div>
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 9.5, letterSpacing: '.1em', color: 'var(--color-accent)' }}>
                结余 / 收入
              </div>
              <div className="num" style={{
                fontSize: 26, lineHeight: 1.1, color: 'var(--color-accent-700)',
              }}>
                {money(net)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.55 }}>
                收入 {money(income)} · 储蓄率{' '}
                {income > 0 ? `${((net / income) * 100).toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>

          <SectionLabel style={{ marginTop: 20 }}>预算完成</SectionLabel>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 11 }}>
            {rows.filter((r) => r.category.budget > 0).map((r) => {
              const over = r.amount > r.category.budget
              return (
                <div key={r.category.id}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', fontSize: 11.5,
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {r.category.short}
                      {over && (
                        <span className="tag tag-outline" style={{ fontSize: 9, padding: '1px 5px' }}>
                          超
                        </span>
                      )}
                    </span>
                    <span className="num" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                      {money(r.amount)}{' '}
                      <span style={{ opacity: 0.45 }}>/ {money(r.category.budget)}</span>
                    </span>
                  </div>
                  <div className="bar" style={{ height: 7, marginTop: 4 }}>
                    <i style={{
                      width: `${Math.min(r.amount / r.category.budget, 1) * 100}%`,
                      background: cssColor(r.category.color),
                    }} />
                  </div>
                </div>
              )
            })}
          </div>

          <SectionLabel style={{ marginTop: 22 }}>分类明细表</SectionLabel>
          <table className="table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>分类</th>
                <th style={{ textAlign: 'right' }}>金额</th>
                <th style={{ textAlign: 'right' }}>占比</th>
                <th style={{ textAlign: 'right' }}>对预算</th>
              </tr>
            </thead>
            <tbody>
              {spent.map((r) => {
                const b = r.category.budget
                const diff = b > 0
                  ? (r.amount === b ? '持平'
                    : `${r.amount > b ? '+' : '−'}${Math.abs(r.amount - b).toLocaleString('en-US')}`)
                  : '—'
                return (
                  <tr key={r.category.id}>
                    <td style={{ fontSize: 12.5 }}>
                      {r.category.short}
                      <div style={{
                        height: 4, marginTop: 4,
                        background: 'color-mix(in srgb, var(--color-text) 10%, transparent)',
                      }}>
                        <div style={{
                          height: '100%', background: cssColor(r.category.color),
                          width: `${Math.min(r.amount / (b || spend || 1), 1) * 100}%`,
                        }} />
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: 'right', fontSize: 14 }}>
                      {money(r.amount)}
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 11.5, opacity: 0.7 }}>
                      {((r.amount / spend) * 100).toFixed(1)}%
                    </td>
                    <td style={{
                      textAlign: 'right', fontSize: 11.5,
                      color: b > 0 && r.amount > b
                        ? 'var(--color-accent-900)'
                        : 'color-mix(in srgb, var(--color-text) 55%, transparent)',
                    }}>
                      {diff}
                    </td>
                  </tr>
                )
              })}
              <tr>
                <td className="num" style={{ fontSize: 13 }}>合计</td>
                <td className="num" style={{ textAlign: 'right', fontSize: 15 }}>{money(spend)}</td>
                <td style={{ textAlign: 'right', fontSize: 11.5, opacity: 0.7 }}>100%</td>
                <td style={{
                  textAlign: 'right', fontSize: 11.5, color: 'var(--color-accent-700)',
                }}>
                  {budget > 0
                    ? `${spend > budget ? '+' : '−'}${Math.abs(spend - budget).toLocaleString('en-US')}`
                    : '—'}
                </td>
              </tr>
            </tbody>
          </table>

          <SectionLabel style={{ marginTop: 20 }}>本月最大三笔</SectionLabel>
          {topThree.map((e) => (
            <div key={e.id} className="hairline" style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
            }}>
              <span className="num" style={{
                fontSize: 11, width: 34, color: 'var(--color-accent-700)',
              }}>
                {e.occurred_on.slice(5).replace('-', '/')}
              </span>
              <span style={{ flex: 1, fontSize: 12.5 }}>
                {e.note || catById.get(e.category_id ?? '')?.name || '未命名'}
              </span>
              <span className="num" style={{ fontSize: 15 }}>{money(e.amount)}</span>
            </div>
          ))}
        </>
      )}

      <SectionLabel style={{ marginTop: 22 }}>近六月支出</SectionLabel>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 4, height: 78, marginTop: 10,
        borderBottom: '1px solid var(--color-divider)',
      }}>
        {six.map((m, i) => (
          <div key={i} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 4, justifyContent: 'flex-end', height: '100%',
          }}>
            <span style={{ fontSize: 9, opacity: 0.6 }}>{m.value > 0 ? m.label : ''}</span>
            <span style={{
              width: '100%',
              height: `${Math.max((m.value / sixMax) * 58, m.value > 0 ? 2 : 1)}px`,
              background: i === six.length - 1 ? 'var(--color-accent-800)'
                : 'color-mix(in srgb, var(--color-accent) 40%, transparent)',
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 5, paddingBottom: 8 }}>
        {six.map((m, i) => (
          <div key={i} className="num" style={{
            flex: 1, textAlign: 'center', fontSize: 9.5, opacity: 0.6,
          }}>
            {m.month}月
          </div>
        ))}
      </div>
    </div>
  )
}
