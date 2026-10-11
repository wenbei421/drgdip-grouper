export default {
  brand: {
    name: '分组预演工具',
    subtitle: 'DRG · DIP 3.0',
  },
  nav: {
    single: '单病例查询',
    batch: '批量预演',
    compare: '版本对比',
    rules: '规则管理',
  },
  topbar: {
    ruleVersion: '规则版本',
    ruleVersionPlaceholder: '尚未导入规则',
    ruleLoadFailed: '规则加载失败',
    locale: '简体中文',
  },
  sidebar: {
    offline: '离线模式 · 数据不出本机',
  },
  pages: {
    single: {
      inputTitle: '病例输入',
      resultTitle: '分组结果',
      loadSample: '载入示例',
      inputPlaceholder: '填写病例并执行分组预演',
      resultPlaceholder: '分组结果将显示在此',
      rulesNotReady: '请先在规则管理导入或等待内置规则初始化',
      runGroup: '执行分组预演',
    },
    batch: {
      empty: '后续版本提供',
    },
    compare: {
      empty: '后续版本提供',
    },
    rules: {
      title: '规则库版本',
      subtitle: '查看当前活动规则，或重新导入官方 Excel',
      empty: '尚未导入规则',
      emptyHint: '点击「重新导入」选择官方 CHS-DRG 3.0 xlsx 文件',
      loading: '正在加载规则…',
      loadFailed: '规则加载失败',
      reimport: '重新导入',
      importing: '导入中…',
      sourceFile: '来源文件',
      importedAt: '导入时间',
      statusReady: '当前使用',
      statusNotReady: '未就绪',
      loadedOk: '已加载 · 可分组',
      counts: {
        mdc: 'MDC',
        adrg: 'ADRG',
        drg: 'DRG',
        codeSets: '编码集合',
        cc: 'CC/MCC',
        excludeSets: '排除表',
      },
    },
  },
}
