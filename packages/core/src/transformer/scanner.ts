/**
 * 字符串/注释/正则感知的 console 调用扫描器，并维护函数作用域栈
 * 以推导每个调用所在的 enclosing 函数名（用于标签的 function 片段）。
 */

export interface ConsoleCall {
  /** console 方法名（计算成员已归一化为标识符形式） */
  method: string
  /** 整个调用表达式的起始偏移（`console` 关键字处） */
  start: number
  /** 整个调用表达式的结束偏移（右括号之后） */
  end: number
  /** 实参列表源码（不含最外层括号） */
  args: string
  /** 左括号后第一个字符的偏移 */
  argsStart: number
  /** 右括号处的偏移（实参源码的结束位置） */
  argsEnd: number
  /** 原写法使用了可选链，改写后需保留 `?.` 调用语义 */
  optional: boolean
  /** 所在函数名；顶层作用域为 null */
  fn: string | null
}

interface Scope {
  name: string | null
  /** 作用域体开始前的花括号深度 */
  depth: number
  /** 无花括号箭身（`x => expr`）：由终止符结束 */
  braceless: boolean
  /** 刚推入的无花括号作用域等待确认下一个字符是否为 `{` */
  pendingBrace: boolean
}

const IDENT_RE = /[\w$]/
const CONTROL_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'with'])
const METHOD_MODIFIERS = new Set(['static', 'get', 'set', 'async', 'private', 'public', 'protected', 'readonly', 'override'])
/** `console` 允许的全局宿主前缀（`a.console.log` 之类的自定义对象不处理） */
const CONSOLE_HOSTS = new Set(['globalThis', 'window', 'self', 'global'])
const CONSOLE_HINT_RE = /console[.[?]/
const CONSOLE_KEYWORD = 'console'

function isRegexContext(lastSignificant: string): boolean {
  // 上一个有效字符处于这些情况时，`/` 更可能是正则字面量的开始
  return (
    lastSignificant === ''
    || '(,=:[!&|?{};+-*%~^<>'.includes(lastSignificant)
  )
}

/**
 * 扫描代码，返回所有 console 方法调用（按出现顺序），
 * 同时给出每个调用所在的函数名。
 */
export function findConsoleCalls(code: string, methods: readonly string[]): ConsoleCall[] {
  const calls: ConsoleCall[] = []
  if (!CONSOLE_HINT_RE.test(code)) {
    return calls
  }

  const methodSet = new Set(methods)
  const length = code.length
  const scopes: Scope[] = []
  let pendingScope: { name: string | null } | null = null
  let index = 0
  let braceDepth = 0
  let lastSignificant = ''
  let lastWord = ''

  const innermostName = (): string | null => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i]!.name) {
        return scopes[i]!.name
      }
    }
    return null
  }

  while (index < length) {
    const char = code[index]!

    // 行注释
    if (char === '/' && code[index + 1] === '/') {
      while (index < length && code[index] !== '\n') {
        index++
      }
      continue
    }
    // 块注释
    if (char === '/' && code[index + 1] === '*') {
      index += 2
      while (index < length && !(code[index] === '*' && code[index + 1] === '/')) {
        index++
      }
      index += 2
      continue
    }
    // 字符串与模板字符串（含 ${} 嵌套）
    if (char === '"' || char === '\'' || char === '`') {
      index = skipString(code, index)
      lastSignificant = 'x'
      lastWord = ''
      clearPending('x')
      continue
    }
    // 正则字面量
    if (char === '/' && isRegexContext(lastSignificant)) {
      const next = skipRegex(code, index)
      if (next > index) {
        index = next
        lastSignificant = 'x'
        lastWord = ''
        clearPending('x')
        continue
      }
    }

    // 花括号：确认待定的函数头 / 箭头体
    if (char === '{') {
      const top = scopes[scopes.length - 1]
      if (top?.pendingBrace) {
        top.braceless = false
        top.pendingBrace = false
      }
      else if (pendingScope) {
        scopes.push({ name: pendingScope.name, depth: braceDepth, braceless: false, pendingBrace: false })
        pendingScope = null
      }
      braceDepth++
      lastSignificant = char
      lastWord = ''
      index++
      continue
    }
    if (char === '}') {
      braceDepth--
      while (scopes.length > 0) {
        const top = scopes[scopes.length - 1]!
        if (top.braceless ? top.depth >= braceDepth : top.depth === braceDepth) {
          scopes.pop()
        }
        else {
          break
        }
      }
      lastSignificant = char
      lastWord = ''
      index++
      continue
    }
    // 无花括号箭身的终止符
    if (char === ';' || char === ',' || char === ')') {
      while (scopes.length > 0) {
        const top = scopes[scopes.length - 1]!
        if (top.braceless && top.depth === braceDepth) {
          scopes.pop()
        }
        else {
          break
        }
      }
      if (!/\s/.test(char)) {
        lastSignificant = char
        lastWord = ''
        clearPending(char)
      }
      index++
      continue
    }

    // 箭头函数：回溯命名
    if (char === '=' && code[index + 1] === '>') {
      const name = resolveArrowName(code, index)
      scopes.push({ name, depth: braceDepth, braceless: true, pendingBrace: true })
      lastSignificant = '>'
      lastWord = ''
      index += 2
      continue
    }

    if (char === 'c' && code.startsWith(CONSOLE_KEYWORD, index)) {
      // 排除 `myconsole.log`（标识符延续）与 `a.console.log`（非全局宿主）
      const next = code[index + CONSOLE_KEYWORD.length] ?? ''
      if (!IDENT_RE.test(next) && receiverAllowed(code, index)) {
        const call = tryMatchCall(code, index, methodSet)
        if (call) {
          call.fn = innermostName()
          calls.push(call)
          index = call.end
          lastSignificant = ')'
          lastWord = ''
          clearPending(')')
          continue
        }
      }
    }

    // 标识符：函数声明 / class / 方法简写 等作用域头
    if (IDENT_RE.test(char) && !isIdentContinuation(code, index)) {
      const wordEnd = readIdentEnd(code, index)
      const word = code.slice(index, wordEnd)
      const afterWord = skipWs(code, wordEnd)
      const afterChar = code[afterWord] ?? ''
      const prevWord = lastWord

      if (word === 'function') {
        const head = matchFunctionHead(code, afterWord)
        if (head) {
          pendingScope = { name: head.assignedName ?? head.name }
          index = head.bodyStart
          lastSignificant = ')'
          lastWord = word
          continue
        }
      }
      else if (word === 'class') {
        const bodyStart = findClassBody(code, afterWord)
        if (bodyStart >= 0) {
          const nameEnd = readIdentEnd(code, skipWs(code, afterWord))
          pendingScope = { name: code.slice(skipWs(code, afterWord), nameEnd) || null }
          index = bodyStart
          lastSignificant = 's'
          lastWord = word
          continue
        }
      }
      else if (word === 'async' && code.startsWith('function', afterWord)) {
        const head = matchFunctionHead(code, skipWs(code, afterWord + 8))
        if (head) {
          pendingScope = { name: head.assignedName ?? head.name }
          index = head.bodyStart
          lastSignificant = ')'
          lastWord = word
          continue
        }
      }
      else if (afterChar === '(' && !CONTROL_KEYWORDS.has(word)) {
        const close = matchParen(code, afterWord)
        if (close > 0) {
          const bodyStart = skipWs(code, close + 1)
          const prevChar = lastSignificant
          const isMethodShorthand = code[bodyStart] === '{'
            && (prevChar === '{' || prevChar === ',' || prevChar === ';' || prevChar === '' || METHOD_MODIFIERS.has(prevWord))
          if (isMethodShorthand) {
            pendingScope = { name: word }
            index = bodyStart
            lastSignificant = ')'
            lastWord = word
            continue
          }
        }
      }

      lastWord = word
      lastSignificant = char
      clearPending(char)
      index = wordEnd
      continue
    }

    if (!/\s/.test(char)) {
      lastSignificant = char
      clearPending(char)
    }
    index++
  }

  function clearPending(char: string): void {
    if (char === '{') {
      return
    }
    pendingScope = null
    const top = scopes[scopes.length - 1]
    if (top?.pendingBrace) {
      top.pendingBrace = false
    }
  }

  return calls
}

