/** Supabase 的 PostgrestError / AuthError 都是普通对象，不是 Error 实例，
 *  直接 String() 会得到 "[object Object]"，真正的原因就被吞掉了。 */
export function describeError(err: unknown): string {
  if (err == null) return '未知错误'
  if (typeof err === 'string') return err
  if (err instanceof Error && err.message) return err.message

  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    const text = [e.message, e.error_description, e.details, e.hint]
      .filter((x): x is string => typeof x === 'string' && x.length > 0)
    const tag = typeof e.code === 'string' ? `[${e.code}] `
      : typeof e.status === 'number' ? `[${e.status}] ` : ''
    if (text.length > 0) return tag + [...new Set(text)].join(' · ')
    try { return JSON.stringify(err) } catch { /* 循环引用 */ }
  }
  return String(err)
}

/** 登录态失效：access token 过期、或 PostgREST 拒绝了 JWT。 */
export function isAuthError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { code?: unknown; status?: unknown; message?: unknown }
  if (e.status === 401 || e.code === 'PGRST301' || e.code === 'PGRST302') return true
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : ''
  return msg.includes('jwt') || msg.includes('expired') || msg.includes('refresh token')
}
