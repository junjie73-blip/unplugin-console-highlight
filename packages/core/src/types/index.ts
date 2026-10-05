/**
 * 支持转换的 console 方法。
 */
export type ConsoleMethod = 'log' | 'info' | 'warn' | 'error' | 'debug'

/** 全部 console 方法（按输出严重级别排序） */
export const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const satisfies readonly ConsoleMethod[]

/**
 * 文件过滤规则。字符串按子串匹配，正则按 test 匹配。
 */
export type FilterPattern = RegExp | string | ReadonlyArray<RegExp | string>

/**
 * 高亮运行时可识别的输出环境。
 * - `browser`：使用 `%c` CSS 指令着色
 * - `terminal`：使用 ANSI 转义序列着色（仅 TTY）
 * - `plain`：不着色，纯文本降级
 */
export type HighlightEnv = 'browser' | 'terminal' | 'plain'

/** 配色模式：亮色 / 暗色 */
export type ColorMode = 'light' | 'dark'

/** 配色模式配置：`auto` 在浏览器跟随系统偏好，终端默认暗色 */
export type ModeOption = ColorMode | 'auto'

/**
 * 语法高亮 token 类别。
 */
export type TokenKind =
  /** 首个字符串参数：按日志正文渲染，不加引号 */
  | 'message'
  | 'string'
  | 'number'
  | 'boolean'
  | 'nullish'
  | 'key'
  | 'punctuation'
  | 'callable'
  | 'special'

/** 每个 token 类别对应的颜色（十六进制，浏览器直接使用，终端自动转换为 24-bit ANSI） */
export type HighlightTokens = Record<TokenKind, string> & {
  /** 前缀文字颜色（text 模式标签、plain 环境不使用） */
  prefix: string
  /** 各 console 方法标签颜色 */
  tags: Record<ConsoleMethod, string>
}

/** 用户可覆盖的部分 token 集合 */
export type PartialHighlightTokens = {
  [K in TokenKind]?: string
} & {
  prefix?: string
  tags?: Partial<Record<ConsoleMethod, string>>
}

/**
 * 标签片段类型。
 * - `icon`：图标（取自 icon 配置）
 * - `file`：文件名（basename）
 * - `path`：相对项目根路径
 * - `line`：调用行号
 * - `function`：所在函数名（顶层作用域时该片段自动省略）
 * - `time`：时间戳（受 timeFormat 控制）
 * - `tag`：`[LOG]` 形式的方法标签
 * - `method`：方法名小写原文
 * - `text`：固定文本
 */
export type LabelSegmentType =
  | 'icon'
  | 'file'
  | 'path'
  | 'line'
  | 'function'
  | 'time'
  | 'tag'
  | 'method'
  | 'text'

/**
 * 标签片段：prefix / suffix 的最小组成单元。
 */
export interface LabelSegment {
  type: LabelSegmentType
  /** `text` 片段的内容；`icon` / `tag` 片段可用它覆盖默认值 */
  value?: string
  /** 粘合文本：仅当该片段成功渲染时才会前置输出（如 ` ~ `、`·`） */
  glue?: string
  /** 前景色（十六进制）；缺省继承标签整体配色 */
  color?: string
  /** 背景色（十六进制）；指定后该片段独立成块（chip 内分色） */
  background?: string
}

/**
 * 标签模板字符串。支持占位符：
 * `{icon}` `{file}` `{path}` `{line}` `{fn}` `{time}` `{tag}` `{method}`
 */
export type LabelTemplate = string

/** 标签函数上下文（构建期可获取完整位置信息） */
export interface LabelContext {
  method: ConsoleMethod
  /** 相对项目根的路径（posix 风格） */
  file: string
  /** 调用所在行号（从 1 开始） */
  line: number
  /** 所在函数名；顶层作用域为 null */
  fn: string | null
}

/** 静态标签配置：关闭 / 模板字符串 / 片段数组 */
export type LabelConfig = false | LabelTemplate | LabelSegment[]

/**
 * 标签配置。函数形式在构建期按调用点求值（可拿到文件、行号、函数名），
 * 返回值可为模板字符串或片段数组。
 */
export type LabelInput =
  | LabelConfig
  | ((context: LabelContext) => LabelTemplate | LabelSegment[])

/**
 * 标签视觉样式。
 */
export interface LabelStyleOptions {
  /**
   * `chip`：色块背景（对标 unplugin-turbo-console 效果，默认）；
   * `text`：仅前景色文字。
   */
  mode?: 'chip' | 'text'
  /**
   * 标签主色。`auto`（默认）按文件名哈希从 palette 取色；
   * 也可指定固定十六进制颜色。
   */
  color?: string | 'auto'
  /** 自动取色色板，可按亮/暗模式分别配置 */
  palette?: string[] | Partial<Record<ColorMode, string[]>>
  /** chip 前景色。`auto`（默认）按背景亮度自动选择黑/白 */
  textColor?: string | 'auto'
  /** 附加 CSS（仅作用于带背景的片段），如圆角、内边距 */
  css?: string
}

/**
 * 高亮行为配置。
 */
export interface HighlightOptions {
  /** 强制指定输出环境，默认 `auto`（运行时自动探测） */
  env?: HighlightEnv | 'auto'
  /** 亮/暗模式，影响语法高亮 token 与标签色板，默认 `auto` */
  mode?: ModeOption
  /** 对象/数组最大展开深度，默认 4 */
  maxDepth?: number
  /** 对象/数组最多展开的条目数，默认 50 */
  maxEntries?: number
  /** 字符串值最大长度（超出截断），默认 500 */
  maxStringLength?: number
  /** 按模式覆盖 token 颜色 */
  tokens?: Partial<Record<ColorMode, PartialHighlightTokens>>
}

