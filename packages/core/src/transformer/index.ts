import type {
  CallMeta,
  ConsoleMethod,
  LabelConfig,
  LabelContext,
  LabelSegment,
  LabelTemplate,
  ResolvedConsoleHighlightOptions,
} from '../types'
import path from 'node:path'
import MagicString from 'magic-string'
import { computeLineOffsets, lineAtOffset } from '../utils'
import { findConsoleCalls, findValueRefs } from './scanner'

/** 转换产物中引用的虚拟模块 ID */
export const VIRTUAL_MODULE_ID = 'virtual:console-highlight/runtime'
/** 虚拟模块内部使用的注入运行时 helper 名 */
export const HELPER_NAME = '__consoleHighlight'
/**
 * 注入源码的全局常量名。Vite 走 `define`，其余框架由转换阶段就地替换为 `true`，
 * 因此 webpack/rspack/rollup/esbuild/farm 下引用它不会抛 ReferenceError。
 */
export const GLOBAL_FLAG_NAME = '__CONSOLE_HIGHLIGHT__'
/** 全局常量替换后的字面量（Vite `define` 与转换阶段共用同一值） */
export const FLAG_VALUE = 'true'

export interface TransformResult {
  code: string
  map: ReturnType<MagicString['generateMap']>
}

export interface TransformContext {
  /** 模块 ID（可含 query） */
  id: string
  /** 项目根路径 */
  root: string
}

/**
 * 导入语句插入位置：shebang 之后、`"use strict"` 指令之后，否则文件开头。
 * 插入文本不含换行，因此产物行号与源码行号严格一致（sourcemap 关闭时同样成立）。
 */
export function findPreambleEnd(code: string): number {
  let index = 0
  if (code.startsWith('#!')) {
    const newline = code.indexOf('\n')
    if (newline < 0) {
      return code.length
    }
    index = newline + 1
  }
  // 跳过空行与注释，定位首条语句
  for (;;) {
    while (index < code.length && /\s/.test(code[index]!)) {
      index++
    }
    if (code.startsWith('/*', index)) {
      const end = code.indexOf('*/', index + 2)
      if (end < 0) {
        return index
      }
      index = end + 2
      continue
    }
    if (code.startsWith('//', index)) {
      const newline = code.indexOf('\n', index)
      if (newline < 0) {
        return index
      }
      index = newline + 1
      continue
    }
    break
  }
  const quote = code[index]
  if (quote !== '"' && quote !== '\'') {
    return index
  }
  let end = index + 1
  while (end < code.length && code[end] !== quote && code[end] !== '\n') {
    end += code[end] === '\\' ? 2 : 1
  }
  if (code.slice(index + 1, end) !== 'use strict' || code[end] !== quote) {
    return index
  }
  let after = end + 1
  while (after < code.length && (code[after] === ' ' || code[after] === '\t')) {
    after++
  }
  return code[after] === ';' ? after + 1 : after
}

function importStatement(): string {
  return `import { highlight as ${HELPER_NAME} } from ${JSON.stringify(VIRTUAL_MODULE_ID)};`
}

/**
 * 将代码中的 console 调用改写为
 * `console.<method>(...__consoleHighlight("<method>", <meta>, ...args))`，
 * 并在文件头部注入虚拟模块导入；同时把 `__CONSOLE_HIGHLIGHT__` 的值引用
 * 替换为 `true`（等价于 bundler 的 define，但不依赖框架能力）。
 * meta 携带文件/行号/函数名，供运行时渲染 prefix / suffix 标签。
 *
 * 改写只覆盖 `console.<method>(` 前缀并在调用末尾补一个 `)`，
 * 实参源码保持原样，配合 MagicString 生成 sourcemap，
 * 使断点、堆栈与调用点链接仍指向原始位置。
 */
export function transformCode(
  code: string,
  options: ResolvedConsoleHighlightOptions,
  context: TransformContext,
): TransformResult | null {
  const calls = findConsoleCalls(code, options.methods)
  const flagRefs = findValueRefs(code, GLOBAL_FLAG_NAME)
  if (calls.length === 0 && flagRefs.length === 0) {
    return null
  }

  const magicString = new MagicString(code)
  for (const ref of flagRefs) {
    magicString.update(ref.start, ref.end, FLAG_VALUE)
  }

  if (calls.length > 0) {
    const relFile = path
      .relative(context.root, context.id.split('?')[0]!)
      .replace(/\\/g, '/')

    const lineOffsets = computeLineOffsets(code)
    magicString.appendLeft(findPreambleEnd(code), importStatement())

    for (const call of calls) {
      const meta: CallMeta = {
        file: relFile,
        line: lineAtOffset(lineOffsets, call.start),
        fn: call.fn,
      }
      if (options.prefixFn || options.suffixFn) {
        const labelContext: LabelContext = {
          method: call.method as ConsoleMethod,
          file: meta.file,
          line: meta.line,
          fn: meta.fn,
        }
        if (options.prefixFn) {
          meta.prefix = normalizeLabelResult(options.prefixFn(labelContext))
        }
        if (options.suffixFn) {
          meta.suffix = normalizeLabelResult(options.suffixFn(labelContext))
        }
      }
      const callHead = `console.${call.method}${call.optional ? '?.' : ''}(`
      const helperHead = `${callHead}...${HELPER_NAME}(${JSON.stringify(call.method)}, ${JSON.stringify(meta)}`
      // 有实参时在参数前补分隔符，空参数调用不留悬空逗号
      magicString.update(
        call.start,
        call.argsStart,
        call.args === '' ? `${helperHead})` : `${helperHead}, `,
      )
      magicString.appendLeft(call.end, ')')
    }
  }

  return {
    code: magicString.toString(),
    map: magicString.generateMap({ hires: 'boundary', source: context.id }),
  }
}

function normalizeLabelResult(result: LabelTemplate | LabelSegment[]): LabelConfig {
  if (typeof result === 'string') {
    return result
  }
  if (Array.isArray(result)) {
    return result
  }
  return false
}
