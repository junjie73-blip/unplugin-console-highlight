import type { ResolvedConsoleHighlightOptions } from '../src/types'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/config/default-config'
import { GLOBAL_FLAG_NAME, HELPER_NAME, transformCode, VIRTUAL_MODULE_ID } from '../src/transformer'
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

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function decodeVLQ(field: string): number[] {
  const out: number[] = []
  let shift = 0
  let value = 0
  for (const char of field) {
    const digit = B64.indexOf(char)
    value += (digit & 31) << shift
    if (digit & 32) {
      shift += 5
      continue
    }
    const negative = (value & 1) === 1
    value >>= 1
    out.push(negative ? -value : value)
    shift = 0
    value = 0
  }
  return out
}

/** 解出指定生成行的映射段：[生成列, 源行, 源列]（均为 0 基） */
function segmentsForLine(mappings: string, targetLine: number): number[][] {
  const result: number[][] = []
  let sourceLine = 0
  let sourceColumn = 0
  mappings.split(';').forEach((line, index) => {
    let generatedColumn = 0
    for (const field of line.split(',')) {
      if (!field) {
        continue
      }
      const parts = decodeVLQ(field)
      generatedColumn += parts[0]!
      if (parts.length >= 4) {
        sourceLine += parts[2]!
        sourceColumn += parts[3]!
      }
      if (index === targetLine) {
        result.push([generatedColumn, sourceLine, sourceColumn])
      }
    }
  })
  return result
}

describe('transformCode 行号与 sourcemap', () => {
  it('注入导入但不改变行数', () => {
    const code = 'const a = 1\nconsole.log(a)\nconst b = 2\nconsole.warn(b)\n'
    const result = transform(code)!
    expect(result.code.split('\n')).toHaveLength(code.split('\n').length)
  })

  it('shebang 保持在首个字节', () => {
    const code = '#!/usr/bin/env node\nconsole.log(1)\nconsole.warn(2)'
    const result = transform(code)!
    expect(result.code.startsWith('#!/usr/bin/env node\n')).toBe(true)
    expect(result.code.split('\n')[1]!.startsWith(`import { highlight as ${HELPER_NAME} }`)).toBe(true)
    expect(result.code.split('\n')).toHaveLength(code.split('\n').length)
  })

  it('"use strict" 仍是指令序言的首条语句', () => {
    const code = '"use strict";\nconsole.log(1)'
    const result = transform(code)!
    expect(result.code.startsWith('"use strict";import {')).toBe(true)
    expect(result.code.split('\n')).toHaveLength(code.split('\n').length)
  })

  it('注释、模板字符串前的导入插入不会破坏语法', () => {
    const code = '// header\nconsole.log(`a`)'
    const result = transform(code)!
    expect(result.code.split('\n')[0]).toBe('// header')
    expect(result.code.split('\n')[1]!.startsWith(`import { highlight as ${HELPER_NAME} }`)).toBe(true)
  })

  it('返回可映射回原始位置的 sourcemap', () => {
    const code = 'function f() {\n  console.log(payload, "x")\n}'
    const result = transform(code)!
    expect(result.map.sources).toEqual([CONTEXT.id])
    const generatedLines = result.code.split('\n')
    const genCol = generatedLines[1]!.indexOf('payload')
    const originalCol = code.split('\n')[1]!.indexOf('payload')
    const segments = segmentsForLine(result.map.mappings, 1).filter(([col]) => col <= genCol)
    expect(segments.length).toBeGreaterThan(0)
    const nearest = segments.reduce((a, b) => (a[0]! >= b[0]! ? a : b))
    // 实参源码未被改动，列偏移应保持 1:1
    expect(nearest[1]).toBe(1)
    expect(nearest[2]! + (genCol - nearest[0]!)).toBe(originalCol)
  })

  it('可选链调用保留 ?. 语义', () => {
    const result = transform('console.log?.(1)')!
    expect(result.code).toContain(`console.log?.(...${HELPER_NAME}("log", `)
  })

  it('计算成员归一化为点访问', () => {
    const result = transform('console["warn"](1)')!
    expect(result.code).toContain(`console.warn(...${HELPER_NAME}("warn", `)
  })

  it('空参数调用不产生悬空逗号', () => {
    const result = transform('console.log()')!
    expect(result.code).toContain(`${HELPER_NAME}("log", {"file":"src/log.ts","line":1,"fn":null}))`)
    expect(result.code).not.toContain(', ))')
  })

  it('多处调用的映射与行号一致', () => {
    const code = 'console.log(1)\n\n\nconsole.error(a,\n  b)\n'
    const result = transform(code)!
    expect(result.code.split('\n')).toHaveLength(code.split('\n').length)
    expect(result.code).toContain('"line":4')
  })
})

describe('transformCode 全局常量跨框架注入', () => {
  it('仅引用常量也会转换，且不需要运行时导入', () => {
    const result = transform(`if (${GLOBAL_FLAG_NAME}) {\n  boot()\n}`)!
    expect(result.code).toBe('if (true) {\n  boot()\n}')
    expect(result.code).not.toContain(VIRTUAL_MODULE_ID)
  })

  it('与调用改写共存时实参内的引用同样替换', () => {
    const result = transform(`if (${GLOBAL_FLAG_NAME}) console.log('x', ${GLOBAL_FLAG_NAME})`)!
    expect(result.code.startsWith(`import { highlight as ${HELPER_NAME} }`)).toBe(true)
    expect(result.code).toContain('if (true) console.log(...')
    expect(result.code).toContain('\'x\', true))')
  })

  it('字符串与对象键中的常量名保持原样', () => {
    const code = `const o = { ${GLOBAL_FLAG_NAME}: 1 }\nuse('${GLOBAL_FLAG_NAME}')`
    expect(transform(code)).toBeNull()
  })

  it('替换后行号与源码逐行对齐', () => {
    const code = `const a = 1\nif (${GLOBAL_FLAG_NAME}) console.log(a)\nconsole.log(b)`
    const result = transform(code)!
    expect(result.code.split('\n')).toHaveLength(3)
    expect(result.code).toContain('"line":2')
    expect(result.code).toContain('"line":3')
  })
})
