/**
 * 零依赖高亮运行时。
 * 该文件会被构建为 IIFE 并通过虚拟模块注入到浏览器/终端代码中，
 * 因此禁止引入任何外部依赖，禁止使用 Node API（探测除外）。
 */
import type {
  CallMeta,
  ColorMode,
  ConsoleMethod,
  HighlightEnv,
  HighlightRuntimeOptions,
  HighlightTokens,
  LabelConfig,
  LabelSegment,
  ModeOption,
  ResolvedLabelStyle,
  TokenKind,
} from '../types'

/** 值高亮片段：一段文本 + 其 token 类别 */
export interface Segment {
  text: string
  kind: TokenKind
}

/** 序列化限制参数 */
export interface SerializeLimits {
  maxDepth: number
  maxEntries: number
  maxStringLength: number
}

/** 带样式的输出块：浏览器映射为 %c，终端映射为 ANSI */
interface StyleRun {
  text: string
  fg: string
  bg: string | null
}

const ANSI_RESET = '\u001B[0m'
const EMPTY_META: CallMeta = { file: '', line: 0, fn: null }

/**
 * 探测当前输出环境。
 */
export function detectEnv(): HighlightEnv {
  // 浏览器主窗口环境
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser'
  }
  // Node / Bun / Deno 终端
  try {
    if (
      typeof process !== 'undefined'
      && process.stdout
      && typeof process.stdout.isTTY === 'boolean'
    ) {
      return process.stdout.isTTY ? 'terminal' : 'plain'
    }
  }
  catch {
    // process 可能被 polyfill 且不完整，按 plain 处理
  }
  return 'plain'
}

/**
 * 解析配色模式：auto 在浏览器跟随系统偏好，终端默认暗色。
 */
export function detectMode(env: HighlightEnv, mode: ModeOption): ColorMode {
  if (mode !== 'auto') {
    return mode
  }
  if (env === 'browser') {
    try {
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    catch {
      return 'light'
    }
  }
  return env === 'terminal' ? 'dark' : 'light'
}

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) {
    h = h[0]! + h[0] + h[1]! + h[1] + h[2]! + h[2]
  }
  if (!/^[0-9a-f]{6}$/i.test(h)) {
    return null
  }
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ]
}

/** 十六进制颜色转 24-bit ANSI 前景色序列 */
export function hexToAnsi(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return ''
  }
  return `\u001B[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`
}

/** 十六进制颜色转 24-bit ANSI 背景色序列 */
export function hexToAnsiBackground(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return ''
  }
  return `\u001B[48;2;${rgb[0]};${rgb[1]};${rgb[2]}m`
}

/** 按背景亮度选择对比前景色 */
export function contrastText(background: string): string {
  const rgb = hexToRgb(background)
  if (!rgb) {
    return '#ffffff'
  }
  const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
  return luminance > 0.6 ? '#1f2328' : '#ffffff'
}

/** 稳定字符串哈希（djb2），用于按文件自动取色 */
export function hashString(text: string): number {
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

const TIME_TOKEN_RE = /YYYY|YY|MM|DD|HH|mm|ss|SSS/g

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0')
}

/**
 * 轻量时间格式化，支持 YYYY YY MM DD HH mm ss SSS。
 */
export function formatTime(date: Date, format: string): string {
  return format.replace(TIME_TOKEN_RE, (token) => {
    switch (token) {
      case 'YYYY':
        return String(date.getFullYear())
      case 'YY':
        return pad(date.getFullYear() % 100, 2)
      case 'MM':
        return pad(date.getMonth() + 1, 2)
      case 'DD':
        return pad(date.getDate(), 2)
      case 'HH':
        return pad(date.getHours(), 2)
      case 'mm':
        return pad(date.getMinutes(), 2)
      case 'ss':
        return pad(date.getSeconds(), 2)
      case 'SSS':
        return pad(date.getMilliseconds(), 3)
      default:
        return token
    }
  })
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null
    || (typeof value !== 'object' && typeof value !== 'function')
  )
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/**
 * 将任意值序列化为带 token 类别的片段列表（语法高亮的核心）。
 */
