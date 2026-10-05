import { describe, expect, it } from 'vitest'
import { findConsoleCalls, findValueRefs } from '../src/transformer/scanner'

const ALL = ['log', 'info', 'warn', 'error', 'debug']
const FLAG = '__CONSOLE_HIGHLIGHT__'

function methods(code: string, methodsList: readonly string[] = ALL) {
  return findConsoleCalls(code, methodsList).map(call => call.method)
}

describe('findConsoleCalls 基础识别', () => {
  it('识别基本调用', () => {
    const calls = findConsoleCalls('console.log(\'a\', 1)', ALL)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ method: 'log', args: '\'a\', 1', fn: null })
  })

  it('支持空参数', () => {
    const calls = findConsoleCalls('console.log()', ALL)
    expect(calls[0]!.args).toBe('')
  })

  it('处理嵌套括号', () => {
    const calls = findConsoleCalls('console.log(fn(a, (b + c)), 2)', ALL)
    expect(calls[0]!.args).toBe('fn(a, (b + c)), 2')
  })

  it('忽略字符串中的括号', () => {
    const calls = findConsoleCalls('console.log("a)b", \'c(d)\')', ALL)
    expect(calls[0]!.args).toBe('"a)b", \'c(d)\'')
  })

  it('处理模板字符串插值', () => {
    const calls = findConsoleCalls('console.log(`v=${fn(1)}`, 2)', ALL)
    expect(calls[0]!.args).toBe('`v=${fn(1)}`, 2')
  })

  it('排除注释中的调用', () => {
    expect(methods('// console.log(1)\n/* console.warn(2) */\nconsole.info(3)')).toEqual(['info'])
  })

  it('识别正则字面量而不误判', () => {
    const calls = findConsoleCalls('const re = /console\\.log\\(/; console.log(re)', ALL)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.args).toBe('re')
  })

  it('排除成员访问形式的 console', () => {
    expect(methods('a.console.log(1); myconsole.log(2); console.log(3)')).toEqual(['log'])
  })

  it('排除非调用引用', () => {
    expect(methods('const f = console.log.bind(console); console.log(1)')).toEqual(['log'])
  })

  it('按 methods 配置过滤', () => {
    expect(methods('console.log(1); console.warn(2)', ['log'])).toEqual(['log'])
  })

  it('多个调用按顺序返回', () => {
    expect(methods('console.log(1); console.warn(2); console.error(3)')).toEqual(['log', 'warn', 'error'])
  })

  it('无 console. 时快速返回空', () => {
    expect(findConsoleCalls('const a = 1', ALL)).toEqual([])
  })
})

describe('findConsoleCalls 成员写法', () => {
  it('识别可选链成员与可选调用', () => {
    expect(methods('console?.log(1); console.log?.(2); console?.warn?.(3)')).toEqual(['log', 'log', 'warn'])
  })

  it('识别字符串计算成员', () => {
    expect(methods('console["log"](1); console[\'error\'](2)')).toEqual(['log', 'error'])
  })

  it('识别全局宿主前缀', () => {
    expect(methods('globalThis.console.log(1); window.console.error(2); self.console.warn(3)')).toEqual(['log', 'error', 'warn'])
  })

  it('拒绝非全局宿主与标识符粘连', () => {
    expect(methods('a.console.log(1); myconsole.log(2); app.window.console.log(3); console.log(4)')).toEqual(['log'])
  })

  it('optional 标记只在原写法带可选链时为真', () => {
    expect(findConsoleCalls('console.log?.(1)', ALL)[0]!.optional).toBe(true)
    expect(findConsoleCalls('console?.["debug"](1)', ALL)[0]!.optional).toBe(true)
    expect(findConsoleCalls('console.log(1)', ALL)[0]!.optional).toBe(false)
  })

  it('给出实参偏移，供定点改写使用', () => {
    const code = 'console.log( a , b )'
    const call = findConsoleCalls(code, ALL)[0]!
    expect(call.argsStart).toBe('console.log('.length)
    expect(call.argsEnd).toBe(code.length - 1)
    expect(call.args).toBe('a , b')
  })

  it('不改动含 console.log 的正则字面量', () => {
    expect(methods('const re = /console.log(x)/; console.info(re)')).toEqual(['info'])
  })

  it('忽略非字面量或含转义的计算成员', () => {
    expect(methods('console[method](1); console["\\log"](2); console.log(3)')).toEqual(['log'])
  })
})

