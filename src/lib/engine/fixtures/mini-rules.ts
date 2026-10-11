import type { RulePack } from '../types'

/** Minimal CHS-DRG-like pack for engine unit tests. */
export const miniRules: RulePack = {
  versionId: 'mini',
  name: 'mini-rules',
  mdcs: [
    { code: 'MDCA', name: '先期分组', ruleExpr: '', sort: 1 },
    { code: 'MDCF', name: '循环系统疾病', ruleExpr: 'ZYZD in DI_F00', sort: 2 },
  ],
  adrgs: [
    {
      code: 'FM3',
      name: '经皮冠状动脉支架植入',
      ruleExpr: 'ZYSS in OP_FM3',
      mdcCode: 'MDCA',
      sort: 1,
    },
    {
      code: 'FR1',
      name: '急性心肌梗死',
      ruleExpr: 'ZYZD in DI_F00',
      mdcCode: 'MDCF',
      sort: 1,
    },
  ],
  drgs: [
    {
      code: 'FM39',
      name: '经皮冠状动脉支架植入',
      ruleExpr: '',
      adrgCode: 'FM3',
      mdcCode: 'MDCA',
      sort: 1,
    },
    {
      code: 'FR19',
      name: '急性心肌梗死，不伴并发症或合并症',
      ruleExpr: '',
      adrgCode: 'FR1',
      mdcCode: 'MDCF',
      sort: 1,
    },
  ],
  sets: new Map([
    ['OP_FM3', new Set(['36.0601', '36.0700'])],
    ['DI_F00', new Set(['I21.001', 'I21.002'])],
  ]),
  setNames: new Map(),
  ccByCode: new Map([
    [
      'E11.9',
      {
        code: 'E11.9',
        name: '2型糖尿病不伴并发症',
        kind: 'CC',
        excludeSet: 'EX_E11',
      },
    ],
  ]),
  excludeSets: new Map([['EX_E11', new Set(['E11.9'])]]),
}