export function serializeToSegments(value: unknown, limits: SerializeLimits): Segment[] {
  const segments: Segment[] = []
  const seen = new WeakSet<object>()
  const { maxDepth, maxEntries, maxStringLength } = limits

  const push = (text: string, kind: TokenKind) => {
    if (text !== '') {
      segments.push({ text, kind })
    }
  }

  const walk = (current: unknown, depth: number): void => {
    if (typeof current === 'string') {
      push(`"${truncate(current, maxStringLength)}"`, 'string')
      return
    }
    if (typeof current === 'number') {
      push(Object.is(current, -0) ? '-0' : String(current), 'number')
      return
    }
    if (typeof current === 'bigint') {
      push(`${current}n`, 'special')
      return
    }
    if (typeof current === 'boolean') {
      push(String(current), 'boolean')
      return
    }
    if (current === null || current === undefined) {
      push(String(current), 'nullish')
      return
    }
    if (typeof current === 'symbol') {
      push(current.toString(), 'special')
      return
    }
    if (typeof current === 'function') {
      push(`ƒ ${current.name || 'anonymous'}()`, 'callable')
      return
    }

    const objectValue = current as object

    if (objectValue instanceof Date) {
      push(objectValue.toISOString(), 'special')
      return
    }
    if (objectValue instanceof RegExp) {
      push(String(objectValue), 'special')
      return
    }
    if (objectValue instanceof Error) {
      push(`${objectValue.name}: ${objectValue.message}`, 'special')
      return
    }

    if (seen.has(objectValue)) {
      push('[Circular]', 'special')
      return
    }
    if (depth >= maxDepth) {
      push('…', 'punctuation')
      return
    }
    seen.add(objectValue)

    if (Array.isArray(objectValue)) {
      if (objectValue.length === 0) {
        push('[]', 'punctuation')
      }
      else {
        push('[', 'punctuation')
        const count = Math.min(objectValue.length, maxEntries)
        for (let i = 0; i < count; i++) {
          if (i > 0) {
            push(', ', 'punctuation')
          }
          walk(objectValue[i], depth + 1)
        }
        if (objectValue.length > count) {
          push(`, … +${objectValue.length - count}`, 'punctuation')
        }
        push(']', 'punctuation')
      }
      seen.delete(objectValue)
      return
    }

    if (objectValue instanceof Map) {
      push(`Map(${objectValue.size}) `, 'special')
      const entries = [...objectValue.entries()].slice(0, maxEntries)
      push('{', 'punctuation')
      entries.forEach(([k, v], i) => {
        if (i > 0) {
          push(', ', 'punctuation')
        }
        walk(k, depth + 1)
        push(' => ', 'punctuation')
        walk(v, depth + 1)
      })
      push('}', 'punctuation')
      seen.delete(objectValue)
      return
    }

    if (objectValue instanceof Set) {
      push(`Set(${objectValue.size}) `, 'special')
      const values = [...objectValue.values()].slice(0, maxEntries)
      push('{', 'punctuation')
      values.forEach((v, i) => {
        if (i > 0) {
          push(', ', 'punctuation')
        }
        walk(v, depth + 1)
      })
      push('}', 'punctuation')
      seen.delete(objectValue)
      return
    }

    // 浏览器 DOM 节点等宿主对象：给出简洁摘要，避免深度遍历
    if (
      typeof HTMLElement !== 'undefined'
      && objectValue instanceof HTMLElement
    ) {
      const id = objectValue.id ? `#${objectValue.id}` : ''
      const cls = objectValue.className
        ? `.${String(objectValue.className).trim().split(/\s+/).join('.')}`
        : ''
      push(`<${objectValue.tagName.toLowerCase()}${id}${cls}>`, 'special')
      seen.delete(objectValue)
      return
    }

    let keys: string[]
    try {
      keys = Object.keys(objectValue)
    }
    catch {
      push(String(objectValue), 'special')
      seen.delete(objectValue)
      return
    }

    if (keys.length === 0) {
      push('{}', 'punctuation')
    }
    else {
      push('{', 'punctuation')
      const count = Math.min(keys.length, maxEntries)
      for (let i = 0; i < count; i++) {
        if (i > 0) {
          push(', ', 'punctuation')
        }
        const key = keys[i]!
        push(key, 'key')
        push(': ', 'punctuation')
        let fieldValue: unknown
        try {
          fieldValue = (objectValue as Record<string, unknown>)[key]
        }
        catch (error) {
          push(`[Getter threw: ${(error as Error).message}]`, 'special')
          continue
        }
        walk(fieldValue, depth + 1)
      }
      if (keys.length > count) {
        push(`, … +${keys.length - count}`, 'punctuation')
      }
      push('}', 'punctuation')
    }
    seen.delete(objectValue)
  }

  walk(value, 0)
  return segments
}

const TEMPLATE_TOKEN_RE = /\{(icon|file|path|line|fn|time|tag|method)\}/g

interface LabelPiece {
  text: string
  color?: string
  background?: string
}

function basename(file: string): string {
  return file.split('/').pop() || file
}

