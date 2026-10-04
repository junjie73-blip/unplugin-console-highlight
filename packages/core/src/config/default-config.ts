import type {
  ColorMode,
  ConsoleHighlightOptions,
  ConsoleMethod,
  HighlightTokens,
  LabelSegment,
  LabelStyleOptions,
  PartialHighlightTokens,
} from '../types'

/** 各 console 方法的默认图标 */
export const DEFAULT_ICONS: Record<ConsoleMethod, string> = {
  log: '📝',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  debug: '🔍',
}

/** 方法标签颜色（两种模式共用） */
const TAG_COLORS: Record<ConsoleMethod, string> = {
  log: '#1890ff',
  info: '#52c41a',
  warn: '#d48806',
  error: '#ff4d4f',
  debug: '#9254de',
}

/** 亮色模式 token（参考 VSCode Light+ 语法配色） */
const LIGHT_TOKENS: HighlightTokens = {
  string: '#a31515',
  number: '#098658',
  boolean: '#0000ff',
  nullish: '#811f3f',
  key: '#0451a5',
  punctuation: '#383838',
  callable: '#795e26',
  special: '#267f99',
  prefix: '#57606a',
  tags: TAG_COLORS,
}

/** 暗色模式 token（参考 VSCode Dark+ 语法配色） */
const DARK_TOKENS: HighlightTokens = {
  string: '#ce9178',
  number: '#b5cea8',
  boolean: '#569cd6',
  nullish: '#569cd6',
  key: '#9cdcfe',
  punctuation: '#d4d4d4',
  callable: '#dcdcaa',
  special: '#4ec9b0',
  prefix: '#9da5b4',
  tags: TAG_COLORS,
}

/** 内置亮/暗 token 预设 */
export const TOKEN_PRESETS: Record<ColorMode, HighlightTokens> = {
  light: LIGHT_TOKENS,
  dark: DARK_TOKENS,
}

/** 亮色模式标签自动取色色板（高饱和，适配浅色 devtools / 终端） */
export const LIGHT_PALETTE: string[] = [
  '#1890ff',
  '#faad14',
  '#52c41a',
  '#eb2f96',
  '#722ed1',
  '#13c2c2',
  '#fa541c',
  '#2f54eb',
]

/** 暗色模式标签自动取色色板（低明度，适配深色 devtools / 终端） */
export const DARK_PALETTE: string[] = [
  '#1668dc',
  '#d89614',
  '#49aa19',
  '#c41d7f',
  '#642ab5',
  '#0e8f8f',
  '#d4380d',
  '#2b4acb',
]

/**
 * 默认前缀标签：图标 + 文件名·行号 ~ 函数名（对标 unplugin-turbo-console 的色块效果）。
 * 函数片段带 ` ~ ` 粘合文本，顶层作用域时自动省略。
 */
export const DEFAULT_PREFIX: LabelSegment[] = [
  { type: 'icon' },
  { type: 'file', glue: ' ' },
  { type: 'line', glue: '·' },
  { type: 'function', glue: ' ~ ' },
]

/** 默认标签样式：chip 色块 + 按文件自动取色 + 对比度前景 */
export const DEFAULT_LABEL: LabelStyleOptions = {
  mode: 'chip',
  color: 'auto',
  textColor: 'auto',
  css: 'border-radius:4px;padding:2px 6px;font-weight:600;',
}

export const DEFAULT_CONFIG: ConsoleHighlightOptions = {
  include: [/\.(js|ts|jsx|tsx|vue)$/],
  exclude: [/node_modules/],
  methods: ['log', 'info', 'warn', 'error', 'debug'],
  icon: DEFAULT_ICONS,
  prefix: DEFAULT_PREFIX,
  suffix: false,
  label: DEFAULT_LABEL,
  timeFormat: 'YYYY-MM-DD HH:mm:ss',
  highlight: true,
}

export const DEFAULT_HIGHLIGHT = {
  env: 'auto',
  mode: 'auto',
  maxDepth: 4,
  maxEntries: 50,
  maxStringLength: 500,
} as const

function mergeTokens(
  base: HighlightTokens,
  override: PartialHighlightTokens | undefined,
): HighlightTokens {
  if (!override) {
    return base
  }
  return {
    ...base,
    ...override,
    tags: { ...base.tags, ...override.tags },
  } as HighlightTokens
}

/** 解析亮/暗两套 token（用户可按模式覆盖） */
export function resolveTokens(
  tokens: Partial<Record<ColorMode, PartialHighlightTokens>> | undefined,
): Record<ColorMode, HighlightTokens> {
  return {
    light: mergeTokens(LIGHT_TOKENS, tokens?.light),
    dark: mergeTokens(DARK_TOKENS, tokens?.dark),
  }
}