/**
 * 插件用户配置。
 */
export interface ConsoleHighlightOptions {
  /** 需要转换的文件，默认 `[/\.(js|ts|jsx|tsx|vue)$/]` */
  include?: FilterPattern
  /** 排除的文件，默认 `[/node_modules/]` */
  exclude?: FilterPattern
  /** 需要处理的 console 方法，默认全部五种 */
  methods?: readonly ConsoleMethod[]
  /**
   * 图标（作为默认 `icon` 片段的内容）。
   * - `string`：所有方法共用
   * - `Record<ConsoleMethod, string>`：按方法定制
   * - `false`：不显示图标
   * 默认按方法显示 📝/ℹ️/⚠️//🔍
   */
  icon?: string | Partial<Record<ConsoleMethod, string>> | false
  /**
   * 前缀标签（插入在参数之前）。
   * 默认片段：图标 + 文件名·行号 ~ 函数名（chip 色块）。
   */
  prefix?: LabelInput
  /**
   * 后缀标签（追加在参数之后），默认 `false` 关闭。
   */
  suffix?: LabelInput
  /** 标签视觉样式（chip / 颜色 / 色板 / 附加 CSS） */
  label?: LabelStyleOptions
  /** 时间格式（支持 YYYY YY MM DD HH mm ss SSS），`false` 关闭时间显示，默认 `YYYY-MM-DD HH:mm:ss` */
  timeFormat?: string | false
  /** 高亮配置，`false` 时仅保留标签、参数原样透传，默认 `true` */
  highlight?: boolean | HighlightOptions
  /**
   * 项目根路径（用于定位独立配置文件与计算相对路径）。
   * Vite 下自动取自 `config.root`，其他框架缺省为 `process.cwd()`。
   */
  root?: string
}

/** 归一化后的标签样式（内部使用） */
export interface ResolvedLabelStyle {
  mode: 'chip' | 'text'
  color: string | 'auto'
  palette: Record<ColorMode, string[]>
  textColor: string | 'auto'
  css: string
}

/**
 * 归一化后的插件配置（内部使用）。
 */
export interface ResolvedConsoleHighlightOptions {
  include: (RegExp | string)[]
  exclude: (RegExp | string)[]
  methods: ConsoleMethod[]
  icon: Partial<Record<ConsoleMethod, string>> | false
  prefix: LabelConfig
  suffix: LabelConfig
  /** 用户函数形式 prefix 的构建期求值器 */
  prefixFn?: (context: LabelContext) => LabelTemplate | LabelSegment[]
  /** 用户函数形式 suffix 的构建期求值器 */
  suffixFn?: (context: LabelContext) => LabelTemplate | LabelSegment[]
  label: ResolvedLabelStyle
  timeFormat: string | false
  highlight: ResolvedHighlightOptions
}

/** 归一化后的高亮配置（内部使用） */
export interface ResolvedHighlightOptions {
  enabled: boolean
  env: HighlightEnv | 'auto'
  mode: ModeOption
  maxDepth: number
  maxEntries: number
  maxStringLength: number
  tokens: Record<ColorMode, HighlightTokens>
}

/** 转换期注入到每次调用的位置元信息 */
export interface CallMeta {
  /** 相对项目根的路径（posix 风格） */
  file: string
  /** 调用所在行号（从 1 开始） */
  line: number
  /** 所在函数名；顶层作用域为 null */
  fn: string | null
  /** 函数形式 prefix 在构建期求值的结果 */
  prefix?: LabelConfig
  /** 函数形式 suffix 在构建期求值的结果 */
  suffix?: LabelConfig
}

/**
 * 注入到虚拟模块、随打包产物分发的运行时配置（必须可 JSON 序列化）。
 */
export interface HighlightRuntimeOptions {
  icons: Record<ConsoleMethod, string> | false
  prefix: LabelConfig
  suffix: LabelConfig
  label: ResolvedLabelStyle
  timeFormat: string | false
  tokens: Record<ColorMode, HighlightTokens>
  mode: ModeOption
  env: HighlightEnv | 'auto'
  maxDepth: number
  maxEntries: number
  maxStringLength: number
  /** highlight 为 false 时运行时只输出标签、透传参数 */
  highlightValues: boolean
}

/** 带类型推导的配置定义辅助函数（保留字面量类型） */
export function defineConsoleHighlightConfig<const T extends ConsoleHighlightOptions>(config: T): T {
  return config
}

/** 带类型推导的标签定义辅助函数 */
export function defineLabel<const T extends LabelSegment[]>(segments: T): T {
  return segments
}

/** 从用户配置推导实际生效的 console 方法联合类型 */
export type InferMethods<T extends ConsoleHighlightOptions> =
  T['methods'] extends readonly ConsoleMethod[]
    ? T['methods'][number]
    : ConsoleMethod

/** 从用户配置推导图标映射类型 */
export type InferIcons<T extends ConsoleHighlightOptions> =
  T['icon'] extends string
    ? Record<ConsoleMethod, T['icon']>
    : T['icon'] extends Partial<Record<ConsoleMethod, string>>
      ? T['icon']
      : Record<ConsoleMethod, string>
