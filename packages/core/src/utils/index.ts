import type {
  ColorMode,
  ConsoleHighlightOptions,
  ConsoleMethod,
  FilterPattern,
  HighlightOptions,
  HighlightRuntimeOptions,
  LabelConfig,
  LabelContext,
  LabelSegment,
  LabelTemplate,
  ResolvedConsoleHighlightOptions,
  ResolvedLabelStyle,
} from '../types'
import {
  DARK_PALETTE,
  DEFAULT_CONFIG,
  DEFAULT_HIGHLIGHT,
  DEFAULT_ICONS,
  LIGHT_PALETTE,
  resolveTokens,
} from '../config/default-config'

const DEFAULT_INCLUDE = [/\.(js|ts|jsx|tsx|vue)$/]

function normalizePattern(pattern: FilterPattern | undefined, fallback: (RegExp | string)[]): (RegExp | string)[] {
  if (pattern === undefined) {
    return fallback
  }
  if (typeof pattern === 'string' || pattern instanceof RegExp) {
    return [pattern]
  }
  return [...pattern]
}

function normalizeLabel(
  input: LabelConfig | ((context: LabelContext) => LabelTemplate | LabelSegment[]) | undefined,
  fallback: LabelConfig,
): { config: LabelConfig, fn?: (context: LabelContext) => LabelTemplate | LabelSegment[] } {
  const value = input === undefined ? fallback : input
  if (typeof value === 'function') {
    return { config: false, fn: value }
  }
  return { config: value }
}

function normalizePalette(
  palette: string[] | Partial<Record<ColorMode, string[]>> | undefined,
): Record<ColorMode, string[]> {
  if (!palette) {
    return { light: LIGHT_PALETTE, dark: DARK_PALETTE }
  }
  if (Array.isArray(palette)) {
    return { light: palette, dark: palette }
  }
  return {
    light: palette.light ?? LIGHT_PALETTE,
    dark: palette.dark ?? DARK_PALETTE,
  }
}

/** 精确行号计算（考虑多行表达式） */
export function getLineNumber(code: string, index: number): number {
  return code.slice(0, index).split('\n').length
}

/**
 * 将用户配置与默认配置合并为归一化配置。
 * include/exclude 采用叠加语义，其余字段后者覆盖前者。
 */
export function mergeConfig(
  ...configs: (ConsoleHighlightOptions | undefined)[]
): ResolvedConsoleHighlightOptions {
  const flat: ConsoleHighlightOptions = {}
  let include: (RegExp | string)[] | undefined
  let exclude: (RegExp | string)[] | undefined

  for (const config of configs) {
    if (!config) {
      continue
    }
    Object.assign(flat, config)
    if (config.include !== undefined) {
      include = [...(include ?? []), ...normalizePattern(config.include, [])]
    }
    if (config.exclude !== undefined) {
      exclude = [...(exclude ?? []), ...normalizePattern(config.exclude, [])]
    }
  }

  const highlightInput = flat.highlight ?? DEFAULT_CONFIG.highlight
  const highlightOptions: HighlightOptions = typeof highlightInput === 'object' ? highlightInput : {}
  const highlightEnabled = highlightInput !== false

  const iconInput = flat.icon ?? DEFAULT_CONFIG.icon
  let icons: Partial<Record<ConsoleMethod, string>> | false
  if (iconInput === false) {
    icons = false
  }
  else if (typeof iconInput === 'string') {
    icons = { log: iconInput, info: iconInput, warn: iconInput, error: iconInput, debug: iconInput }
  }
  else {
    icons = { ...DEFAULT_ICONS, ...iconInput }
  }

  const prefix = normalizeLabel(flat.prefix, DEFAULT_CONFIG.prefix as LabelConfig)
  const suffix = normalizeLabel(flat.suffix, DEFAULT_CONFIG.suffix as LabelConfig)

  const labelInput = flat.label ?? {}
  const label: ResolvedLabelStyle = {
    mode: labelInput.mode ?? 'chip',
    color: labelInput.color ?? 'auto',
    palette: normalizePalette(labelInput.palette),
    textColor: labelInput.textColor ?? 'auto',
    css: labelInput.css ?? 'border-radius:4px;padding:2px 6px;font-weight:600;',
  }

  return {
    include: include ?? normalizePattern(flat.include, DEFAULT_INCLUDE),
    exclude: exclude ?? normalizePattern(flat.exclude, [/node_modules/]),
    methods: [...(flat.methods ?? DEFAULT_CONFIG.methods!)] as ConsoleMethod[],
    icon: icons,
    prefix: prefix.config,
    suffix: suffix.config,
    prefixFn: prefix.fn,
    suffixFn: suffix.fn,
    label,
    timeFormat: flat.timeFormat === undefined ? DEFAULT_CONFIG.timeFormat! : flat.timeFormat,
    highlight: {
      enabled: highlightEnabled,
      env: highlightEnabled ? highlightOptions.env ?? DEFAULT_HIGHLIGHT.env : 'plain',
      mode: highlightOptions.mode ?? DEFAULT_HIGHLIGHT.mode,
      maxDepth: highlightOptions.maxDepth ?? DEFAULT_HIGHLIGHT.maxDepth,
      maxEntries: highlightOptions.maxEntries ?? DEFAULT_HIGHLIGHT.maxEntries,
      maxStringLength: highlightOptions.maxStringLength ?? DEFAULT_HIGHLIGHT.maxStringLength,
      tokens: resolveTokens(highlightOptions.tokens),
    },
  }
}

/**
 * 由归一化配置生成可 JSON 序列化的运行时配置（注入虚拟模块）。
 */
export function toRuntimeOptions(
  resolved: ResolvedConsoleHighlightOptions,
): HighlightRuntimeOptions {
  return {
    icons: resolved.icon === false
      ? false
      : { ...DEFAULT_ICONS, ...(resolved.icon as Partial<Record<ConsoleMethod, string>>) },
    prefix: resolved.prefix,
    suffix: resolved.suffix,
    label: resolved.label,
    timeFormat: resolved.timeFormat,
    tokens: resolved.highlight.tokens,
    mode: resolved.highlight.mode,
    env: resolved.highlight.env,
    maxDepth: resolved.highlight.maxDepth,
    maxEntries: resolved.highlight.maxEntries,
    maxStringLength: resolved.highlight.maxStringLength,
    highlightValues: resolved.highlight.enabled,
  }
}

function matches(id: string, pattern: RegExp | string): boolean {
  return typeof pattern === 'string' ? id.includes(pattern) : pattern.test(id)
}

/**
 * 判断模块是否需要转换。
 */
export function shouldTransform(id: string, options: Pick<ResolvedConsoleHighlightOptions, 'include' | 'exclude'>): boolean {
  const cleanId = id.split('?')[0]
  if (cleanId.includes('node_modules')) {
    return false
  }
  if (options.exclude.some(pattern => matches(cleanId, pattern))) {
    return false
  }
  return options.include.some(pattern => matches(cleanId, pattern))
}

/**
 * 结构化深比较（用于配置文件变更检测）。
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') {
    return false
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString()
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))
  }
  const keysA = Object.keys(a)
  const keysB = Object.keys(b as object)
  if (keysA.length !== keysB.length) {
    return false
  }
  return keysA.every(
    key =>
      Object.prototype.hasOwnProperty.call(b, key)
      && deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  )
}