export interface IdentifierRef {
  start: number
  end: number
}

/** 其后的同名标识符是被声明者而非引用，不能替换 */
const DECL_KEYWORDS = new Set(['class', 'const', 'enum', 'function', 'import', 'interface', 'let', 'namespace', 'type', 'var'])

/**
 * 扫描处于「值引用」位置的标识符，供 define 式文本替换使用。
 * 忽略注释、字符串、正则字面量与成员属性；模板字符串的 `${}` 插值按代码递归处理。
 */
export function findValueRefs(code: string, name: string): IdentifierRef[] {
  const refs: IdentifierRef[] = []
  if (name !== '' && code.includes(name)) {
    collectValueRefs(code, 0, code.length, name, refs)
  }
  return refs
}

function collectValueRefs(code: string, from: number, to: number, name: string, refs: IdentifierRef[]): void {
  let index = from
  let lastSignificant = ''
  let prevWord = ''

  while (index < to) {
    const char = code[index]!

    if (char === '/' && code[index + 1] === '/') {
      index += 2
      while (index < to && code[index] !== '\n') {
        index++
      }
      continue
    }
    if (char === '/' && code[index + 1] === '*') {
      index += 2
      while (index < to && !(code[index] === '*' && code[index + 1] === '/')) {
        index++
      }
      index += 2
      continue
    }
    if (char === '"' || char === '\'' || char === '`') {
      if (char === '`') {
        const end = skipString(code, index)
        collectTemplateExpressions(code, index, Math.min(end, to), name, refs)
        index = end
      }
      else {
        index = skipString(code, index)
      }
      lastSignificant = 'x'
      prevWord = ''
      continue
    }
    if (char === '/' && isRegexContext(lastSignificant)) {
      const next = skipRegex(code, index)
      if (next > index) {
        index = next
        lastSignificant = 'x'
        prevWord = ''
        continue
      }
    }

    if (IDENT_RE.test(char) && !isIdentContinuation(code, index)) {
      const end = readIdentEnd(code, index)
      const word = code.slice(index, end)
      if (word === name && isValuePosition(code, index, end, prevWord, to)) {
        refs.push({ start: index, end })
      }
      prevWord = word
      lastSignificant = char
      index = end
      continue
    }

    if (!/\s/.test(char)) {
      lastSignificant = char
    }
    index++
  }
}