/** 展开模板字符串为单个片段（{fn} 为空时连同常见粘合符一起省略） */
function expandTemplate(
  template: string,
  meta: CallMeta,
  method: ConsoleMethod,
  icons: HighlightRuntimeOptions['icons'],
  timeFormat: string | false,
): string {
  return template.replace(TEMPLATE_TOKEN_RE, (_match, token: string) => {
    switch (token) {
      case 'icon':
        return icons ? icons[method] ?? '' : ''
      case 'file':
        return meta.file ? basename(meta.file) : ''
      case 'path':
        return meta.file
      case 'line':
        return meta.line ? String(meta.line) : ''
      case 'fn':
        return meta.fn ?? ''
      case 'time':
        return timeFormat ? formatTime(new Date(), timeFormat) : ''
      case 'tag':
        return `[${method.toUpperCase()}]`
      case 'method':
        return method
      default:
        return ''
    }
  })
}

function segmentContent(
  segment: LabelSegment,
  meta: CallMeta,
  method: ConsoleMethod,
  icons: HighlightRuntimeOptions['icons'],
  timeFormat: string | false,
): string | null {
  switch (segment.type) {
    case 'icon':
      return icons === false ? null : (segment.value ?? icons[method] ?? null)
    case 'file':
      return meta.file ? basename(meta.file) : null
    case 'path':
      return meta.file || null
    case 'line':
      return meta.line ? String(meta.line) : null
    case 'function':
      return meta.fn
    case 'time':
      return timeFormat ? formatTime(new Date(), timeFormat) : null
    case 'tag':
      return segment.value ?? `[${method.toUpperCase()}]`
    case 'method':
      return segment.value ?? method
    case 'text':
      return segment.value ?? ''
    default:
      return null
  }
}

function expandLabel(
  config: LabelConfig,
  meta: CallMeta,
  method: ConsoleMethod,
  icons: HighlightRuntimeOptions['icons'],
  timeFormat: string | false,
): LabelPiece[] {
  if (config === false) {
    return []
  }
  if (typeof config === 'string') {
    const text = expandTemplate(config, meta, method, icons, timeFormat)
    return text === '' ? [] : [{ text }]
  }
  const pieces: LabelPiece[] = []
  for (const segment of config) {
    const content = segmentContent(segment, meta, method, icons, timeFormat)
    if (content === null || content === '') {
      continue
    }
    pieces.push({
      text: (segment.glue ?? '') + content,
      color: segment.color,
      background: segment.background,
    })
  }
  return pieces
}

/**
 * 高亮器：把一次 console 调用转换成适配当前环境的参数列表。
 */
export interface Highlighter {
  (method: ConsoleMethod, meta: CallMeta | undefined, ...args: unknown[]): unknown[]
  /** 当前探测/强制的环境（惰性求值后缓存） */
  readonly env: HighlightEnv
  /** 当前生效的配色模式 */
  readonly mode: ColorMode
  /** 将任意值渲染为纯字符串（终端/降级环境用） */
  stringify: (value: unknown) => string
}

