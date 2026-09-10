import { useState } from 'react'
import { useData } from '../lib/store'
import { supabase } from '../lib/supabase'
import { COLOR_TOKENS, cssColor, type Category, type Kind } from '../lib/types'
import { hhmm } from '../lib/format'
import { PickerRow, SectionLabel, Sheet } from '../components/ui'

const CURRENCIES = ['JPY ¥', 'CNY ¥', 'USD $', 'EUR €']

export default function SettingsScreen() {
  const {
    session, settings, categories, entries,
    saveSettings, addCategory, updateCategory, deleteCategory,
  } = useData()
  const [budgetDraft, setBudgetDraft] = useState(String(settings?.monthly_budget ?? 0))
  const [editing, setEditing] = useState<Category | 'new' | null>(null)

  const exportCsv = () => {
    const byId = new Map(categories.map((c) => [c.id, c]))
    const head = ['日期', '时间', '类型', '分类', '金额', '备注', '支付方式']
    const rows = entries.map((e) => [
      e.occurred_on,
      hhmm(e.occurred_at),
      e.kind === 'income' ? '收入' : '支出',
      byId.get(e.category_id ?? '')?.name ?? '未分类',
      String(e.amount),
      e.note,
      e.pay_method,
    ])
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const csv = '﻿' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `家计记账-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="screen">
      <div className="kicker">SETTINGS</div>
      <h2 style={{ margin: '6px 0 18px', fontSize: 30 }}>设置</h2>

      <SectionLabel>货币</SectionLabel>
      <PickerRow
        style={{ marginTop: 8 }}
        options={CURRENCIES}
        value={settings?.currency ?? 'JPY ¥'}
        onChange={(v) => void saveSettings({ currency: v })}
      />

      <SectionLabel style={{ marginTop: 20 }}>外观</SectionLabel>
      <PickerRow
        style={{ marginTop: 8 }}
        options={[
          { value: 'paper' as const, label: '纸本蓝图' },
          { value: 'steel' as const, label: '钢青满版' },
        ]}
        value={settings?.theme ?? 'paper'}
        onChange={(v) => void saveSettings({ theme: v })}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
        <div className="field">
          <label htmlFor="budget">每月预算</label>
          <input
            id="budget" className="input" type="number" inputMode="decimal"
            value={budgetDraft}
            onChange={(e) => setBudgetDraft(e.target.value)}
            onBlur={() => void saveSettings({ monthly_budget: Number(budgetDraft || 0) })}
          />
        </div>
        <div className="field">
          <label htmlFor="startday">月度起始日</label>
          <input id="startday" className="input" value="1 日" readOnly />
        </div>
      </div>

      <div style={{
        marginTop: 20, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <SectionLabel>分类管理</SectionLabel>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }}
          onClick={() => setEditing('new')}>＋ 新分类</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {categories.map((c) => (
          <button
            key={c.id} type="button"
            onClick={() => setEditing(c)}
            style={{
              border: '1px solid var(--color-divider)', padding: '5px 9px', fontSize: 11.5,
              display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer',
              background: 'transparent', color: 'var(--color-text)', font: 'inherit',
            }}
          >
            <span className="num" style={{ color: cssColor(c.color) }}>{c.glyph}</span>
            {c.short}
            {c.kind === 'income' && <span className="muted" style={{ fontSize: 9 }}>收</span>}
          </button>
        ))}
      </div>

      <SectionLabel style={{ marginTop: 22 }}>数据</SectionLabel>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" className="btn btn-secondary" style={{ flex: 1, height: 38 }}
          onClick={exportCsv}>导出 CSV（{entries.length} 笔）</button>
      </div>

      <SectionLabel style={{ marginTop: 22 }}>账号</SectionLabel>
      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>{session?.user.email}</div>
      <button type="button" className="btn btn-secondary"
        style={{ width: '100%', height: 38, marginTop: 10 }}
        onClick={() => void supabase.auth.signOut()}>退出登录</button>

      <div style={{ padding: '18px 0 12px', fontSize: 10.5, opacity: 0.45 }}>
        家计 v1.0 · 自用版 · 数据存放在你自己的 Supabase 项目
      </div>

      {editing && (
        <CategorySheet
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            if (editing === 'new') await addCategory(v)
            else await updateCategory(editing.id, v)
            setEditing(null)
          }}
          onDelete={editing === 'new' ? undefined : async () => {
            if (!window.confirm('删除这个分类？已有记录会变成「未分类」。')) return
            await deleteCategory(editing.id)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function CategorySheet({ category, onClose, onSave, onDelete }: {
  category: Category | null
  onClose: () => void
  onSave: (v: {
    name: string; short: string; glyph: string; kind: Kind; budget: number; color: string
  }) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [short, setShort] = useState(category?.short ?? '')
  const [glyph, setGlyph] = useState(category?.glyph ?? '他')
  const [kind, setKind] = useState<Kind>(category?.kind ?? 'expense')
  const [budget, setBudget] = useState(String(category?.budget ?? 0))
  const [color, setColor] = useState(category?.color ?? 'accent-600')
  const [busy, setBusy] = useState(false)

  const actions = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" className="btn btn-secondary" style={{ flex: 1, height: 38 }}
        onClick={onClose}>取消</button>
      {onDelete && (
        <button type="button" className="btn btn-secondary" style={{ flex: 1, height: 38 }}
          disabled={busy}
          onClick={async () => { setBusy(true); await onDelete(); setBusy(false) }}>删除</button>
      )}
      <button type="button" className="btn btn-primary" style={{ flex: 1, height: 38 }}
        disabled={busy || !(name.trim() || short.trim())}
        onClick={async () => {
          setBusy(true)
          try {
            await onSave({
              name: name.trim() || short.trim(),
              short: short.trim() || name.trim(),
              glyph: glyph.trim() || '他',
              kind,
              budget: Number(budget || 0),
              color,
            })
          } finally { setBusy(false) }
        }}>保存</button>
    </div>
  )

  return (
    <Sheet onClose={onClose} footer={actions}>
      <div className="kicker">{category ? 'EDIT CATEGORY' : 'NEW CATEGORY'}</div>

      <PickerRow
        style={{ marginTop: 12 }}
        options={[
          { value: 'expense' as Kind, label: '支出' },
          { value: 'income' as Kind, label: '收入' },
        ]}
        value={kind} onChange={setKind}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 1fr', gap: 10, marginTop: 12 }}>
        <div className="field">
          <label htmlFor="c-glyph">字符</label>
          <input id="c-glyph" className="input" maxLength={2} value={glyph}
            onChange={(e) => setGlyph(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="c-short">简称</label>
          <input id="c-short" className="input" value={short}
            onChange={(e) => setShort(e.target.value)} placeholder="餐饮" />
        </div>
        <div className="field">
          <label htmlFor="c-budget">月预算</label>
          <input id="c-budget" className="input" type="number" inputMode="decimal"
            value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label htmlFor="c-name">全称</label>
        <input id="c-name" className="input" value={name}
          onChange={(e) => setName(e.target.value)} placeholder="餐饮" />
      </div>

      <div className="field" style={{ marginTop: 10 }}>
        <label>颜色</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {COLOR_TOKENS.map((t) => (
            <button key={t} type="button" onClick={() => setColor(t)}
              aria-label={t}
              style={{
                width: 26, height: 26, cursor: 'pointer', background: cssColor(t),
                border: color === t
                  ? '2px solid var(--color-text)'
                  : '1px solid var(--color-divider)',
              }} />
          ))}
        </div>
      </div>

    </Sheet>
  )
}
