# Vue 3 示例

仓库内完整可运行示例：`examples/vue`。

```bash
pnpm dev:vue
```

## 配置

内联配置展示**按方法定制图标**与**按模式定制色板**：

```ts [vite.config.ts]
import vue from '@vitejs/plugin-vue'
import { vitePlugin } from 'unplugin-console-highlight'

export default {
  plugins: [
    vue(),
    vitePlugin({
      icon: {
        log: '🧩',
        info: '💡',
        warn: '⚠️',
        error: '🔥',
        debug: '🐞',
      },
      label: {
        mode: 'chip',
        palette: {
          light: ['#2563eb', '#059669', '#d97706', '#e11d48'],
          dark: ['#60a5fa', '#34d399', '#fbbf24', '#fb7185'],
        },
      },
    }),
  ],
}
```

## 使用

```vue [src/App.vue]
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CounterCard from './components/CounterCard.vue'

const ready = ref(false)

function logEnvironment() {
  console.info('运行环境：', { ua: navigator.userAgent.slice(0, 40), cores: navigator.hardwareConcurrency })
}

onMounted(() => {
  ready.value = true
  console.log('App 挂载完成', { ready: ready.value })
  console.log('%c👋 手写格式串与插件标签共存', 'color:#0d9488;font-weight:bold;font-size:14px;')
  console.log('百分号 100% 不会被当成格式指令')
  logEnvironment()
})
</script>

<template>
  <main>
    <h1>Vue 3 示例</h1>
    <CounterCard @ping="(count: number) => console.debug('子组件事件 ping', count)" />
  </main>
</template>
```

```vue [src/components/CounterCard.vue]
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)

function increment() {
  count.value += 1
  console.log('计数更新：', { count: count.value })
}
</script>

<template>
  <section>
    <h2>CounterCard：{{ count }}</h2>
    <button @click="increment">+1</button>
  </section>
</template>
```

## 效果

<span style="background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">🧩 App.vue·15 ~ onMounted</span> <span style="color:#1f2328">App 挂载完成</span> {ready: true}

<span style="background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">🧩 App.vue·16 ~ onMounted</span> <span style="color:#0d9488;font-weight:bold">👋 手写格式串与插件标签共存</span>

<span style="background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">🧩 App.vue·17 ~ onMounted</span> <span style="color:#1f2328">百分号 100% 不会被当成格式指令</span>

<span style="background:#059669;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">💡 App.vue·8 ~ logEnvironment</span> <span style="color:#1f2328">运行环境：</span> {ua: "…", cores: 16}

<span style="background:#d97706;color:#ffffff;padding:2px 6px;border-radius:4px;font-weight:600">🧩 CounterCard.vue·8 ~ increment</span> <span style="color:#1f2328">计数更新：</span> {count: 1}

要点：

- `.vue` 单文件组件与 `script setup` 里的回调都能定位到函数名
- 模板内联箭头函数（`@ping`）归属为顶层，函数名片段自动省略
- 自己写的 `%c` 样式照常生效，插件只在它前面加标签，不会漏出裸 `%c` 或样式串
- 正文里的 `%`（如 `100%`）不会被当成格式指令
- 暗色 DevTools 下自动切换暗色色板与暗色配色
