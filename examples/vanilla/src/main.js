import { createUserService } from './service.js'

console.log('vanilla 示例启动', { vite: true, framework: null })

function bootApp() {
  const config = { theme: 'dark', retries: 3, tags: ['demo', 'vanilla'] }
  console.info('启动配置：', config)
  return config
}

const service = createUserService()

document.querySelector('#trigger')?.addEventListener('click', () => {
  console.debug('按钮点击计数', service.stats())
})

bootApp()
