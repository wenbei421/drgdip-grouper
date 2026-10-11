import { describe, expect, it } from 'vitest'
import { normalizeCode } from './normalize'

describe('normalizeCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeCode(' i21.0 ')).toBe('I21.0')
  })
  it('keeps extension segment', () => {
    expect(normalizeCode('36.0700x004')).toBe('36.0700X004')
  })
})
