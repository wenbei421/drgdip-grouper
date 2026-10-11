/** 将官方规则表达式改写成便于阅读的中文说明（保留集合编号）。 */
export function formatRuleZh(expr: string): string {
  const trimmed = expr.trim()
  if (!trimmed) return '无额外条件'

  return trimmed
    .replace(/\bnot\s+in\b/gi, '不属于')
    .replace(/\bin\b/gi, '属于')
    .replace(/\band\b/gi, '且')
    .replace(/\bor\b/gi, '或')
    .replace(/\bnot\b/gi, '非')
    .replace(/\bZYZD\b/g, '主诊断')
    .replace(/\bQTZD\b/g, '其他诊断')
    .replace(/\bZYSS\b/g, '主手术')
    .replace(/\bQTSS\b/g, '其他手术')
    .replace(/\bNL\b/g, '年龄')
    .replace(/\bXB\b/g, '性别')
    .replace(/\bXSRTL\b/g, '新生儿日龄')
    .replace(/\bXSRTZ\b/g, '新生儿体重')
}

export function formatBoolZh(hit: boolean): string {
  return hit ? '命中' : '未命中'
}
