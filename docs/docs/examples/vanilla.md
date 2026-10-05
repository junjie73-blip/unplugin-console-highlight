# 纯 JavaScript（Vite）示例

仓库内完整可运行示例：`examples/vanilla`。

```bash
pnpm install
pnpm build        # 构建插件，示例直接引用本地包
pnpm dev:vanilla  # 启动示例
```

## 配置

示例把配置写在**独立配置文件**里：

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

<span style="background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">🚀 service.js·6 ~ list</span> <span style="color:#1f2328">用户列表</span> [{…}] <span style="color:#57606a">[LOG] 2026-10-04 23:30:00</span>

<span style="background:#d97706;color:#ffffff;padding:2px 6px;border-radius:4px;font-weight:600">🚀 service.js·13 ~ find</span> <span style="color:#1f2328">用户不存在：</span> <span style="color:#a31515">"u-404"</span> <span style="color:#57606a">[WARN] 2026-10-04 23:30:00</span>

<span style="background:#059669;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">🚀 service.js·21 ~ reportError</span> <span style="color:#1f2328">服务异常：</span> Error: demo failure <span style="color:#57606a">[ERROR] 2026-10-04 23:30:00</span>

要点：

- class 方法 `list` / `find`、箭头函数 `reportError` 都能正确显示函数名
- 后缀同时给出方法标签与打印时刻
- Map 展开显示、Error 显示为 `名称: 消息`，正文「用户列表」这类首个字符串不带引号