export function createHighlight(options: HighlightRuntimeOptions): Highlighter {
  let cachedEnv: HighlightEnv | null = null
  let cachedMode: ColorMode | null = null

  const env = (): HighlightEnv => {
    if (cachedEnv === null) {
      cachedEnv = options.env === 'auto' ? detectEnv() : options.env
    }
    return cachedEnv
  }
  const mode = (): ColorMode => {
    if (cachedMode === null) {
      cachedMode = detectMode(env(), options.mode)
    }
    return cachedMode
  }
  const tokens = (): HighlightTokens => options.tokens[mode()]
  const limits = (): SerializeLimits => ({
    maxDepth: options.maxDepth,
    maxEntries: options.maxEntries,
    maxStringLength: options.maxStringLength,
  })

  const baseColor = (label: ResolvedLabelStyle, meta: CallMeta): string => {
    if (label.color !== 'auto') {
      return label.color
    }
    const palette = label.palette[mode()]
    if (palette.length === 0) {
      return tokens().prefix
    }
    return palette[hashString(meta.file) % palette.length]!
  }

  const buildLabelRuns = (
    config: LabelConfig,
    meta: CallMeta,
    method: ConsoleMethod,
  ): StyleRun[] => {
    const pieces = expandLabel(config, meta, method, options.icons, options.timeFormat)
    if (pieces.length === 0) {
      return []
    }
    const label = options.label
    const base = baseColor(label, meta)
    const runs: StyleRun[] = []
    for (const piece of pieces) {
      const bg = piece.background ?? (label.mode === 'chip' ? base : null)
      const fg = piece.color
        ?? (bg
          ? (label.textColor === 'auto' ? contrastText(bg) : label.textColor)
          : base)
      const last = runs[runs.length - 1]
      if (last && last.fg === fg && last.bg === bg) {
        last.text += piece.text
      }
      else {
        runs.push({ text: piece.text, fg, bg })
      }
    }
    return runs
  }

  const ansiRun = (run: StyleRun): string => {
    const bg = run.bg ? hexToAnsiBackground(run.bg) : ''
    const fg = hexToAnsi(run.fg)
    if (!bg && !fg) {
      return run.text
    }
    return `${bg}${fg}${run.text}${ANSI_RESET}`
  }

  const plainRun = (run: StyleRun): string => run.text

  const browserStyle = (run: StyleRun): string =>
    run.bg
      ? `background:${run.bg};color:${run.fg};${options.label.css}`
      : `color:${run.fg};`

  const highlighter = ((
    method: ConsoleMethod,
    meta: CallMeta | undefined,
    ...args: unknown[]
  ): unknown[] => {
    const callMeta = meta ?? EMPTY_META
    const prefixConfig = callMeta.prefix ?? options.prefix
    const suffixConfig = callMeta.suffix ?? options.suffix
    const prefixRuns = buildLabelRuns(prefixConfig, callMeta, method)
    const suffixRuns = buildLabelRuns(suffixConfig, callMeta, method)
    const currentEnv = env()

    if (!options.highlightValues) {
      // 未开启值高亮：仅输出标签，参数原样透传
      if (currentEnv === 'browser') {
        const format = prefixRuns.map(() => '%c').join('')
        const styles = prefixRuns.map(browserStyle)
        const extra = [...args]
        if (suffixRuns.length > 0) {
          extra.push(suffixRuns.map(run => run.text).join(''))
        }
        return [format, ...styles, ...extra]
      }
      const prefixText = prefixRuns.map(currentEnv === 'terminal' ? ansiRun : plainRun).join('')
      const suffixText = suffixRuns.map(currentEnv === 'terminal' ? ansiRun : plainRun).join('')
      const out: unknown[] = []
      if (prefixText) {
        out.push(prefixText)
      }
      out.push(...args)
      if (suffixText) {
        out.push(suffixText)
      }
      return out
    }

    if (currentEnv === 'browser') {
      // 浏览器：%c 样式块 + 原始值用 %o 占位以保留 devtools 可展开性
      const parts: { token: string, substitution?: unknown }[] = []
      const pushRuns = (runs: StyleRun[]) => {
        for (const run of runs) {
          parts.push({ token: `%c${run.text}`, substitution: browserStyle(run) })
        }
      }
      pushRuns(prefixRuns)
      args.forEach((arg, index) => {
        if (index > 0 || prefixRuns.length > 0) {
          parts.push({ token: ' ' })
        }
        if (isPrimitive(arg)) {
          const segments = serializeToSegments(arg, limits())
          const currentTokens = tokens()
          for (const segment of segments) {
            const fg = currentTokens[segment.kind]
            const last = parts[parts.length - 1]
            if (last && last.substitution === `color: ${fg};` && !last.token.startsWith('%o')) {
              last.token += segment.text
            }
            else {
              parts.push({ token: `%c${segment.text}`, substitution: `color: ${fg};` })
            }
          }
        }
        else {
          parts.push({ token: '%o', substitution: arg })
        }
      })
      if (suffixRuns.length > 0) {
        parts.push({ token: ' ' })
        pushRuns(suffixRuns)
      }
      return [
        parts.map(part => part.token).join(''),
        ...parts.filter(part => part.substitution !== undefined).map(part => part.substitution),
      ]
    }

    if (currentEnv === 'terminal') {
      const currentTokens = tokens()
      const out: unknown[] = []
      const prefixText = prefixRuns.map(ansiRun).join('')
      if (prefixText) {
        out.push(prefixText)
      }
      for (const arg of args) {
        out.push(
          serializeToSegments(arg, limits())
            .map(segment => ansiRun({ text: segment.text, fg: currentTokens[segment.kind], bg: null }))
            .join(''),
        )
      }
      const suffixText = suffixRuns.map(ansiRun).join('')
      if (suffixText) {
        out.push(suffixText)
      }
      return out
    }

    // plain：标签纯文本，参数原样透传（交由宿主 console 处理）
    const out: unknown[] = []
    const prefixText = prefixRuns.map(plainRun).join('')
    if (prefixText) {
      out.push(prefixText)
    }
    out.push(...args)
    const suffixText = suffixRuns.map(plainRun).join('')
    if (suffixText) {
      out.push(suffixText)
    }
    return out
  }) as Highlighter

  Object.defineProperty(highlighter, 'env', {
    get: () => env(),
    enumerable: true,
  })
  Object.defineProperty(highlighter, 'mode', {
    get: () => mode(),
    enumerable: true,
  })
  highlighter.stringify = (value: unknown): string =>
    serializeToSegments(value, limits())
      .map(segment => segment.text)
      .join('')

  return highlighter
}