/** 模板字符串的 `${}` 插值内部是真实代码，逐段递归扫描 */
function collectTemplateExpressions(
  code: string,
  backtickAt: number,
  to: number,
  name: string,
  refs: IdentifierRef[],
): void {
  let index = backtickAt + 1
  while (index < to) {
    const char = code[index]!
    if (char === '\\') {
      index += 2
      continue
    }
    if (char === '$' && code[index + 1] === '{') {
      const exprEnd = Math.min(skipBraces(code, index + 1) - 1, to)
      collectValueRefs(code, index + 2, exprEnd, name, refs)
      index = exprEnd + 1
      continue
    }
    index++
  }
}

/**
 * 标识符是否可安全替换为字面量。排除：声明/关键字前导、赋值目标
 * （`X = 1`）、对象与类型成员的键（`X: 1` / `X?: T`）、
 * 简写属性与 import/export 说明符（`{ X, y }`）。
 */
function isValuePosition(
  code: string,
  start: number,
  end: number,
  prevWord: string,
  to: number,
): boolean {
  if (DECL_KEYWORDS.has(prevWord)) {
    return false
  }
  const nextAt = skipWs(code, end)
  const next = nextAt < to ? code[nextAt] : ''
  if (next === '=' && code[nextAt + 1] !== '=' && code[nextAt + 1] !== '>') {
    return false
  }
  if (next === ':') {
    return false
  }
  if (next === '?' && code[nextAt + 1] !== '.' && code[skipWs(code, nextAt + 1)] === ':') {
    return false
  }
  if (next === ',' || next === '}') {
    const before = skipWsBack(code, start - 1)
    const prev = before < 0 ? '' : code[before]
    if (prev === '{' || prev === ',') {
      return false
    }
  }
  return true
}

