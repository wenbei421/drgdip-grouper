import { createMemoryHistory, createRouter } from 'vue-router'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', redirect: '/single' },
    { path: '/single', name: 'single', component: () => import('@/pages/single.vue') },
    { path: '/batch', name: 'batch', component: () => import('@/pages/batch.vue') },
    { path: '/compare', name: 'compare', component: () => import('@/pages/compare.vue') },
    { path: '/rules', name: 'rules', component: () => import('@/pages/rules.vue') },
  ],
})

export default router
