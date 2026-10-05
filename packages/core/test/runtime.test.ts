import type { ConsoleHighlightOptions, HighlightRuntimeOptions } from '../src/types'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/config/default-config'
import {
  contrastText,
  createHighlight,
  detectEnv,
  detectMode,
  formatTime,
  hashString,
  hexToAnsi,
  hexToAnsiBackground,
  serializeToSegments,
} from '../src/runtime'
import { mergeConfig, toRuntimeOptions } from '../src/utils'

const META = { file: 'src/log.ts', line: 4, fn: 'logMessage' }
const TOP_META = { file: 'src/log.ts', line: 9, fn: null }
const LIMITS = { maxDepth: 4, maxEntries: 50, maxStringLength: 500 }

function makeOptions(
  user: ConsoleHighlightOptions = {},
  overrides: Partial<HighlightRuntimeOptions> = {},
): HighlightRuntimeOptions {
  return { ...toRuntimeOptions(mergeConfig(DEFAULT_CONFIG, user)), ...overrides }
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window
  delete (globalThis as Record<string, unknown>).document
})

describe('detectEnv', () => {
  it('浏览器环境', () => {
    ;(globalThis as Record<string, unknown>).window = {}
    ;(globalThis as Record<string, unknown>).document = {}
    expect(detectEnv()).toBe('browser')
  })

  it('终端 TTY 环境', () => {
    expect(detectEnv()).toBe(process.stdout.isTTY ? 'terminal' : 'plain')
  })
})

describe('detectMode', () => {
  it('显式模式直接返回', () => {
    expect(detectMode('browser', 'light')).toBe('light')
    expect(detectMode('terminal', 'dark')).toBe('dark')
  })

  it('终端 auto 为暗色', () => {
    expect(detectMode('terminal', 'auto')).toBe('dark')
  })

  it('plain auto 为亮色', () => {
    expect(detectMode('plain', 'auto')).toBe('light')
  })

  it('浏览器 auto 跟随系统偏好', () => {
    ;(globalThis as Record<string, unknown>).window = {
      matchMedia: () => ({ matches: true }),
    }
    ;(globalThis as Record<string, unknown>).document = {}
    expect(detectMode('browser', 'auto')).toBe('dark')
    ;(globalThis as Record<string, unknown>).window = {
      matchMedia: () => ({ matches: false }),
    }
    expect(detectMode('browser', 'auto')).toBe('light')
  })

  it('matchMedia 缺失时降级亮色', () => {
    ;(globalThis as Record<string, unknown>).window = {}
    ;(globalThis as Record<string, unknown>).document = {}
    expect(detectMode('browser', 'auto')).toBe('light')
  })
})

describe('颜色工具', () => {
  it('formatTime 支持全部 token', () => {
    const date = new Date(2026, 9, 4, 8, 7, 6, 5)
    expect(formatTime(date, 'YYYY-MM-DD HH:mm:ss.SSS')).toBe('2026-10-04 08:07:06.005')
    expect(formatTime(date, 'YY/MM/DD')).toBe('26/10/04')
  })

  it('hexToAnsi 前景/背景', () => {
    expect(hexToAnsi('#ff0000')).toBe('\u001B[38;2;255;0;0m')
    expect(hexToAnsiBackground('#00ff00')).toBe('\u001B[48;2;0;255;0m')
    expect(hexToAnsi('nope')).toBe('')
  })

  it('contrastText 按亮度取对比色', () => {
    expect(contrastText('#ffffff')).toBe('#1f2328')
    expect(contrastText('#1890ff')).toBe('#ffffff')
  })

  it('hashString 稳定且非负', () => {
    expect(hashString('a.ts')).toBe(hashString('a.ts'))
    expect(hashString('b.ts')).not.toBe(hashString('a.ts'))
    expect(hashString('x')).toBeGreaterThanOrEqual(0)
  })
})