function isIdentContinuation(code: string, index: number): boolean {
  if (index === 0) {
    return false
  }
  const prev = code[index - 1]!
  return IDENT_RE.test(prev) || prev === '.'
}

function readIdentEnd(code: string, start: number): number {
  let index = start
  while (index < code.length && IDENT_RE.test(code[index]!)) {
    index++
  }
  return index
}

function skipWs(code: string, start: number): number {
  let index = start
  while (index < code.length && /\s/.test(code[index]!)) {
    index++
  }
  return index
}

function skipWsBack(code: string, start: number): number {
  let index = start
  while (index >= 0 && /\s/.test(code[index]!)) {
    index--
  }
  return index
}

function readIdentStart(code: string, end: number): number {
  let index = end
  while (index >= 0 && IDENT_RE.test(code[index]!)) {
    index--
  }
  return index + 1
}

function isPlainAssign(code: string, at: number): boolean {
  return code[at] === '=' && code[at + 1] !== '=' && code[at + 1] !== '>' && code[at - 1] !== '=' && code[at - 1] !== '>' && code[at - 1] !== '<' && code[at - 1] !== '!'
}

/**
 * 箭头函数命名：从 `=>` 回溯。
 * `const f = (...) =>` / `const f = x =>` 取 f；其余为匿名。
 */
function resolveArrowName(code: string, arrowAt: number): string | null {
  const p = skipWsBack(code, arrowAt - 1)
  if (p < 0) {
    return null
  }
  if (code[p] === ')') {
    const open = matchParenBack(code, p)
    if (open < 0) {
      return null
    }
    let q = skipWsBack(code, open - 1)
    if (q >= 0 && IDENT_RE.test(code[q]!)) {
      const identStart = readIdentStart(code, q)
      // `const f = async () =>`：跳过 async 关键字再找赋值号
      if (code.slice(identStart, q + 1) === 'async') {
        q = skipWsBack(code, identStart - 1)
      }
      else {
        return null
      }
    }
    if (q >= 0 && isPlainAssign(code, q)) {
      const nameEnd = skipWsBack(code, q - 1)
      const nameStart = readIdentStart(code, nameEnd)
      const name = code.slice(nameStart, nameEnd + 1)
      return name.length > 0 ? name : null
    }
    return null
  }
  if (IDENT_RE.test(code[p]!)) {
    const identStart = readIdentStart(code, p)
    const q = skipWsBack(code, identStart - 1)
    if (q >= 0 && isPlainAssign(code, q)) {
      const nameEnd = skipWsBack(code, q - 1)
      const nameStart = readIdentStart(code, nameEnd)
      const name = code.slice(nameStart, nameEnd + 1)
      return name.length > 0 ? name : null
    }
  }
  return null
}

/** 与 close 处 `)` 配对的 `(` 下标（向后扫描，启发式，不处理字符串内括号） */
function matchParenBack(code: string, close: number): number {
  let depth = 0
  for (let index = close; index >= 0; index--) {
    const char = code[index]
    if (char === ')') {
      depth++
    }
    else if (char === '(') {
      depth--
      if (depth === 0) {
        return index
      }
    }
  }
  return -1
}

interface FunctionHead {
  name: string | null
  assignedName: string | null
  bodyStart: number
}

