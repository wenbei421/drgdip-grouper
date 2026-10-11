import { normalizeCode } from './normalize'

export type RuleContext = {
  ZYZD?: string
  ZYSS?: string
  QTZD?: string[]
  QTSS?: string[]
  [key: string]: string | number | boolean | null | string[] | undefined
}

export interface EvalResult {
  value: boolean
  warnings: string[]
}

type Token =
  | { kind: 'ident'; value: string }
  | { kind: 'number'; value: number; raw: string }
  | { kind: 'op'; value: string }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'lbrace' }
  | { kind: 'rbrace' }
  | { kind: 'comma' }

type AstNode =
  | { type: 'ident'; name: string }
  | { type: 'number'; value: number }
  | { type: 'set'; members: string[] }
  | { type: 'unary'; op: 'not'; expr: AstNode }
  | { type: 'binary'; op: string; left: AstNode; right: AstNode }

const KEYWORDS = new Set(['and', 'or', 'not', 'in'])

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const ch = input[i]!

    if (/\s/.test(ch)) {
      i++
      continue
    }

    if (ch === '(') {
      tokens.push({ kind: 'lparen' })
      i++
      continue
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' })
      i++
      continue
    }
    if (ch === '{') {
      tokens.push({ kind: 'lbrace' })
      i++
      continue
    }
    if (ch === '}') {
      tokens.push({ kind: 'rbrace' })
      i++
      continue
    }
    if (ch === ',') {
      tokens.push({ kind: 'comma' })
      i++
      continue
    }

    if (ch === '>' || ch === '<' || ch === '=') {
      if ((ch === '>' || ch === '<') && input[i + 1] === '=') {
        tokens.push({ kind: 'op', value: ch + '=' })
        i += 2
      } else {
        tokens.push({ kind: 'op', value: ch })
        i++
      }
      continue
    }

    if (/[0-9]/.test(ch)) {
      let j = i + 1
      while (j < input.length && /[0-9.]/.test(input[j]!)) j++
      const raw = input.slice(i, j)
      const num = Number(raw)
      if (Number.isNaN(num)) throw new Error(`Invalid number: ${raw}`)
      tokens.push({ kind: 'number', value: num, raw })
      i = j
      continue
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1
      while (j < input.length && /[A-Za-z0-9_.]/.test(input[j]!)) j++
      const raw = input.slice(i, j)
      const lower = raw.toLowerCase()
      if (KEYWORDS.has(lower)) {
        tokens.push({ kind: 'op', value: lower })
      } else {
        tokens.push({ kind: 'ident', value: raw })
      }
      i = j
      continue
    }

    throw new Error(`Unexpected character: ${ch}`)
  }

  return tokens
}

class Parser {
  private pos = 0

  constructor(private tokens: Token[]) {}

  parse(): AstNode {
    if (this.tokens.length === 0) {
      throw new Error('Empty expression')
    }
    const node = this.parseOr()
    if (this.pos < this.tokens.length) {
      throw new Error('Unexpected trailing tokens')
    }
    return node
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private advance(): Token {
    const t = this.tokens[this.pos]
    if (!t) throw new Error('Unexpected end of expression')
    this.pos++
    return t
  }

  private parseOr(): AstNode {
    let left = this.parseAnd()
    while (this.peek()?.kind === 'op' && this.peek()!.value === 'or') {
      this.advance()
      const right = this.parseAnd()
      left = { type: 'binary', op: 'or', left, right }
    }
    return left
  }

  private parseAnd(): AstNode {
    let left = this.parseNot()
    while (this.peek()?.kind === 'op' && this.peek()!.value === 'and') {
      this.advance()
      const right = this.parseNot()
      left = { type: 'binary', op: 'and', left, right }
    }
    return left
  }

  private parseNot(): AstNode {
    if (this.peek()?.kind === 'op' && this.peek()!.value === 'not') {
      const next = this.tokens[this.pos + 1]
      // `not in` is a binary operator handled in parseComparison
      if (!(next?.kind === 'op' && next.value === 'in')) {
        this.advance()
        return { type: 'unary', op: 'not', expr: this.parseNot() }
      }
    }
    return this.parseComparison()
  }

  private parseComparison(): AstNode {
    const left = this.parsePrimary()
    const t = this.peek()

    if (t?.kind === 'op' && t.value === 'not') {
      const next = this.tokens[this.pos + 1]
      if (next?.kind === 'op' && next.value === 'in') {
        this.advance()
        this.advance()
        const right = this.parsePrimary()
        return { type: 'binary', op: 'not in', left, right }
      }
    }

    if (
      t?.kind === 'op' &&
      (t.value === 'in' ||
        t.value === '>=' ||
        t.value === '<=' ||
        t.value === '>' ||
        t.value === '<' ||
        t.value === '=')
    ) {
      this.advance()
      const right = this.parsePrimary()
      return { type: 'binary', op: t.value, left, right }
    }

    return left
  }

  private parsePrimary(): AstNode {
    const t = this.peek()
    if (!t) throw new Error('Unexpected end of expression')

    if (t.kind === 'lparen') {
      this.advance()
      const expr = this.parseOr()
      const close = this.advance()
      if (close.kind !== 'rparen') throw new Error('Expected )')
      return expr
    }

    if (t.kind === 'lbrace') {
      return this.parseSetLiteral()
    }

    if (t.kind === 'ident') {
      this.advance()
      return { type: 'ident', name: t.value }
    }

    if (t.kind === 'number') {
      this.advance()
      return { type: 'number', value: t.value }
    }

    throw new Error(`Unexpected token: ${t.kind}`)
  }

  private parseSetLiteral(): AstNode {
    this.advance() // {
    const members: string[] = []

    if (this.peek()?.kind === 'rbrace') {
      this.advance()
      return { type: 'set', members }
    }

    while (true) {
      const t = this.advance()
      if (t.kind === 'ident') {
        members.push(t.value)
      } else if (t.kind === 'number') {
        members.push(t.raw)
      } else {
        throw new Error('Expected set member')
      }

      const sep = this.peek()
      if (sep?.kind === 'comma') {
        this.advance()
        continue
      }
      if (sep?.kind === 'rbrace') {
        this.advance()
        break
      }
      throw new Error('Expected , or } in set literal')
    }

    return { type: 'set', members }
  }
}

function resolveSet(
  node: AstNode,
  sets: Map<string, Set<string>>,
): Set<string> {
  if (node.type === 'set') {
    return new Set(node.members.map(normalizeCode))
  }
  if (node.type === 'ident') {
    return sets.get(node.name) ?? new Set()
  }
  return new Set()
}

function isMember(
  left: string | string[],
  set: Set<string>,
): boolean {
  if (Array.isArray(left)) {
    return left.some((code) => {
      if (!code) return false
      return set.has(normalizeCode(code))
    })
  }
  if (!left) return false
  return set.has(normalizeCode(left))
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (!Number.isNaN(n)) return n
  }
  return null
}

