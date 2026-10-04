import { useCallback, useEffect, useState } from 'react'
import TodoList from './components/TodoList.jsx'

export default function App() {
  const [items, setItems] = useState(['阅读文档', '跑通示例'])

  useEffect(() => {
    console.info('App 已挂载', { items: items.length })
  }, [])

  const addItem = useCallback((title) => {
    setItems(prev => [...prev, title])
    console.log('新增待办：', title)
  }, [])

  const removeItem = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
    console.warn('删除待办索引：', index)
  }, [])

  return (
    <main>
      <h1>React 19 示例</h1>
      <p>打开 DevTools 控制台：hooks、事件回调与子组件都会输出带色块标签的日志（suffix 为函数形式）。</p>
      <TodoList items={items} onAdd={addItem} onRemove={removeItem} />
    </main>
  )
}
