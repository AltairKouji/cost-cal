import { useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'

/** 蓝图框：四角十字标记 + 发丝边框，设计系统里的 .blueprint。 */
export function Blueprint({ children, style, className = '' }: {
  children: ReactNode
  style?: CSSProperties
  className?: string
}) {
  return (
    <div className={`blueprint ${className}`} style={style}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      {children}
    </div>
  )
}

/** 细进度条。value 为 0–1 之间的比例。 */
export function Bar({ value, color, height = 8 }: {
  value: number
  color: string
  height?: number
}) {
  return (
    <div className="bar" style={{ height }}>
      <i style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%`, background: color }} />
    </div>
  )
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="section-label" style={style}>{children}</div>
}

export function PickerRow<T extends string>({ options, value, onChange, style }: {
  options: readonly T[] | { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  style?: CSSProperties
}) {
  const items = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o) as { value: T; label: string }[]
  return (
    <div className="picker-row" style={style}>
      {items.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`picker${o.value === value ? ' on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 12.5 }} className="muted">
      {children}
    </div>
  )
}

/** 底部弹出面板。
 *
 *  手机上 `position:fixed; inset:0` 铺的是布局视口，而浏览器底部工具栏和弹出的
 *  软键盘只会缩小*视觉*视口——面板底部那排按钮就被盖住了。这里跟着
 *  visualViewport 走，键盘一弹出面板立刻缩到剩余空间里；再配合内部滚动，
 *  内容再长也够得着。 */
export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const sync = () => {
      root.style.setProperty('--vv-height', `${vv.height}px`)
      root.style.setProperty('--vv-offset', `${vv.offsetTop}px`)
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      root.style.removeProperty('--vv-height')
      root.style.removeProperty('--vv-offset')
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}