/** 匹配 `(...) {` 形式的函数头，bodyStart 指向 `{` */
function matchFunctionHead(code: string, afterKeyword: number): FunctionHead | null {
  let index = afterKeyword
  let name: string | null = null
  if (IDENT_RE.test(code[index] ?? '')) {
    const end = readIdentEnd(code, index)
    name = code.slice(index, end)
    index = end
  }
  index = skipWs(code, index)
  if (code[index] !== '(') {
    return null
  }
  const close = matchParen(code, index)
  if (close < 0) {
    return null
  }
  const bodyStart = skipWs(code, close + 1)
  if (code[bodyStart] !== '{') {
    return null
  }
  return { name, assignedName: readAssignedNameBackward(code, afterKeyword), bodyStart }
}

/** `const f = function ...` / `const f = async function ...` 中的 f */
function readAssignedNameBackward(code: string, keywordAt: number): string | null {
  const q = skipWsBack(code, keywordAt - 1)
  if (q < 0) {
    return null
  }
  let assignAt = q
  if (code.slice(q - 5 >= 0 ? q - 5 : 0, q + 1).endsWith('async') && /\s/.test(code[q - 6] ?? ' ')) {
    assignAt = skipWsBack(code, q - 6)
  }
  if (!isPlainAssign(code, assignAt)) {
    return null
  }
  const nameEnd = skipWsBack(code, assignAt - 1)
  const nameStart = readIdentStart(code, nameEnd)
  const name = code.slice(nameStart, nameEnd + 1)
  return name.length > 0 ? name : null
}

/** 跳过 class 头（extends/implements/泛型），返回 `{` 下标；失败返回 -1 */
function findClassBody(code: string, start: number): number {
  let parenDepth = 0
  for (let index = start; index < code.length; index++) {
    const char = code[index]
    if (char === '(') {
      parenDepth++
    }
    else if (char === ')') {
      parenDepth--
    }
    else if (char === '{' && parenDepth === 0) {
      return index
    }
    else if (char === ';' && parenDepth === 0) {
      return -1
    }
    else if (char === '"' || char === '\'' || char === '`') {
      index = skipString(code, index) - 1
    }
  }
  return -1
}

function skipString(code: string, start: number): number {
  const quote = code[start]
  let index = start + 1
  while (index < code.length) {
    const char = code[index]
    if (char === '\\') {
      index += 2
      continue
    }
    if (quote === '`') {
      if (char === '$' && code[index + 1] === '{') {
        // 模板插值：按括号配对跳过（内部可能嵌套字符串）
        index = skipBraces(code, index + 1)
        continue
      }
      if (char === '`') {
        return index + 1
      }
    }
    else if (char === quote) {
      return index + 1
    }
    index++
  }
  return code.length
}

function skipBraces(code: string, start: number): number {
  let depth = 0
  let index = start
  while (index < code.length) {
    const char = code[index]
    if (char === '{') {
      depth++
    }
    else if (char === '}') {
      depth--
      if (depth === 0) {
        return index + 1
      }
    }
    else if (char === '"' || char === '\'' || char === '`') {
      index = skipString(code, index)
      continue
    }
    index++
  }
  return code.length
}

function skipRegex(code: string, start: number): number {
  let index = start + 1
  let inClass = false
  while (index < code.length) {
    const char = code[index]
    if (char === '\\') {
      index += 2
      continue
    }
    if (char === '[') {
      inClass = true
    }
    else if (char === ']') {
      inClass = false
    }
    else if (char === '/' && !inClass) {
      index++
      while (index < code.length && /[a-z]/.test(code[index]!)) {
        index++
      }
      return index
    }
    else if (char === '\n') {
      // 未闭合，说明不是正则（是除号）
      return start
    }
    index++
  }
  return start
}

/**
 * `console` 之前的接收者是否允许被改写。
 * 允许：非标识符前导（`(console.log`、`;console.log`）与全局宿主前缀
 * （`globalThis.console` / `window.console`）；拒绝 `myconsole`、`a.console`。
 */
