import type { ResolvedConsoleHighlightOptions } from '../src/types'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/config/default-config'
import { HELPER_NAME, transformCode, VIRTUAL_MODULE_ID } from '../src/transformer'
import { mergeConfig } from '../src/utils'

const CONTEXT = { id: 'src/log.ts', root: process.cwd() }

function transform(code: string, options: ResolvedConsoleHighlightOptions = mergeConfig(DEFAULT_CONFIG)) {
  return transformCode(code, options, CONTEXT)
}

describe('transformCode', () => {
  it('注入虚拟模块导入并包裹调用', () => {
    const result = transform('console.log(\'a\')')!
    expect(result.code.startsWith(`import { highlight as ${HELPER_NAME} } from "${VIRTUAL_MODULE_ID}";`)).toBe(true)
    expect(result.code).toContain(`console.log(...${HELPER_NAME}("log", {"file":"src/log.ts","line":1,"fn":null}, 'a'))`)
  })

  it('元信息携带行号与函数名', () => {
    const result = transform('function logMessage() {\n  console.warn(\'x\')\n}')!
    expect(result.code).toContain(`{"file":"src/log.ts","line":2,"fn":"logMessage"}`)
  })

  it('剥离模块 query 并转换为 posix 相对路径', () => {
    const result = transformCode('console.log(1)', mergeConfig(DEFAULT_CONFIG), {
      id: 'src/sub/mod.vue?vue&type=script',
      root: process.cwd(),
    })!
    expect(result.code).toContain('"file":"src/sub/mod.vue"')
  })

  it('保持参数顺序', () => {
    const result = transform('console.log(a, b, c)')!
    expect(result.code).toContain(`${HELPER_NAME}("log", {"file":"src/log.ts","line":1,"fn":null}, a, b, c)`)
  })

  it('覆盖全部方法', () => {
    const result = transform('console.log(1); console.info(2); console.warn(3); console.error(4); console.debug(5)')!
    for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
      expect(result.code).toContain(`${HELPER_NAME}("${method}",`)
    }
  })

  it('遵循 methods 配置', () => {
    const result = transform('console.log(1); console.warn(2)', mergeConfig(DEFAULT_CONFIG, { methods: ['log'] }))!
    expect(result.code).toContain(`${HELPER_NAME}("log",`)
    expect(result.code).toContain('console.warn(2)')
  })

  it('无匹配返回 null', () => {
    expect(transform('const a = 1')).toBeNull()
  })

  it('支持空参数调用', () => {
    const result = transform('console.log()')!
    expect(result.code).toContain(`${HELPER_NAME}("log", {"file":"src/log.ts","line":1,"fn":null})`)
  })

  it('单次导入服务多个调用', () => {
    const result = transform('console.log(1); console.warn(2)')!
    expect(result.code.match(new RegExp(`import \\{ highlight as ${HELPER_NAME} \\}`, 'g'))).toHaveLength(1)
  })

  it('不改动周边代码', () => {
    const result = transform('const a = 1\nconsole.log(a)\nconst b = 2')!
    expect(result.code).toContain('const a = 1\n')
    expect(result.code).toContain('\nconst b = 2')
  })

  it('函数形式 prefix 在构建期求值并写入 meta', () => {
    const options = mergeConfig(DEFAULT_CONFIG, {
      prefix: ctx => `[${ctx.method}] ${ctx.file}:${ctx.line} ${ctx.fn ?? 'top'}`,
    })
    const result = transformCode('function f() { console.log(1) }', options, CONTEXT)!
    expect(result.code).toContain('"prefix":"[log] src/log.ts:1 f"')
  })

  it('函数形式 suffix 在构建期求值并写入 meta', () => {
    const options = mergeConfig(DEFAULT_CONFIG, {
      suffix: ctx => [{ type: 'text', value: `@${ctx.fn ?? 'top'}`, glue: ' ' }],
    })
    const result = transformCode('console.log(1)', options, CONTEXT)!
    expect(result.code).toContain('"suffix":[{"type":"text"')
  })
})
