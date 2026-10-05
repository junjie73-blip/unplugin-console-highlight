import { describe, expect, it } from 'vitest'
import {
  DARK_PALETTE,
  DEFAULT_CONFIG,
  DEFAULT_ICONS,
  DEFAULT_PREFIX,
  LIGHT_PALETTE,
} from '../src/config/default-config'
import {
  computeLineOffsets,
  deepEqual,
  getLineNumber,
  lineAtOffset,
  mergeConfig,
  shouldTransform,
  toRuntimeOptions,
} from '../src/utils'

describe('mergeConfig', () => {
  it('默认值：chip 前缀标签、关闭后缀、亮暗 token 齐备', () => {
    const resolved = mergeConfig(DEFAULT_CONFIG)
    expect(resolved.prefix).toEqual(DEFAULT_PREFIX)
    expect(resolved.suffix).toBe(false)
    expect(resolved.label.mode).toBe('chip')
    expect(resolved.label.color).toBe('auto')
    expect(resolved.label.palette).toEqual({ light: LIGHT_PALETTE, dark: DARK_PALETTE })
    expect(resolved.timeFormat).toBe('YYYY-MM-DD HH:mm:ss')
    expect(resolved.highlight.enabled).toBe(true)
    expect(resolved.highlight.mode).toBe('auto')
    expect(resolved.highlight.tokens.light.string).toBe('#a31515')
    expect(resolved.highlight.tokens.dark.string).toBe('#ce9178')
  })

  it('include / exclude 叠加', () => {
    const resolved = mergeConfig(DEFAULT_CONFIG, { include: ['src'], exclude: [/mock/] })
    expect(resolved.include).toEqual([...(DEFAULT_CONFIG.include as (RegExp | string)[]), 'src'])
    expect(resolved.exclude).toEqual([...(DEFAULT_CONFIG.exclude as (RegExp | string)[]), /mock/])
  })

  it('icon 字符串广播 / false 关闭', () => {
    expect(mergeConfig(DEFAULT_CONFIG, { icon: '🚀' }).icon).toEqual({
      log: '🚀',
      info: '🚀',
      warn: '🚀',
      error: '🚀',
      debug: '🚀',
    })
    expect(mergeConfig(DEFAULT_CONFIG, { icon: false }).icon).toBe(false)
    expect(mergeConfig(DEFAULT_CONFIG, { icon: { log: '🐳' } }).icon).toEqual({ ...DEFAULT_ICONS, log: '🐳' })
  })

  it('函数 prefix 转为构建期求值器', () => {
    const resolved = mergeConfig(DEFAULT_CONFIG, { prefix: () => 'P' })
    expect(resolved.prefix).toBe(false)
    expect(resolved.prefixFn?.({ method: 'log', file: 'a.ts', line: 1, fn: null })).toBe('P')
  })

  it('静态 prefix / suffix 原样保留', () => {
    const resolved = mergeConfig(DEFAULT_CONFIG, { prefix: '{file}·{line}', suffix: [{ type: 'tag' }] })
    expect(resolved.prefix).toBe('{file}·{line}')
    expect(resolved.suffix).toEqual([{ type: 'tag' }])
  })

  it('label 色板归一化', () => {
    const both = mergeConfig(DEFAULT_CONFIG, { label: { palette: ['#111111'] } })
    expect(both.label.palette).toEqual({ light: ['#111111'], dark: ['#111111'] })
    const partial = mergeConfig(DEFAULT_CONFIG, { label: { palette: { dark: ['#222222'] } } })
    expect(partial.label.palette).toEqual({ light: LIGHT_PALETTE, dark: ['#222222'] })
  })

  it('highlight false 关闭值高亮', () => {
    const resolved = mergeConfig(DEFAULT_CONFIG, { highlight: false })
    expect(resolved.highlight.enabled).toBe(false)
    expect(resolved.highlight.env).toBe('plain')
  })

  it('按模式覆盖 token', () => {
    const resolved = mergeConfig(DEFAULT_CONFIG, {
      highlight: { tokens: { light: { string: '#123456' } } },
    })
    expect(resolved.highlight.tokens.light.string).toBe('#123456')
    expect(resolved.highlight.tokens.dark.string).toBe('#ce9178')
  })

  it('后者覆盖前者', () => {
    const resolved = mergeConfig(DEFAULT_CONFIG, { icon: '📄' }, { icon: '🐳' })
    expect(resolved.icon).toEqual({ log: '🐳', info: '🐳', warn: '🐳', error: '🐳', debug: '🐳' })
  })
})

describe('toRuntimeOptions', () => {
  it('可 JSON 序列化且携带标签配置', () => {
    const runtime = toRuntimeOptions(mergeConfig(DEFAULT_CONFIG, { suffix: [{ type: 'time', glue: ' ' }] }))
    expect(JSON.parse(JSON.stringify(runtime))).toEqual(runtime)
    expect(runtime.prefix).toEqual(DEFAULT_PREFIX)
    expect(runtime.suffix).toEqual([{ type: 'time', glue: ' ' }])
    expect(runtime.icons).toEqual(DEFAULT_ICONS)
    expect(runtime.highlightValues).toBe(true)
  })
})

describe('shouldTransform', () => {
  it('node_modules 恒排除', () => {
    expect(shouldTransform('/proj/node_modules/x/index.js', mergeConfig(DEFAULT_CONFIG))).toBe(false)
  })

  it('默认包含常见扩展名', () => {
    const resolved = mergeConfig(DEFAULT_CONFIG)
    expect(shouldTransform('/proj/src/a.ts', resolved)).toBe(true)
    expect(shouldTransform('/proj/src/a.vue?vue&type=script', resolved)).toBe(true)
    expect(shouldTransform('/proj/src/a.css', resolved)).toBe(false)
  })

  it('叠加规则生效', () => {
    const resolved = mergeConfig(DEFAULT_CONFIG, { exclude: ['/generated/'] })
    expect(shouldTransform('/proj/generated/a.ts', resolved)).toBe(false)
  })
})

describe('deepEqual', () => {
  it('基本与嵌套比较', () => {
    expect(deepEqual({ a: [1, { b: /x/ }] }, { a: [1, { b: /x/ }] })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(deepEqual(new Date(1), new Date(1))).toBe(true)
  })
})

describe('getLineNumber', () => {
  it('按偏移计算行号', () => {
    expect(getLineNumber('a\nb\nc', 4)).toBe(3)
  })
})

describe('computeLineOffsets / lineAtOffset', () => {
  it('与 getLineNumber 逐偏移一致', () => {
    const code = 'a\nbb\n\nccc\r\nd\n'
    const offsets = computeLineOffsets(code)
    for (let index = 0; index < code.length; index++) {
      expect(lineAtOffset(offsets, index)).toBe(getLineNumber(code, index))
    }
  })

  it('覆盖首行、末行与单行文件', () => {
    const offsets = computeLineOffsets('console.log(1)')
    expect(lineAtOffset(offsets, 0)).toBe(1)
    expect(lineAtOffset(offsets, 13)).toBe(1)
    const multi = computeLineOffsets('a\nb\nc')
    expect([lineAtOffset(multi, 0), lineAtOffset(multi, 2), lineAtOffset(multi, 4)]).toEqual([1, 2, 3])
  })
})