describe('serializeToSegments', () => {
  it('基础类型', () => {
    expect(serializeToSegments('ab', LIMITS)).toEqual([{ text: '"ab"', kind: 'string' }])
    expect(serializeToSegments(-0, LIMITS)).toEqual([{ text: '-0', kind: 'number' }])
    expect(serializeToSegments(10n, LIMITS)).toEqual([{ text: '10n', kind: 'special' }])
    expect(serializeToSegments(true, LIMITS)).toEqual([{ text: 'true', kind: 'boolean' }])
    expect(serializeToSegments(null, LIMITS)).toEqual([{ text: 'null', kind: 'nullish' }])
    expect(serializeToSegments(undefined, LIMITS)).toEqual([{ text: 'undefined', kind: 'nullish' }])
  })

  it('字符串截断', () => {
    const segments = serializeToSegments('abcdefg', { ...LIMITS, maxStringLength: 3 })
    expect(segments[0]!.text).toBe('"abc…"')
  })

  it('函数与内置对象', () => {
    function demo() {}
    expect(serializeToSegments(demo, LIMITS)[0]!.text).toBe('ƒ demo()')
    expect(serializeToSegments(/ab/g, LIMITS)[0]!.text).toBe('/ab/g')
    expect(serializeToSegments(new Error('boom'), LIMITS)[0]!.text).toBe('Error: boom')
    expect(serializeToSegments(new Date('2026-01-02T03:04:05.000Z'), LIMITS)[0]!.kind).toBe('special')
  })

  it('循环引用标记', () => {
    const a: Record<string, unknown> = {}
    a.self = a
    const text = serializeToSegments(a, LIMITS).map(s => s.text).join('')
    expect(text).toContain('[Circular]')
  })

  it('深度与条目限制', () => {
    const deep = { a: { b: { c: { d: { e: 1 } } } } }
    expect(serializeToSegments(deep, LIMITS).map(s => s.text).join('')).toContain('…')
    const wide = { ...Object.fromEntries(Array.from({ length: 60 }, (_, i) => [String(i), i])) }
    const text = serializeToSegments(wide, LIMITS).map(s => s.text).join('')
    expect(text).toContain('+10')
  })

  it('Map / Set / 数组', () => {
    expect(serializeToSegments(new Map([['k', 1]]), LIMITS).map(s => s.text).join('')).toContain('Map(1)')
    expect(serializeToSegments(new Set([1, 2]), LIMITS).map(s => s.text).join('')).toContain('Set(2)')
    expect(serializeToSegments([], LIMITS)[0]!.text).toBe('[]')
  })

  it('getter 抛错被捕获', () => {
    const value = {
      get bad(): number {
        throw new Error('nope')
      },
    }
    const text = serializeToSegments(value, LIMITS).map(s => s.text).join('')
    expect(text).toContain('[Getter threw: nope]')
  })
})

