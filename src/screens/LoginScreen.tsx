import { useState, type FormEvent } from 'react'
import { supabase, isConfigured } from '../lib/supabase'
import { Blueprint, PickerRow } from '../components/ui'

type Mode = 'signin' | 'signup'

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  if (!isConfigured) {
    return (
      <div className="auth">
        <div className="kicker">SETUP REQUIRED</div>
        <h2 style={{ margin: '6px 0 14px', fontSize: 30 }}>还没连上 Supabase</h2>
        <p style={{ fontSize: 13, lineHeight: 1.7 }}>
          在项目根目录建一个 <code>.env.local</code>，填入 Supabase 项目的地址与
          anon key，然后重启开发服务器：
        </p>
        <Blueprint style={{ padding: 12, marginTop: 8 }}>
          <pre style={{ margin: 0, fontSize: 11.5, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
          </pre>
        </Blueprint>
        <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
          建表脚本见仓库里的 <code>supabase/schema.sql</code>。
        </p>
      </div>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null); setMsg(null)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) setMsg('注册成功，请到邮箱点确认链接后再登录。')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2))
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async () => {
    if (!email) { setErr('请先填写邮箱'); return }
    setBusy(true); setErr(null); setMsg(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) throw error
      setMsg('重置密码的邮件已发送。')
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth" onSubmit={submit}>
      <div className="kicker">KAKEI · PRIVATE LEDGER</div>
      <h2 style={{ margin: '6px 0 2px', fontSize: 34 }}>家计记账</h2>
      <div className="muted" style={{ fontSize: 12, marginBottom: 20 }}>
        自用版 · 数据存放在你自己的 Supabase 项目
      </div>

      <PickerRow
        options={[{ value: 'signin' as Mode, label: '登录' }, { value: 'signup' as Mode, label: '注册' }]}
        value={mode}
        onChange={(v) => { setMode(v); setErr(null); setMsg(null) }}
      />

      <div className="field" style={{ marginTop: 18 }}>
        <label htmlFor="email">邮箱</label>
        <input
          id="email" className="input" type="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
        />
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="password">密码</label>
        <input
          id="password" className="input" type="password" required minLength={6}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位"
        />
      </div>

      {err && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-accent-900)' }}>
          ⚠ {err}
        </div>
      )}
      {msg && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-accent-700)' }}>
          {msg}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', height: 44, marginTop: 18, fontSize: 16, letterSpacing: '.08em' }}
        disabled={busy}
      >
        {busy ? '处理中…' : mode === 'signup' ? '注册并登录' : '登录'}
      </button>

      {mode === 'signin' && (
        <button
          type="button" className="btn btn-ghost"
          style={{ marginTop: 10, alignSelf: 'center', fontSize: 12 }}
          onClick={resetPassword} disabled={busy}
        >
          忘记密码？发送重置邮件
        </button>
      )}
    </form>
  )
}
