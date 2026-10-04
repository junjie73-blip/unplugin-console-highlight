# React 19 示例

仓库内完整可运行示例：`examples/react`。

```bash
pnpm dev:react
```

## 配置

内联配置展示**函数形式 suffix**（构建期按调用点求值）：

```js [vite.config.js]
import react from '@vitejs/plugin-react'
import { vitePlugin } from 'unplugin-console-highlight'

export default {
  plugins: [
    react(),
    vitePlugin({
      prefix: [
        { type: 'icon' },
        { type: 'file', glue: ' ' },
        { type: 'line', glue: '·' },
        { type: 'function', glue: ' ~ ' },
      ],
      suffix: ctx => `‹${ctx.method}›`,
      label: { mode: 'chip', textColor: 'auto' },
    }),
  ],
}
```

## 使用

```jsx [src/App.jsx]
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
      <TodoList items={items} onAdd={addItem} onRemove={removeItem} />
    </main>
  )
}
```

```jsx [src/components/TodoList.jsx]
import { useState } from 'react'

export default function TodoList({ items, onAdd, onRemove }) {
  const [draft, setDraft] = useState('')

  const submit = (event) => {
    event.preventDefault()
    if (!draft.trim()) {
      console.error('待办标题不能为空')
      return
    }
    onAdd(draft.trim())
    setDraft('')
  }

  return (
    <section>
      {/* ...表单与列表... */}
      <button type="button" onClick={() => console.debug('当前列表快照', items)}>
        打印快照
      </button>
    </section>
  )
}
```

## 效果

<span style="background:#1890ff;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">📝 App.jsx·8 ~ useEffect</span> <span style="color:#a31515">"App 已挂载"</span> {items: 2} <span style="color:#57606a">‹info›</span>

<span style="background:#faad14;color:#1f2328;padding:2px 6px;border-radius:4px;font-weight:600">📝 App.jsx·13 ~ addItem</span> <span style="color:#a31515">"新增待办："</span> <span style="color:#a31515">"写文档"</span> <span style="color:#57606a">‹log›</span>

<span style="background:#52c41a;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">📝 TodoList.jsx·8 ~ submit</span> <span style="color:#a31515">"待办标题不能为空"</span> <span style="color:#57606a">‹error›</span>

要点：

- hooks 回调（`useEffect` / `useCallback`）被识别为函数名
- 事件处理函数 `submit`、JSX 内联箭头（归属顶层）均正确定位
- suffix 使用函数形式，构建期生成 `‹method›` 模板，运行期零开销
- StrictMode 双调用下标签与高亮表现一致
