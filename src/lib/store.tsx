import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Account, Category, Entry, Settings } from './types'
import { makeMoney } from './format'

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'user_id'>[] = [
  { name: '居住（房租/房贷）', short: '居住', glyph: '居', kind: 'expense', budget: 98000, color: 'accent-800', sort: 1 },
  { name: '餐饮', short: '餐饮', glyph: '食', kind: 'expense', budget: 60000, color: 'accent-700', sort: 2 },
  { name: '生活用品', short: '日用', glyph: '品', kind: 'expense', budget: 35000, color: 'accent-600', sort: 3 },
  { name: '水电燃气通讯', short: '水电', glyph: '公', kind: 'expense', budget: 25000, color: 'accent-500', sort: 4 },
  { name: '交通', short: '交通', glyph: '交', kind: 'expense', budget: 20000, color: 'accent-400', sort: 5 },
  { name: '娱乐订阅', short: '娱乐', glyph: '娱', kind: 'expense', budget: 12000, color: 'accent-300', sort: 6 },
  { name: '医疗', short: '医疗', glyph: '医', kind: 'expense', budget: 15000, color: 'neutral-400', sort: 7 },
  { name: '其他', short: '其他', glyph: '他', kind: 'expense', budget: 0, color: 'neutral-300', sort: 8 },
  { name: '工资', short: '工资', glyph: '给', kind: 'income', budget: 0, color: 'accent-700', sort: 9 },
  { name: '其他收入', short: '其他', glyph: '入', kind: 'income', budget: 0, color: 'accent-500', sort: 10 },
]

