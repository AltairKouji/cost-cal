import { useEffect, useState } from 'react'
import { useData } from './lib/store'
import { supabase } from './lib/supabase'
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
  const { session, authReady, loading, error, clearError, reload, settings } = useData()
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

  // 拉不到数据时不能照常渲染出一个 ¥0 的空账本——那看起来像是数据没了。
  if (error && !settings) {
    return (
      <div className="app">
        <div className="auth">
          <div className="kicker">CONNECTION FAILED</div>
          <h2 style={{ margin: '6px 0 10px', fontSize: 28 }}>没能读到账本</h2>
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.7, margin: 0 }}>
            你的数据仍然在 Supabase 里，这里只是这次没读出来。
          </p>
          <div style={{
            marginTop: 14, padding: 10, fontSize: 11.5, lineHeight: 1.6,
            border: '1px solid var(--color-divider)',
            background: 'color-mix(in srgb, var(--color-text) 4%, transparent)',
            wordBreak: 'break-word',
          }}>
            {error}
          </div>
          <button
            type="button" className="btn btn-primary"
            style={{ width: '100%', height: 42, marginTop: 16 }}
            onClick={() => void reload()}
            disabled={loading}
          >
            {loading ? '重试中…' : '重试'}
          </button>
          <button
            type="button" className="btn btn-secondary"
            style={{ width: '100%', height: 38, marginTop: 8 }}
            onClick={() => void supabase.auth.signOut()}
          >
            退出登录
          </button>
        </div>
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
