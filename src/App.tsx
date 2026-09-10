import { useEffect, useState } from 'react'
import { useData } from './lib/store'
import { todayISO, parseISODate } from './lib/format'
import type { Entry } from './lib/types'
import LoginScreen from './screens/LoginScreen'
import DayScreen from './screens/DayScreen'
import EntryScreen from './screens/EntryScreen'
import MonthScreen from './screens/MonthScreen'
import YearScreen from './screens/YearScreen'
import TotalScreen from './screens/TotalScreen'
import SettingsScreen from './screens/SettingsScreen'
import TabBar, { type TabKey } from './components/TabBar'

export default function App() {
  const { session, authReady, loading, error, clearError, settings } = useData()
  const [tab, setTab] = useState<TabKey>('day')
  const [editing, setEditing] = useState<Entry | 'new' | null>(null)
  const [date, setDate] = useState(todayISO())
  const [month, setMonth] = useState(() => {
    const d = parseISODate(todayISO())
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })
  const [year, setYear] = useState(() => new Date().getFullYear())

  useEffect(() => {
    document.documentElement.dataset.theme = settings?.theme ?? 'paper'
    document.querySelector('meta[name=theme-color]')
      ?.setAttribute('content', settings?.theme === 'steel' ? '#1d2d3d' : '#f2f2f3')
  }, [settings?.theme])

  if (!authReady) {
    return (
      <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spin" />
      </div>
    )
  }

  if (!session) {
    return <div className="app"><div className="app-scroll"><LoginScreen /></div></div>
  }

  if (loading && !settings) {
    return (
      <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spin" />
      </div>
    )
  }

  // 记账页是全屏的，不显示标签栏
  if (editing) {
    return (
      <div className="app">
        <EntryScreen
          entry={editing === 'new' ? null : editing}
          date={date}
          onClose={() => setEditing(null)}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="app-scroll">
        {error && (
          <button
            type="button"
            onClick={clearError}
            style={{
              display: 'block', width: '100%', textAlign: 'left', border: 0,
              padding: '8px 16px', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
              color: 'var(--color-text)',
              background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
            }}
          >
            ⚠ {error}（点此关闭）
          </button>
        )}
        {tab === 'day' && (
          <DayScreen
            date={date}
            setDate={setDate}
            onAdd={() => setEditing('new')}
            onEdit={(e) => setEditing(e)}
          />
        )}
        {tab === 'month' && <MonthScreen cursor={month} setCursor={setMonth} />}
        {tab === 'year' && <YearScreen year={year} setYear={setYear} />}
        {tab === 'all' && <TotalScreen />}
        {tab === 'set' && <SettingsScreen />}
      </div>

      {tab === 'day' && (
        <div style={{ padding: '10px 16px 0', borderTop: '1px solid var(--color-divider)' }}>
          <button
            type="button"
            className="btn btn-primary blueprint"
            style={{ width: '100%', height: 42, fontSize: 16, letterSpacing: '.1em' }}
            onClick={() => setEditing('new')}
          >
            <i className="corner tl" /><i className="corner tr" />
            <i className="corner bl" /><i className="corner br" />
            ＋ 记一笔
          </button>
        </div>
      )}

      <TabBar value={tab} onChange={setTab} />
    </div>
  )
}
