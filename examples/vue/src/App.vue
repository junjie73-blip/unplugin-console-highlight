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
    <p>打开 DevTools 控制台：setup / onMounted / 子组件事件都会输出带色块标签的日志。</p>
    <CounterCard @ping="(count: number) => console.debug('子组件事件 ping', count)" />
  </main>
</template>
