# 纯 JavaScript（Vite）示例

仓库内完整可运行示例：`examples/vanilla`。

```bash
pnpm install
pnpm build        # 先构建核心包
pnpm dev:vanilla  # 启动示例
```

## 配置

示例使用**独立配置文件**（展示 jiti 加载 TS 配置的能力）：

```ts [console-highlight.config.ts]
import { defineConsoleHighlightConfig } from 'unplugin-console-highlight'

export default defineConsoleHighlightConfig({
  icon: '🚀',
  suffix: [{ type: 'tag', glue: ' ' }, { type: 'time', glue: ' ' }],
  highlight: {
    mode: 'auto',
    maxDepth: 5,
  },
})
```

```js [vite.config.js]
import { vitePlugin } from 'unplugin-console-highlight'

export default {
  plugins: [vitePlugin()],
}
```

## 使用

```js [src/service.js]
export function createUserService() {
  const users = new Map([['u-1', { name: 'zy', role: 'admin' }]])

  class UserService {
    list() {
      console.log('用户列表', [...users.values()])
      return [...users.values()]
    }

    find(id) {
      const user = users.get(id)
      if (!user) {
        console.warn('用户不存在：', id)
        return null
      }
      console.debug('命中用户', user)
      return user
    }
  }

  const instance = new UserService()
  const reportError = (error) => {
    console.error('服务异常：', error)
  }

  instance.list()
  instance.find('u-404')
  reportError(new Error('demo failure'))

  return { stats: () => ({ size: users.size, ok: true }) }
}
```

## 效果

控制台输出（色块 + 后缀 tag/时间）：

<span style="background:#1890ff;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">🚀 service.js·6 ~ list</span> <span style="color:#a31515">"用户列表"</span> [{…}] <span style="color:#57606a">[LOG] 2026-10-04 23:30:00</span>

<span style="background:#faad14;color:#1f2328;padding:2px 6px;border-radius:4px;font-weight:600">🚀 service.js·13 ~ find</span> <span style="color:#a31515">"用户不存在："</span> <span style="color:#a31515">"u-404"</span> <span style="color:#57606a">[WARN] 2026-10-04 23:30:00</span>

<span style="background:#52c41a;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">🚀 service.js·21 ~ reportError</span> <span style="color:#a31515">"服务异常："</span> Error: demo failure <span style="color:#57606a">[ERROR] 2026-10-04 23:30:00</span>

要点：

- class 方法 `list` / `find`、箭头函数 `reportError` 均被正确识别为函数名片段
- 后缀展示方法标签与运行时间
- Map 展开、Error 摘要由运行时序列化完成
