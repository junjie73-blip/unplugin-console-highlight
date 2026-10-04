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
    <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
      <form onSubmit={submit}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="新待办" />
        <button type="submit">添加</button>
      </form>
      <ul>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>
            {item}
            {' '}
            <button type="button" onClick={() => onRemove(index)}>删除</button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => console.debug('当前列表快照', items)}>
        打印快照
      </button>
    </section>
  )
}
