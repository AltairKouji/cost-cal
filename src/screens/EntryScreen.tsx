import { useMemo, useState } from 'react'
import { useData } from '../lib/store'
import { PAY_METHODS, cssColor, type Entry, type Kind } from '../lib/types'
import { hhmm, nowTime } from '../lib/format'
import { Blueprint, PickerRow } from '../components/ui'

export default function EntryScreen({ entry, date, onClose }: {
  entry: Entry | null
  date: string
  onClose: () => void
}) {
  const { categories, settings, money, addEntry, updateEntry, deleteEntry } = useData()
  const decimals = (settings?.currency ?? 'JPY ¥') !== 'JPY ¥'

  const [kind, setKind] = useState<Kind>(entry?.kind ?? 'expense')
  const [amount, setAmount] = useState(() => {
    if (!entry) return ''
    return decimals ? String(entry.amount) : String(Math.round(entry.amount))
  })
  const [note, setNote] = useState(entry?.note ?? '')
  const [pay, setPay] = useState(entry?.pay_method ?? PAY_METHODS[0])
  const [on, setOn] = useState(entry?.occurred_on ?? date)
  const [at, setAt] = useState(entry ? hhmm(entry.occurred_at) : nowTime())
  const [busy, setBusy] = useState(false)

  const pool = useMemo(
    () => categories.filter((c) => c.kind === kind), [categories, kind])
  const [catId, setCatId] = useState<string | null>(entry?.category_id ?? null)
  const activeCat = pool.find((c) => c.id === catId) ?? null

  const keys = decimals
    ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
    : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫']

  const tap = (k: string) => {
    if (k === '⌫') return setAmount((a) => a.slice(0, -1))
    if (k === '.') {
      if (amount.includes('.')) return
      return setAmount((a) => (a === '' ? '0.' : a + '.'))
    }
    setAmount((a) => {
      if (a.replace('.', '').length >= 10) return a
      if (a === '' && (k === '0' || k === '00')) return a
      const next = a + k
      const dot = next.indexOf('.')
      if (dot >= 0 && next.length - dot > 3) return a
      return next
    })
  }

  const value = Number(amount || '0')

  const save = async () => {
    if (!value) return
    setBusy(true)
    try {
      const payload = {
        occurred_on: on,
        occurred_at: `${at}:00`,
        kind,
        amount: value,
        category_id: catId,
        note: note.trim(),
        pay_method: pay,
      }
      if (entry) await updateEntry(entry.id, payload)
      else await addEntry(payload)
      onClose()
    } catch {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!entry) return
    if (!window.confirm('删除这笔记录？')) return
    setBusy(true)
    try {
      await deleteEntry(entry.id)
      onClose()
    } catch {
      setBusy(false)
    }
  }

  return (
    <div className="app-scroll">
      <div className="screen" style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-secondary" style={{ height: 28 }} onClick={onClose}>
            ‹ 返回
          </button>
          <div className="kicker">{entry ? 'EDIT ENTRY' : 'NEW ENTRY'}</div>
        </div>

        <PickerRow
          style={{ marginTop: 14 }}
          options={[
            { value: 'expense' as Kind, label: '支出' },
            { value: 'income' as Kind, label: '收入' },
          ]}
          value={kind}
          onChange={(k) => { setKind(k); setCatId(null) }}
        />

        <Blueprint style={{
          marginTop: 18, padding: 14,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 9.5, letterSpacing: '.12em' }}>
              金额 / {settings?.currency ?? 'JPY ¥'}
            </div>
            <div className="num" style={{
              fontSize: 44, lineHeight: 1, letterSpacing: '-.01em',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {amount === '' ? '0' : amount}
            </div>
          </div>
          <div style={{ textAlign: 'right', flex: 'none' }}>
            <div className="muted" style={{ fontSize: 10.5 }}>{activeCat?.name ?? '未选分类'}</div>
            <input
              className="input" type="date" value={on} onChange={(e) => setOn(e.target.value)}
              style={{ display: 'block', marginTop: 4, width: 132, fontSize: 12, minHeight: 30 }}
              aria-label="日期"
            />
            <input
              className="input" type="time" value={at} onChange={(e) => setAt(e.target.value)}
              style={{ display: 'block', marginTop: 4, width: 132, fontSize: 12, minHeight: 30 }}
              aria-label="时间"
            />
          </div>
        </Blueprint>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginTop: 16,
        }}>
          {pool.map((c) => {
            const sel = c.id === catId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCatId(sel ? null : c.id)}
                style={{
                  cursor: 'pointer', border: '1px solid var(--color-divider)',
                  padding: '9px 2px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 3, font: 'inherit',
                  background: sel ? 'var(--color-accent)' : 'transparent',
                  color: sel ? 'var(--color-bg)' : 'var(--color-text)',
                }}
              >
                <span className="num" style={{
                  fontSize: 16, color: sel ? 'var(--color-bg)' : cssColor(c.color),
                }}>
                  {c.glyph}
                </span>
                <span style={{ fontSize: 9, lineHeight: 1.2, textAlign: 'center' }}>{c.short}</span>
              </button>
            )
          })}
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="note">备注</label>
          <input
            id="note" className="input" value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="超市 · 晚饭食材"
          />
        </div>
      </div>

      <div className="keypad" style={{ padding: '14px 16px 0' }}>
        {keys.map((k) => (
          <button key={k} type="button" className="key" onClick={() => tap(k)}>{k}</button>
        ))}
      </div>

      <div style={{ padding: '14px 16px 6px', display: 'flex', gap: 8 }}>
        <button
          type="button" className="btn btn-primary"
          style={{ flex: 1, height: 44, fontSize: 16, letterSpacing: '.06em' }}
          onClick={save} disabled={busy || !value}
        >
          {busy ? '保存中…' : '保存'}
        </button>
        <button
          type="button" className="btn btn-secondary" style={{ width: 70, height: 44 }}
          onClick={() => setAmount('')}
        >
          清空
        </button>
      </div>

      <div style={{ padding: '0 16px 8px' }}>
        <div className="section-label" style={{ marginBottom: 6 }}>支付方式</div>
        <PickerRow options={PAY_METHODS} value={pay} onChange={setPay} />
      </div>

      {entry && (
        <div style={{ padding: '6px 16px 20px' }}>
          <button
            type="button" className="btn btn-secondary"
            style={{ width: '100%', height: 38, color: 'var(--color-accent-800)' }}
            onClick={remove} disabled={busy}
          >
            删除这笔（{money(entry.amount)}）
          </button>
        </div>
      )}
      <div style={{ height: 12 }} />
    </div>
  )
}
