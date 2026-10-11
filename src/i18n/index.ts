import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'

export default createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  legacy: false,
  globalInjection: true,
  messages: {
    'zh-CN': zhCN,
  },
})
