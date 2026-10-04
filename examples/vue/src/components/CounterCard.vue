<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const history = ref<number[]>([])

const emit = defineEmits<{ ping: [count: number] }>()

function increment() {
  count.value += 1
  history.value.push(count.value)
  console.log('计数更新：', { count: count.value, history: history.value })
  emit('ping', count.value)
}

function reset() {
  console.warn('重置计数', count.value)
  count.value = 0
  history.value = []
}
</script>

<template>
  <section style="border: 1px solid #ddd; border-radius: 8px; padding: 16px">
    <h2>CounterCard：{{ count }}</h2>
    <button @click="increment">
      +1
    </button>
    <button @click="reset">
      重置
    </button>
  </section>
</template>