type Store = {
  session: Session | null
  authReady: boolean
  loading: boolean
  error: string | null
  settings: Settings | null
  categories: Category[]
  entries: Entry[]
  accounts: Account[]
  money: (n: number) => string
  clearError: () => void
  reload: () => Promise<void>
  saveSettings: (patch: Partial<Settings>) => Promise<void>
  addEntry: (e: Omit<Entry, 'id' | 'user_id'>) => Promise<void>
  updateEntry: (id: string, patch: Partial<Entry>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  addCategory: (c: Omit<Category, 'id' | 'user_id' | 'sort'>) => Promise<void>
  updateCategory: (id: string, patch: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  addAccount: (a: Omit<Account, 'id' | 'user_id' | 'sort'>) => Promise<void>
  updateAccount: (id: string, patch: Partial<Account>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
}

const Ctx = createContext<Store | null>(null)

const num = (v: unknown) => Number(v ?? 0)

export function DataProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const loadedFor = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setAuthReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null

  const load = useCallback(async (uid: string) => {
    setLoading(true)
    setError(null)
    try {
      const [s, c, e, a] = await Promise.all([
        supabase.from('settings').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('categories').select('*').eq('user_id', uid).order('sort'),
        supabase.from('entries').select('*').eq('user_id', uid)
          .order('occurred_on', { ascending: false })
          .order('occurred_at', { ascending: false })
          .limit(20000),
        supabase.from('accounts').select('*').eq('user_id', uid).order('sort'),
      ])
      const first = [s, c, e, a].find((r) => r.error)
      if (first?.error) throw first.error

      let nextSettings = s.data as Settings | null
      let nextCategories = (c.data ?? []) as Category[]

      // 触发器只在注册时跑一次；老账号或手动建的账号在这里兜底初始化。
      if (!nextSettings) {
        const { data, error: err } = await supabase
          .from('settings').insert({ user_id: uid }).select().single()
        if (err) throw err
        nextSettings = data as Settings
      }
      if (nextCategories.length === 0) {
        const { data, error: err } = await supabase
          .from('categories')
          .insert(DEFAULT_CATEGORIES.map((d) => ({ ...d, user_id: uid })))
          .select()
        if (err) throw err
        nextCategories = (data ?? []) as Category[]
      }

      setSettings({ ...nextSettings, monthly_budget: num(nextSettings.monthly_budget) })
      setCategories(nextCategories.map((x) => ({ ...x, budget: num(x.budget) })))
      setEntries(((e.data ?? []) as Entry[]).map((x) => ({ ...x, amount: num(x.amount) })))
      setAccounts(((a.data ?? []) as Account[]).map((x) => ({ ...x, balance: num(x.balance) })))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      loadedFor.current = null
      setSettings(null); setCategories([]); setEntries([]); setAccounts([])
      return
    }
    if (loadedFor.current === userId) return
    loadedFor.current = userId
    void load(userId)
  }, [userId, load])

  const reload = useCallback(async () => {
    if (userId) await load(userId)
  }, [userId, load])

  const guard = async <T,>(fn: (uid: string) => Promise<T>) => {
    if (!userId) throw new Error('未登录')
    try {
      return await fn(userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  const sortEntries = (list: Entry[]) =>
    [...list].sort((x, y) =>
      x.occurred_on === y.occurred_on
        ? y.occurred_at.localeCompare(x.occurred_at)
        : y.occurred_on.localeCompare(x.occurred_on))

  const api: Store = {
    session, authReady, loading, error, settings, categories, entries, accounts,
    clearError: () => setError(null),
    money: useMemo(() => makeMoney(settings?.currency ?? 'JPY ¥'), [settings?.currency]),
    reload,

    saveSettings: (patch) => guard(async (uid) => {
      const { data, error: err } = await supabase
        .from('settings')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('user_id', uid).select().single()
      if (err) throw err
      setSettings({ ...(data as Settings), monthly_budget: num((data as Settings).monthly_budget) })
    }),

    addEntry: (entry) => guard(async (uid) => {
      const { data, error: err } = await supabase
        .from('entries').insert({ ...entry, user_id: uid }).select().single()
      if (err) throw err
      setEntries((prev) => sortEntries([{ ...(data as Entry), amount: num((data as Entry).amount) }, ...prev]))
    }),

    updateEntry: (id, patch) => guard(async () => {
      const { data, error: err } = await supabase
        .from('entries').update(patch).eq('id', id).select().single()
      if (err) throw err
      setEntries((prev) => sortEntries(prev.map((x) =>
        x.id === id ? { ...(data as Entry), amount: num((data as Entry).amount) } : x)))
    }),

    deleteEntry: (id) => guard(async () => {
      const { error: err } = await supabase.from('entries').delete().eq('id', id)
      if (err) throw err
      setEntries((prev) => prev.filter((x) => x.id !== id))
    }),

    addCategory: (cat) => guard(async (uid) => {
      const sort = Math.max(0, ...categories.map((c) => c.sort)) + 1
      const { data, error: err } = await supabase
        .from('categories').insert({ ...cat, sort, user_id: uid }).select().single()
      if (err) throw err
      setCategories((prev) => [...prev, { ...(data as Category), budget: num((data as Category).budget) }]
        .sort((x, y) => x.sort - y.sort))
    }),

    updateCategory: (id, patch) => guard(async () => {
      const { data, error: err } = await supabase
        .from('categories').update(patch).eq('id', id).select().single()
      if (err) throw err
      setCategories((prev) => prev.map((x) =>
        x.id === id ? { ...(data as Category), budget: num((data as Category).budget) } : x))
    }),

    deleteCategory: (id) => guard(async () => {
      const { error: err } = await supabase.from('categories').delete().eq('id', id)
      if (err) throw err
      setCategories((prev) => prev.filter((x) => x.id !== id))
      setEntries((prev) => prev.map((x) => (x.category_id === id ? { ...x, category_id: null } : x)))
    }),

    addAccount: (acc) => guard(async (uid) => {
      const sort = Math.max(0, ...accounts.map((a) => a.sort)) + 1
      const { data, error: err } = await supabase
        .from('accounts').insert({ ...acc, sort, user_id: uid }).select().single()
      if (err) throw err
      setAccounts((prev) => [...prev, { ...(data as Account), balance: num((data as Account).balance) }]
        .sort((x, y) => x.sort - y.sort))
    }),

    updateAccount: (id, patch) => guard(async () => {
      const { data, error: err } = await supabase
        .from('accounts').update(patch).eq('id', id).select().single()
      if (err) throw err
      setAccounts((prev) => prev.map((x) =>
        x.id === id ? { ...(data as Account), balance: num((data as Account).balance) } : x))
    }),

    deleteAccount: (id) => guard(async () => {
      const { error: err } = await supabase.from('accounts').delete().eq('id', id)
      if (err) throw err
      setAccounts((prev) => prev.filter((x) => x.id !== id))
    }),
  }

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useData() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useData 必须在 DataProvider 内使用')
  return ctx
}