describe('浏览器渲染', () => {
  it('默认 chip 前缀：单块背景 + 对比色 + 附加 CSS', () => {
    const highlight = createHighlight(makeOptions({}, { env: 'browser', mode: 'light' }))
    const out = highlight('log', META, 'hello') as unknown[]
    const format = out[0] as string
    expect(format.startsWith('%c📝 log.ts·4 ~ logMessage')).toBe(true)
    const style = out[1] as string
    expect(style).toContain('background:#')
    expect(style).toContain('border-radius:4px')
    expect(style).toMatch(/color:#(ffffff|1f2328);/)
  })

  it('首个字符串参数按正文渲染：无引号 + message 色', () => {
    const out = createHighlight(makeOptions({}, { env: 'browser', mode: 'light' }))('log', META, 'hello') as unknown[]
    expect(out[0]).toBe('%c📝 log.ts·4 ~ logMessage %chello')
    expect(out[2]).toBe('color: #1f2328;')
  })

  it('亮/暗模式使用不同 token 与色板', () => {
    const light = createHighlight(makeOptions({}, { env: 'browser', mode: 'light' }))('log', META, 'msg', 's') as unknown[]
    const dark = createHighlight(makeOptions({}, { env: 'browser', mode: 'dark' }))('log', META, 'msg', 's') as unknown[]
    expect(light.join(' ')).toContain('#a31515')
    expect(dark.join(' ')).toContain('#ce9178')
    expect(light.join(' ')).toContain('#1f2328')
    expect(dark.join(' ')).toContain('#e6edf3')
    expect(light[1]).not.toBe(dark[1])
  })

  it('原始值着色、对象保留 %o', () => {
    const payload = { a: 1 }
    const out = createHighlight(makeOptions({}, { env: 'browser', mode: 'light' }))('log', META, 'n:', 1, payload) as unknown[]
    const format = out[0] as string
    expect(format).toContain('%o')
    expect(out.at(-1)).toBe(payload)
    expect(format).toContain('%c1')
  })

  it('text 模式无背景', () => {
    const out = createHighlight(makeOptions({ label: { mode: 'text' } }, { env: 'browser', mode: 'light' }))('log', META, 'x') as unknown[]
    expect((out[1] as string)).not.toContain('background:')
  })

  it('prefix 关闭后无前缀块', () => {
    const out = createHighlight(makeOptions({ prefix: false }, { env: 'browser', mode: 'light' }))('log', META, 'x') as unknown[]
    expect((out[0] as string).startsWith('%cx')).toBe(true)
  })

  it('icon 关闭后前缀不含图标', () => {
    const out = createHighlight(makeOptions({ icon: false }, { env: 'browser', mode: 'light' }))('log', META, 'x') as unknown[]
    expect(out[0] as string).not.toContain('📝')
    expect(out[0] as string).toContain('log.ts·4 ~ logMessage')
  })

  it('顶层作用域省略函数片段及其粘合符', () => {
    const out = createHighlight(makeOptions({}, { env: 'browser', mode: 'light' }))('log', TOP_META, 'x') as unknown[]
    expect(out[0] as string).toContain('📝 log.ts·9')
    expect(out[0] as string).not.toContain('~')
  })

  it('模板前缀展开占位符', () => {
    const out = createHighlight(makeOptions({ prefix: '{icon} {file}·{line} ~ {fn} {tag}' }, { env: 'browser', mode: 'light' }))('warn', META, 'x') as unknown[]
    expect(out[0] as string).toContain('⚠️ log.ts·4 ~ logMessage [WARN]')
  })

  it('suffix 追加在参数之后', () => {
    const out = createHighlight(makeOptions({ suffix: [{ type: 'tag' }] }, { env: 'browser', mode: 'light' }))('info', META, 'x') as unknown[]
    const format = out[0] as string
    expect(format.endsWith('%c[INFO]')).toBe(true)
    expect(format.indexOf('[INFO]')).toBeGreaterThan(format.indexOf('%cx'))
  })

  it('片段级 background 覆盖形成多块', () => {
    const out = createHighlight(makeOptions({
      prefix: [{ type: 'icon', background: '#ff0000' }, { type: 'file', glue: ' ', background: '#00ff00' }],
    }, { env: 'browser', mode: 'light' }))('log', META, 'x') as unknown[]
    expect(out[1] as string).toContain('background:#ff0000')
    expect(out[2] as string).toContain('background:#00ff00')
  })

  it('highlight 关闭时参数原样透传', () => {
    const payload = { keep: true }
    const out = createHighlight(makeOptions({ highlight: false }, { env: 'browser' }))('log', META, 'raw', payload) as unknown[]
    expect(out).toContain(payload)
    expect(out).toContain('raw')
  })

  it('用户自带格式串保留指令与参数顺序', () => {
    const style = 'color: #10b981; font-weight: bold;'
    const out = createHighlight(makeOptions({}, { env: 'browser', mode: 'light' }))('log', META, '%c👋', style) as unknown[]
    expect(out[0]).toBe('%c📝 log.ts·4 ~ logMessage %c👋')
    expect(out[1] as string).toContain('background:#')
    expect(out[2]).toBe(style)
  })

  it('文本中的 % 转义为 %%，不会被当作格式指令', () => {
    const out = createHighlight(makeOptions({}, { env: 'browser', mode: 'light' }))('log', META, '100% done') as unknown[]
    expect(out[0] as string).toContain('%c100%% done')
  })

  it('highlight 关闭时标签文本仍留在格式串里', () => {
    const style = 'color: red;'
    const out = createHighlight(makeOptions({ highlight: false }, { env: 'browser' }))('log', META, '%c👋', style) as unknown[]
    expect(out[0]).toBe('%c📝 log.ts·4 ~ logMessage %c👋')
    expect(out[2]).toBe(style)
  })
})

describe('终端渲染', () => {
  it('chip 使用 ANSI 背景色', () => {
    const out = createHighlight(makeOptions({}, { env: 'terminal', mode: 'dark' }))('warn', META, 'v') as string[]
    expect(out[0]).toContain('\u001B[48;2;')
    expect(out[0]).toContain('\u001B[0m')
    expect(out[0]).toContain('⚠️ log.ts·4 ~ logMessage')
  })

  it('值按暗色 token 着色', () => {
    const out = createHighlight(makeOptions({}, { env: 'terminal', mode: 'dark' }))('log', META, 'msg', 's') as string[]
    expect(out[1]).toContain('\u001B[38;2;230;237;243m')
    expect(out[2]).toContain('\u001B[38;2;206;145;120m')
  })

  it('suffix 作为最后一个参数', () => {
    const out = createHighlight(makeOptions({ suffix: [{ type: 'method', glue: ' ' }] }, { env: 'terminal', mode: 'dark' }))('log', META, 'v') as string[]
    expect(out.at(-1)).toContain('log')
  })

  it('highlight 关闭时透传', () => {
    const payload = { keep: true }
    const out = createHighlight(makeOptions({ highlight: false }, { env: 'terminal' }))('log', META, payload) as unknown[]
    expect(out).toContain(payload)
  })

  it('无前缀时首个片段转义 %，避免 Node 把后续参数当替换值吞掉', () => {
    const out = createHighlight(makeOptions({ prefix: false }, { env: 'terminal', mode: 'dark' }))('log', META, '%s', 'tail') as string[]
    expect(out[0]).toContain('%%s')
    expect(out[1]).toContain('"tail"')
  })
})

describe('plain 渲染', () => {
  it('前缀纯文本 + 参数透传', () => {
    const payload = { keep: true }
    const out = createHighlight(makeOptions({}, { env: 'plain' }))('error', META, 'boom', payload) as unknown[]
    expect(out[0]).toBe('❌ log.ts·4 ~ logMessage')
    expect(out[1]).toBe('boom')
    expect(out[2]).toBe(payload)
  })

  it('suffix 追加为末尾参数', () => {
    const out = createHighlight(makeOptions({ suffix: [{ type: 'tag' }] }, { env: 'plain' }))('info', META, 'x') as unknown[]
    expect(out.at(-1)).toBe('[INFO]')
  })

  it('meta 缺省时不崩溃', () => {
    const out = createHighlight(makeOptions({}, { env: 'plain' }))('log', undefined, 'x') as unknown[]
    expect(out[1]).toBe('x')
  })
})

describe('Highlighter 属性', () => {
  it('暴露 env 与 mode', () => {
    const highlight = createHighlight(makeOptions({}, { env: 'terminal', mode: 'dark' }))
    expect(highlight.env).toBe('terminal')
    expect(highlight.mode).toBe('dark')
  })

  it('stringify 输出纯文本', () => {
    const highlight = createHighlight(makeOptions({}, { env: 'plain' }))
    expect(highlight.stringify({ a: 1 })).toBe('{a: 1}')
  })
})

/** 按 devtools 规则消费格式串：`%c` 只吃样式不产出文本，其余指令产出对应参数 */
function simulate(out: unknown[]): { text: string, consumed: number } {
  const format = String(out[0])
  const subs = out.slice(1)
  let text = ''
  let consumed = 0
  for (let index = 0; index < format.length; index++) {
    const char = format[index]
    if (char !== '%') {
      text += char
      continue
    }
    const directive = format[++index]!
    if (directive === '%') {
      text += '%'
    }
    else if ('csdifoO'.includes(directive)) {
      const value = subs[consumed++]
      text += directive === 'c' ? '' : String(value)
    }
    else {
      text += `%${directive}`
    }
  }
  return { text, consumed }
}

describe('格式串与替换值对齐（devtools 模拟）', () => {
  const browser = (args: unknown[]) =>
    createHighlight(makeOptions({}, { env: 'browser', mode: 'light' }))('log', META, ...args) as unknown[]

  it.each([
    ['纯文本', ['hello']],
    ['文本含百分号', ['100% done']],
    ['文本含 %c 指令', ['%c👋', 'color: red;']],
    ['文本含 %s 指令', ['%s!', 'x']],
    ['对象参数', ['msg', { a: 1 }]],
    ['多个原始值', ['msg', 1, true, null, 's']],
  ])('%s：所有替换值都被指令消费', (_name, args) => {
    const out = browser(args)
    const { consumed } = simulate(out)
    expect(consumed).toBe(out.length - 1)
  })

  it('用户自带指令不再泄漏出裸 %c 与样式串', () => {
    const out = browser(['%c👋', 'color: #10b981; font-weight: bold;'])
    const { text } = simulate(out)
    expect(text).toBe('📝 log.ts·4 ~ logMessage 👋')
    expect(text).not.toContain('%c')
    expect(text).not.toContain('font-weight')
  })

  it('普通文本里的 % 原样显示', () => {
    expect(simulate(browser(['100% done'])).text).toBe('📝 log.ts·4 ~ logMessage 100% done')
  })
})
