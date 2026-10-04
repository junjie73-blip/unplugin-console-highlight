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
          light: ['#1890ff', '#52c41a', '#faad14', '#eb2f96'],
          dark: ['#1668dc', '#49aa19', '#d89614', '#c41d7f'],
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

<span style="background:#1890ff;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">🧩 App.vue·15 ~ onMounted</span> <span style="color:#a31515">"App 挂载完成"</span> {ready: true}

<span style="background:#52c41a;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">💡 App.vue·8 ~ logEnvironment</span> <span style="color:#a31515">"运行环境："</span> {ua: "…", cores: 16}

<span style="background:#faad14;color:#1f2328;padding:2px 6px;border-radius:4px;font-weight:600">🧩 CounterCard.vue·8 ~ increment</span> <span style="color:#a31515">"计数更新："</span> {count: 1}

要点：

- `.vue` SFC 与 `script setup` 宏函数（`onMounted` 回调）均能定位到函数名
- 模板内联箭头函数（`@ping`）归属为顶层，函数名片段自动省略
- 暗色 devtools 下自动切换暗色色板与 Dark+ token