function evalNode(
  node: AstNode,
  ctx: RuleContext,
  sets: Map<string, Set<string>>,
  warnings: string[],
): boolean | string | number | string[] | null {
  switch (node.type) {
    case 'number':
      return node.value

    case 'ident': {
      if (Object.prototype.hasOwnProperty.call(ctx, node.name)) {
        const v = ctx[node.name]
        if (v === undefined || v === null) return ''
        return v as string | number | boolean | string[]
      }
      warnings.push(`Unknown identifier: ${node.name}`)
      return null
    }

    case 'set':
      return [...node.members]

    case 'unary': {
      const v = evalNode(node.expr, ctx, sets, warnings)
      return !truthy(v)
    }

    case 'binary': {
      if (node.op === 'and') {
        const l = evalNode(node.left, ctx, sets, warnings)
        if (!truthy(l)) return false
        return truthy(evalNode(node.right, ctx, sets, warnings))
      }
      if (node.op === 'or') {
        const l = evalNode(node.left, ctx, sets, warnings)
        if (truthy(l)) return true
        return truthy(evalNode(node.right, ctx, sets, warnings))
      }

      if (node.op === 'in' || node.op === 'not in') {
        const leftVal = evalNode(node.left, ctx, sets, warnings)
        if (leftVal === null) {
          // unknown left identifier → membership false (rule forced false at top)
          return false
        }
        const set = resolveSet(node.right, sets)
        const codes =
          typeof leftVal === 'string' || Array.isArray(leftVal)
            ? leftVal
            : String(leftVal)
        const member = isMember(codes, set)
        return node.op === 'not in' ? !member : member
      }

      if (
        node.op === '>=' ||
        node.op === '<=' ||
        node.op === '>' ||
        node.op === '<' ||
        node.op === '='
      ) {
        const leftVal = evalNode(node.left, ctx, sets, warnings)
        const rightVal = evalNode(node.right, ctx, sets, warnings)
        const ln = toNumber(leftVal)
        const rn =
          typeof rightVal === 'number'
            ? rightVal
            : toNumber(rightVal)
        if (ln === null || rn === null) {
          warnings.push(`Cannot compare non-numeric values with ${node.op}`)
          return false
        }
        switch (node.op) {
          case '>=':
            return ln >= rn
          case '<=':
            return ln <= rn
          case '>':
            return ln > rn
          case '<':
            return ln < rn
          case '=':
            return ln === rn
        }
      }

      warnings.push(`Unknown operator: ${node.op}`)
      return false
    }
  }
}

function truthy(v: boolean | string | number | string[] | null): boolean {
  if (v === null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return v.length > 0
  if (Array.isArray(v)) return v.length > 0
  return Boolean(v)
}

/**
 * Evaluate an official DRG rule expression against a case context and code sets.
 * Parse/eval failures return `{ value: false, warnings }` and never throw.
 */
export function evaluateRule(
  expr: string,
  ctx: RuleContext,
  sets: Map<string, Set<string>>,
): EvalResult {
  const trimmed = expr.trim()
  if (trimmed === '') {
    return { value: true, warnings: [] }
  }

  const warnings: string[] = []
  try {
    const tokens = tokenize(trimmed)
    const ast = new Parser(tokens).parse()
    const result = evalNode(ast, ctx, sets, warnings)
    // Unknown identifiers make the rule false even if a unary/binary would flip
    if (warnings.some((w) => w.startsWith('Unknown identifier:'))) {
      return { value: false, warnings }
    }
    return { value: truthy(result), warnings }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { value: false, warnings: [`Parse error: ${msg}`] }
  }
}
