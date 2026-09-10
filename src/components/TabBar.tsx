export type TabKey = 'day' | 'month' | 'year' | 'all' | 'set'

const TABS: { key: TabKey; glyph: string; label: string }[] = [
  { key: 'day', glyph: '日', label: '每日' },
  { key: 'month', glyph: '月', label: '月度' },
  { key: 'year', glyph: '年', label: '年度' },
  { key: 'all', glyph: '总', label: '总计' },
  { key: 'set', glyph: '设', label: '设置' },
]

export default function TabBar({ value, onChange }: {
  value: TabKey
  onChange: (v: TabKey) => void
}) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`tab${value === t.key ? ' on' : ''}`}
          onClick={() => onChange(t.key)}
          aria-current={value === t.key ? 'page' : undefined}
        >
          <span className="tab-glyph">{t.glyph}</span>
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
