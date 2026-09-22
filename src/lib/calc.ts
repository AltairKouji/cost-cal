/** 记账用的小算式：只支持 + 与 −，从左到右顺次计算，不涉及优先级。
 *  表达式内部一律存原始数字串，如 "1200+300-50"。 */

const OPS = /[+\-]/

/** 正在输入的那一段数字（最后一个运算符之后的部分）。 */
export const currentOperand = (expr: string) => expr.split(OPS).pop() ?? ''

export const endsWithOperator = (expr: string) => /[+\-]$/.test(expr)

/** 算出结果；表达式非法时返回 null。结尾挂着运算符视为未输入完，忽略它。 */
export function evaluate(expr: string, decimals: number): number | null {
  const cleaned = expr.replace(/[+\-]$/, '')
  if (cleaned === '') return 0
  if (!/^\d+(\.\d*)?([+\-]\d+(\.\d*)?)*$/.test(cleaned)) return null

  const parts = cleaned.split(/([+\-])/)
  let total = Number(parts[0] || '0')
  if (Number.isNaN(total)) return null
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i + 1] || '0')
    if (Number.isNaN(n)) return null
    total = parts[i] === '+' ? total + n : total - n
  }
  // 0.1 + 0.2 这类浮点误差在这里收掉
  const f = 10 ** decimals
  return Math.round(total * f) / f
}

/** 给算式里的每段数字加千位分隔，保留正在输入的小数点。 */
export function formatExpr(expr: string): string {
  if (expr === '') return '0'
  return expr.replace(/\d*\.?\d*/g, (chunk) => {
    if (chunk === '') return ''
    const [int, dec] = chunk.split('.')
    const head = int === '' ? '' : Number(int).toLocaleString('en-US')
    return chunk.includes('.') ? `${head}.${dec ?? ''}` : head
  })
}

/** 按键处理。返回新的表达式；不合法的按键原样返回。 */
export function applyKey(expr: string, key: string, decimals: number): string {
  if (key === '⌫') return expr.slice(0, -1)

  if (key === '+' || key === '−') {
    const op = key === '−' ? '-' : '+'
    if (expr === '') return expr                      // 金额不为负，不允许以运算符开头
    if (endsWithOperator(expr)) return expr.slice(0, -1) + op
    return expr + op
  }

  const operand = currentOperand(expr)

  if (key === '.') {
    if (decimals === 0 || operand.includes('.')) return expr
    return operand === '' ? `${expr}0.` : `${expr}.`
  }

  // 数字键（含 00 / 000）
  if (operand === '0' && !key.startsWith('0')) return expr.slice(0, -1) + key
  if (operand === '' && key.startsWith('0')) return expr          // 不以 0 开头
  if (operand === '0' && key.startsWith('0')) return expr         // 不出现 00…

  const digits = operand.replace('.', '').length
  if (digits + key.length > 10) return expr

  const dot = operand.indexOf('.')
  if (dot >= 0 && operand.length - dot - 1 + key.length > decimals) return expr

  return expr + key
}
