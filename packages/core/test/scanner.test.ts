import { describe, expect, it } from 'vitest'
import { findConsoleCalls } from '../src/transformer/scanner'

const ALL = ['log', 'info', 'warn', 'error', 'debug']

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