describe('findConsoleCalls 函数名探测', () => {
  it('函数声明', () => {
    const calls = findConsoleCalls('function logMessage() {\n console.log(1)\n}', ALL)
    expect(calls[0]!.fn).toBe('logMessage')
  })

  it('箭头函数（带括号参数）', () => {
    const calls = findConsoleCalls('const arrow = (x) => { console.log(x) }', ALL)
    expect(calls[0]!.fn).toBe('arrow')
  })

  it('箭头函数（单参数无括号）', () => {
    const calls = findConsoleCalls('const braceless = x => console.log(x)', ALL)
    expect(calls[0]!.fn).toBe('braceless')
  })

  it('async 函数与 async 箭头', () => {
    const code = 'async function af() { console.log(1) }\nconst aa = async () => { console.log(2) }'
    const calls = findConsoleCalls(code, ALL)
    expect(calls.map(call => call.fn)).toEqual(['af', 'aa'])
  })

  it('class 方法', () => {
    const calls = findConsoleCalls('class A { m() { console.log(1) } }', ALL)
    expect(calls[0]!.fn).toBe('m')
  })

  it('对象方法简写', () => {
    const calls = findConsoleCalls('const o = { fn() { console.log(1) } }', ALL)
    expect(calls[0]!.fn).toBe('fn')
  })

  it('取最内层具名作用域', () => {
    const calls = findConsoleCalls('function outer() { function inner() { console.log(1) } }', ALL)
    expect(calls[0]!.fn).toBe('inner')
  })

  it('顶层作用域为 null', () => {
    const calls = findConsoleCalls('console.log(1)', ALL)
    expect(calls[0]!.fn).toBeNull()
  })

  it('if/for/while 不作为作用域', () => {
    const calls = findConsoleCalls('if (a) { for (let i = 0; i < 1; i++) { console.log(1) } }', ALL)
    expect(calls[0]!.fn).toBeNull()
  })

  it('匿名回调内仍归属外层具名函数', () => {
    const calls = findConsoleCalls('function outer() { arr.map(item => { console.log(item) }) }', ALL)
    expect(calls[0]!.fn).toBe('outer')
  })

  it('作用域结束后不再归属', () => {
    const calls = findConsoleCalls('function f() { console.log(1) }\nconsole.log(2)', ALL)
    expect(calls.map(call => call.fn)).toEqual(['f', null])
  })

  it('行号由转换层计算，扫描器给出起始偏移', () => {
    const calls = findConsoleCalls('const a = 1\nconsole.log(a)', ALL)
    expect(calls[0]!.start).toBe('const a = 1\n'.length)
  })
})

describe('findValueRefs 全局常量引用', () => {
  // 把识别到的引用替换为 true，便于按源码文本直接断言识别范围
  function replaced(code: string): string {
    let out = ''
    let cursor = 0
    for (const ref of findValueRefs(code, FLAG)) {
      out += `${code.slice(cursor, ref.start)}true`
      cursor = ref.end
    }
    return out + code.slice(cursor)
  }

  it('引用偏移指向完整标识符', () => {
    const code = `if (${FLAG}) {}`
    expect(findValueRefs(code, FLAG)).toEqual([{ start: 4, end: 4 + FLAG.length }])
    expect(replaced(code)).toBe('if (true) {}')
  })

  it('多处引用按出现顺序返回', () => {
    const code = `const a = ${FLAG};\nif (${FLAG}) {}`
    expect(findValueRefs(code, FLAG).map(ref => code.slice(ref.start, ref.end))).toEqual([FLAG, FLAG])
    expect(replaced(code)).toBe('const a = true;\nif (true) {}')
  })

  it('字符串、模板静态段、注释与正则内不算引用', () => {
    expect(replaced(`const s = '${FLAG}'`)).toBe(`const s = '${FLAG}'`)
    expect(replaced(`\`${FLAG}\``)).toBe(`\`${FLAG}\``)
    expect(replaced(`// ${FLAG}\n/* ${FLAG} */`)).toBe(`// ${FLAG}\n/* ${FLAG} */`)
    expect(replaced(`const re = /${FLAG}/`)).toBe(`const re = /${FLAG}/`)
  })

  it('模板插值内部按代码处理', () => {
    expect(replaced(`\`\${a}\``)).toBe(`\`\${a}\``)
    expect(replaced(`\`\${${FLAG}}\``)).toBe(`\`\${true}\``)
    expect(replaced(`\`x\${\`\${${FLAG}}\`}y\``)).toBe(`\`x\${\`\${true}\`}y\``)
  })

  it('成员属性不是引用', () => {
    expect(replaced(`window.${FLAG}`)).toBe(`window.${FLAG}`)
    expect(replaced(`a.b.${FLAG}`)).toBe(`a.b.${FLAG}`)
  })

  it('声明与赋值目标不是引用', () => {
    expect(replaced(`const ${FLAG} = true`)).toBe(`const ${FLAG} = true`)
    expect(replaced(`${FLAG} = false`)).toBe(`${FLAG} = false`)
    expect(replaced(`declare const ${FLAG}: boolean`)).toBe(`declare const ${FLAG}: boolean`)
  })

  it('对象与类型成员的键不是引用', () => {
    expect(replaced(`const o = { ${FLAG}: true }`)).toBe(`const o = { ${FLAG}: true }`)
    expect(replaced(`type T = { ${FLAG}?: boolean }`)).toBe(`type T = { ${FLAG}?: boolean }`)
    expect(replaced(`const o = { flag: ${FLAG} }`)).toBe('const o = { flag: true }')
  })

  it('简写属性与 import/export 说明符不是引用', () => {
    expect(replaced(`import { ${FLAG} } from 'x'`)).toBe(`import { ${FLAG} } from 'x'`)
    expect(replaced(`export { a, ${FLAG} }`)).toBe(`export { a, ${FLAG} }`)
  })

  it('标识符前后粘连不算引用', () => {
    expect(replaced(`const my${FLAG} = 1`)).toBe(`const my${FLAG} = 1`)
    expect(replaced(`${FLAG}x`)).toBe(`${FLAG}x`)
  })

  it('三元、可选链与逻辑运算中的引用照常识别', () => {
    expect(replaced(`${FLAG} ? 1 : 2`)).toBe('true ? 1 : 2')
    expect(replaced(`if (a && ${FLAG}) {}`)).toBe('if (a && true) {}')
    expect(replaced(`${FLAG}?.name`)).toBe('true?.name')
  })

  it('不含常量名的文件直接返回空数组', () => {
    expect(findValueRefs('console.log(\'a\')', FLAG)).toEqual([])
  })
})
