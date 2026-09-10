import { useMemo, useState } from 'react'
import { useData } from '../lib/store'
import type { Account } from '../lib/types'
import { addMonths, pad2, parseISODate, todayISO } from '../lib/format'
import { sums } from '../lib/stats'
import { Blueprint, SectionLabel } from '../components/ui'

export default function TotalScreen() {
  const { entries, accounts, money, addAccount, updateAccount, deleteAccount } = useData()
  const [editing, setEditing] = useState<Account | 'new' | null>(null)

  const all = useMemo(() => sums(entries), [entries])

  const first = entries.length > 0 ? entries[entries.length - 1].occurred_on : todayISO()
  const days = Math.max(1, Math.round(
    (parseISODate(todayISO()).getTime() - parseISODate(first).getTime()) / 86400000) + 1)

  // 近 12 个月的累计结余曲线
  const curve = useMemo(() => {
    const now = new Date()
    const keys: string[] = []
    for (let i = 11; i >= 0; i--) {
      const m = addMonths(now.getFullYear(), now.getMonth() + 1, -i)
      keys.push(`${m.year}-${pad2(m.month)}`)
    }
    const startKey = keys[0]
    let base = 0
    const perMonth = new Map<string, number>()
    for (const e of entries) {
      const key = e.occurred_on.slice(0, 7)
      const signed = e.kind === 'income' ? e.amount : -e.amount
      if (key < startKey) base += signed
      else perMonth.set(key, (perMonth.get(key) ?? 0) + signed)
    }
    let acc = base
    const series = keys.map((k) => {
      acc += perMonth.get(k) ?? 0
      return { key: k, value: acc }
    })
    return series
  }, [entries])

  const points = useMemo(() => {
    const vals = curve.map((c) => c.value)
    const lo = Math.min(...vals, 0)
    const hi = Math.max(...vals, 1)
    const span = hi - lo || 1
    return curve.map((c, i) =>
      `${((i * 320) / (curve.length - 1 || 1)).toFixed(0)},${(78 - ((c.value - lo) / span) * 72).toFixed(1)}`)
  }, [curve])

  const monthsWithData = new Set(entries.map((e) => e.occurred_on.slice(0, 7))).size || 1
  const stats = [
    { k: '月均支出', v: money(all.spend / monthsWithData) },
    { k: '日均支出', v: money(all.spend / days) },
    { k: '储蓄率', v: all.income > 0 ? `${((all.net / all.income) * 100).toFixed(1)}%` : '—' },
    { k: '记账笔数', v: entries.length.toLocaleString('en-US') },
  ]

  const assets = accounts.reduce((a, x) => a + x.balance, 0)

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="kicker">TOTALS</div>
        <div className="muted" style={{ fontSize: 10 }}>自 {first} · {days} 天</div>
      </div>
      <h2 className="screen-title">总计</h2>

      <Blueprint style={{ marginTop: 16, padding: 14 }}>
        <div style={{ fontSize: 9.5, letterSpacing: '.12em', color: 'var(--color-accent)' }}>
          净结余
        </div>
        <div className="num" style={{ fontSize: 40, lineHeight: 1.05 }}>{money(all.net)}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11, opacity: 0.65 }}>
          <span>累计支出 {money(all.spend)}</span>
          <span>累计收入 {money(all.income)}</span>
        </div>
        <svg viewBox="0 0 320 80" preserveAspectRatio="none"
          style={{ width: '100%', height: 80, marginTop: 12, display: 'block' }}>
          <polyline points={points.join(' ')} fill="none"
            stroke="var(--color-accent)" strokeWidth="1.5" />
          <polyline points={`${points.join(' ')} 320,80 0,80`}
            fill="color-mix(in srgb, var(--color-accent) 14%, transparent)" stroke="none" />
        </svg>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 9.5, opacity: 0.5, marginTop: 2,
        }}>
          <span>{curve[0]?.key}</span>
          <span>{curve[curve.length - 1]?.key}</span>
        </div>
      </Blueprint>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, marginTop: 16,
        border: '1px solid var(--color-divider)',
      }}>
        {stats.map((s) => (
          <div key={s.k} style={{
            padding: '11px 12px',
            borderBottom: '1px solid var(--color-divider)',
            borderRight: '1px solid var(--color-divider)',
          }}>
            <div style={{ fontSize: 9.5, letterSpacing: '.1em', opacity: 0.55 }}>{s.k}</div>
            <div className="num" style={{ fontSize: 19 }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 20, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <SectionLabel>资产账户</SectionLabel>
        <span className="num" style={{ fontSize: 13 }}>{money(assets)}</span>
      </div>
      {accounts.map((a) => (
        <button key={a.id} type="button" className="entry" style={{ padding: '11px 0' }}
          onClick={() => setEditing(a)}>
          <span className="glyph" style={{ width: 24, height: 24, fontSize: 11 }}>{a.glyph}</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: 12.5 }}>{a.name}</span>
            <span style={{ display: 'block', fontSize: 10, opacity: 0.5 }}>{a.sub}</span>
          </span>
          <span className="num" style={{ fontSize: 15 }}>{money(a.balance)}</span>
        </button>
      ))}
      <button type="button" className="btn btn-secondary"
        style={{ width: '100%', height: 36, marginTop: 12 }}
        onClick={() => setEditing('new')}>
        ＋ 添加账户
      </button>

      <div style={{ padding: '14px 0 10px', fontSize: 10.5, opacity: 0.45 }}>
        家计 v1.0 · 自用版 · 数据存放在你自己的 Supabase 项目
      </div>

      {editing && (
        <AccountSheet
          account={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            if (editing === 'new') await addAccount(v)
            else await updateAccount(editing.id, v)
            setEditing(null)
          }}
          onDelete={editing === 'new' ? undefined : async () => {
            if (!window.confirm('删除这个账户？')) return
            await deleteAccount(editing.id)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function AccountSheet({ account, onClose, onSave, onDelete }: {
  account: Account | null
  onClose: () => void
  onSave: (v: { name: string; sub: string; glyph: string; balance: number }) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [name, setName] = useState(account?.name ?? '')
  const [sub, setSub] = useState(account?.sub ?? '')
  const [glyph, setGlyph] = useState(account?.glyph ?? '現')
  const [balance, setBalance] = useState(String(account?.balance ?? 0))
  const [busy, setBusy] = useState(false)

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="kicker">{account ? 'EDIT ACCOUNT' : 'NEW ACCOUNT'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 10, marginTop: 12 }}>
          <div className="field">
            <label htmlFor="a-glyph">字符</label>
            <input id="a-glyph" className="input" maxLength={2} value={glyph}
              onChange={(e) => setGlyph(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="a-name">名称</label>
            <input id="a-name" className="input" value={name}
              onChange={(e) => setName(e.target.value)} placeholder="银行口座" />
          </div>
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="a-sub">备注</label>
          <input id="a-sub" className="input" value={sub}
            onChange={(e) => setSub(e.target.value)} placeholder="给与振込 · 自动引落" />
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="a-bal">余额</label>
          <input id="a-bal" className="input" type="number" inputMode="decimal" value={balance}
            onChange={(e) => setBalance(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1, height: 38 }}
            onClick={onClose}>取消</button>
          {onDelete && (
            <button type="button" className="btn btn-secondary" style={{ flex: 1, height: 38 }}
              disabled={busy} onClick={async () => { setBusy(true); await onDelete(); setBusy(false) }}>
              删除
            </button>
          )}
          <button type="button" className="btn btn-primary" style={{ flex: 1, height: 38 }}
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true)
              try {
                await onSave({
                  name: name.trim(), sub: sub.trim(),
                  glyph: glyph.trim() || '現', balance: Number(balance || 0),
                })
              } finally { setBusy(false) }
            }}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
