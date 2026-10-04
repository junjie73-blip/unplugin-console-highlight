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
import { getLineNumber } from '../utils'
import { findConsoleCalls } from './scanner'

/** 转换产物中引用的虚拟模块 ID */
export const VIRTUAL_MODULE_ID = 'virtual:console-highlight/runtime'
/** 虚拟模块内部使用的注入运行时 helper 名 */
export const HELPER_NAME = '__consoleHighlight'

export interface TransformResult {
  code: string
  map: null
}

export interface TransformContext {
  /** 模块 ID（可含 query） */
  id: string
  /** 项目根路径 */
  root: string
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

/**
 * 将代码中的 `console.<method>(...args)` 转换为
 * `console.<method>(...__consoleHighlight("<method>", <meta>, ...args))`，
 * 并在文件头部注入虚拟模块导入。
 * meta 携带文件/行号/函数名，供运行时渲染 prefix / suffix 标签。
 */
export function transformCode(
  code: string,
  options: ResolvedConsoleHighlightOptions,
  context: TransformContext,
): TransformResult | null {
  const calls = findConsoleCalls(code, options.methods)
  if (calls.length === 0) {
    return null
  }

  const relFile = path
    .relative(context.root, context.id.split('?')[0]!)
    .replace(/\\/g, '/')

  const chunks: string[] = []
  let cursor = 0
  for (const call of calls) {
    const meta: CallMeta = {
      file: relFile,
      line: getLineNumber(code, call.start),
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
    chunks.push(code.slice(cursor, call.start))
    chunks.push(
      `console.${call.method}(...${HELPER_NAME}(${JSON.stringify(call.method)}, ${JSON.stringify(meta)}${call.args ? `, ${call.args}` : ''}))`,
    )
    cursor = call.end
  }
  chunks.push(code.slice(cursor))

  const importStatement = `import { highlight as ${HELPER_NAME} } from ${JSON.stringify(VIRTUAL_MODULE_ID)};\n`

  return {
    code: importStatement + chunks.join(''),
    map: null,
  }
}
