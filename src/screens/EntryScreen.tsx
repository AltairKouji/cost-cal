import { Fragment, useMemo, useState } from 'react'
import { useData } from '../lib/store'
import { PAY_METHODS, cssColor, type Entry, type Kind } from '../lib/types'
import { hhmm, nowTime } from '../lib/format'
import { applyKey, evaluate, formatExpr } from '../lib/calc'
import { Blueprint, PickerRow } from '../components/ui'

export default function EntryScreen({ entry, date, onClose }: {
  entry: Entry | null
  date: string
  onClose: () => void
}) {
  const { categories, settings, money, addEntry, updateEntry, deleteEntry } = useData()
  const decimals = (settings?.currency ?? 'JPY ¥') !== 'JPY ¥'

  const fraction = decimals ? 2 : 0
  const [kind, setKind] = useState<Kind>(entry?.kind ?? 'expense')
  const [expr, setExpr] = useState(() => {
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

  // 每行三个数字键 + 右侧一个运算键
  const digitRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    decimals ? ['00', '0', '.'] : ['000', '00', '0'],
  ]
  const opKeys = ['⌫', '+', '−', '=']

  const tap = (k: string) => {
    if (k === '=') {
      const v = evaluate(expr, fraction)
      if (v === null || v < 0) return
      return setExpr(String(v))
    }
    setExpr((e) => applyKey(e, k, fraction))
  }

  const value = evaluate(expr, fraction) ?? 0
  const hasOp = /[+\-]/.test(expr)
  const shown = formatExpr(expr)
  const exprFontSize = shown.length <= 10 ? 44
    : shown.length <= 14 ? 35
    : shown.length <= 19 ? 27
    : shown.length <= 25 ? 20 : 16

  const save = async () => {
    if (value <= 0) return
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

        <Blueprint style={{ marginTop: 18, padding: 14 }}>
          <div className="muted" style={{ fontSize: 9.5, letterSpacing: '.12em' }}>
            金额 / {settings?.currency ?? 'JPY ¥'}
          </div>
          <div className="num" style={{
            fontSize: exprFontSize, lineHeight: 1.05, letterSpacing: '-.01em',
            overflowWrap: 'anywhere',
          }}>
            {shown}
          </div>
          {hasOp && (
            <div className="num" style={{
              fontSize: 15, marginTop: 2,
              color: value < 0 ? 'var(--color-accent-900)' : 'var(--color-accent-700)',
            }}>
              = {money(value)}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <span className="muted" style={{
              flex: 1, minWidth: 0, fontSize: 10.5,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {activeCat?.name ?? '未选分类'}
            </span>
            <input
              className="input" type="date" value={on} onChange={(e) => setOn(e.target.value)}
              style={{ width: 116, fontSize: 12, minHeight: 30 }} aria-label="日期"
            />
            <input
              className="input" type="time" value={at} onChange={(e) => setAt(e.target.value)}
              style={{ width: 106, fontSize: 12, minHeight: 30 }} aria-label="时间"
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
        {digitRows.map((row, i) => (
          <Fragment key={i}>
            {row.map((k) => (
              <button key={k} type="button" className="key" onClick={() => tap(k)}>{k}</button>
            ))}
            <button
              type="button"
              className={`key key-op${opKeys[i] === '=' ? ' key-eq' : ''}`}
              onClick={() => tap(opKeys[i])}
              aria-label={{ '⌫': '退格', '+': '加', '−': '减', '=': '等于' }[opKeys[i]]}
            >
              {opKeys[i]}
            </button>
          </Fragment>
        ))}
      </div>

      <div style={{ padding: '14px 16px 6px', display: 'flex', gap: 8 }}>
        <button
          type="button" className="btn btn-primary"
          style={{ flex: 1, height: 44, fontSize: 16, letterSpacing: '.06em' }}
          onClick={save} disabled={busy || value <= 0}
        >
          {busy ? '保存中…' : '保存'}
        </button>
        <button
          type="button" className="btn btn-secondary" style={{ width: 70, height: 44 }}
          onClick={() => setExpr('')}
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