function receiverAllowed(code: string, consoleAt: number): boolean {
  const p = consoleAt - 1
  if (p < 0) {
    return true
  }
  // 只看紧邻的前一个字符：换行/空白后的 `1\nconsole.log` 属于合法调用
  if (code[p] !== '.') {
    return !IDENT_RE.test(code[p]!)
  }
  const hostEnd = skipWsBack(code, p - 1)
  if (hostEnd < 0 || !IDENT_RE.test(code[hostEnd]!)) {
    return false
  }
  const hostStart = readIdentStart(code, hostEnd)
  if (!CONSOLE_HOSTS.has(code.slice(hostStart, hostEnd + 1))) {
    return false
  }
  // 宿主自身必须是顶层引用（`app.window.console` 不处理）
  const before = skipWsBack(code, hostStart - 1)
  return before < 0 || (code[before] !== '.' && !IDENT_RE.test(code[before]!))
}

function tryMatchCall(code: string, start: number, methodSet: Set<string>): ConsoleCall | null {
  let index = skipWs(code, start + CONSOLE_KEYWORD.length)

  // 成员访问：`.log` / `?.log` / `["log"]`
  let optional = false
  if (code.startsWith('?.', index)) {
    optional = true
    index = skipWs(code, index + 2)
  }
  else if (code[index] === '.') {
    index = skipWs(code, index + 1)
  }

  let method: string
  if (code[index] === '[') {
    const parsed = readComputedMethod(code, index, methodSet)
    if (!parsed) {
      return null
    }
    method = parsed.method
    index = parsed.after
  }
  else {
    const nameEnd = readIdentEnd(code, index)
    method = code.slice(index, nameEnd)
    if (!methodSet.has(method)) {
      return null
    }
    index = nameEnd
  }

  // 调用：`(...)` 或 `?.(...)`
  index = skipWs(code, index)
  if (code.startsWith('?.', index)) {
    optional = true
    index = skipWs(code, index + 2)
  }
  if (code[index] !== '(') {
    return null
  }
  const argsStart = index + 1
  const argsEnd = matchParen(code, index)
  if (argsEnd < 0) {
    return null
  }
  return {
    method,
    start,
    end: argsEnd + 1,
    args: code.slice(argsStart, argsEnd).trim(),
    argsStart,
    argsEnd,
    optional,
    fn: null,
  }
}

/** 解析 `console["log"]` 形式的计算成员，返回方法名与 `]` 之后的偏移 */
function readComputedMethod(
  code: string,
  bracketAt: number,
  methodSet: Set<string>,
): { method: string, after: number } | null {
  const quoteAt = skipWs(code, bracketAt + 1)
  const quote = code[quoteAt]
  if (quote !== '"' && quote !== '\'') {
    return null
  }
  const afterQuote = skipString(code, quoteAt)
  const raw = code.slice(quoteAt + 1, afterQuote - 1)
  // 含转义的方法名不做处理
  if (raw === '' || raw.includes('\\')) {
    return null
  }
  if (!methodSet.has(raw)) {
    return null
  }
  const bracketEnd = skipWs(code, afterQuote)
  if (code[bracketEnd] !== ']') {
    return null
  }
  return { method: raw, after: bracketEnd + 1 }
}

/** 返回与 start 处 `(` 配对的 `)` 下标，字符串/注释感知；失败返回 -1 */
function matchParen(code: string, start: number): number {
  let depth = 0
  let index = start
  while (index < code.length) {
    const char = code[index]
    if (char === '(') {
      depth++
    }
    else if (char === ')') {
      depth--
      if (depth === 0) {
        return index
      }
    }
    else if (char === '"' || char === '\'' || char === '`') {
      index = skipString(code, index)
      continue
    }
    else if (char === '/' && code[index + 1] === '/') {
      while (index < code.length && code[index] !== '\n') {
        index++
      }
      continue
    }
    else if (char === '/' && code[index + 1] === '*') {
      index += 2
      while (index < code.length && !(code[index] === '*' && code[index + 1] === '/')) {
        index++
      }
      index += 2
      continue
    }
    index++
  }
  return -1
}
