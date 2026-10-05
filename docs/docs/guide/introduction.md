# 介绍

`unplugin-console-highlight` 给每一条 `console` 输出自动加上**定位标签**和**着色正文**，
让日志在浏览器 DevTools、终端、CI 输出里都能一眼看出「谁、在哪、打了什么」。
不需要修改任何调用写法，注册插件即可获得效果。

## 效果一览

浏览器 DevTools（devtools 为亮色时自动使用亮色配色，暗色同理）：

<span style="background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">📝 log.ts·4 ~ logMessage</span> <span style="color:#1f2328">Hello TypeScript</span>

<span style="background:#d97706;color:#ffffff;padding:2px 6px;border-radius:4px;font-weight:600">📝 logjs.js·4 ~ logMessage</span> <span style="color:#1f2328">Hello JavaScript</span>

<span style="background:#059669;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">📝 App.vue·6 ~ message</span> <span style="color:#1f2328">Hello Vue</span>

终端（真彩色，色块标签 + 着色正文）：

```text
📝 log.ts·4 ~ logMessage Hello TypeScript
```

## 核心能力

| 能力 | 你能得到什么 |
| --- | --- |
| prefix / suffix 标签 | 图标、文件名、路径、行号、函数名、时间、方法标签自由组合，放在参数之前或之后 |
| 自动定位 | 每条日志自动带上所在文件、行号与函数名（箭头函数、class 方法、对象方法、hooks 回调均可） |
| 正文着色 | 字符串 / 数字 / 布尔 / 键名 / 函数 / Date / RegExp / Error 分色显示；对象在浏览器里仍可展开 |
| 亮 / 暗模式 | 默认跟随系统主题，浏览器切换主题即时生效，无需刷新 |
| 三端一致 | 浏览器、终端、CI 纯文本同一份代码，自动选择可用样式，不会产生乱码 |
| 多构建工具 | Vite / Rollup / webpack / Rspack / esbuild / Farm，配置写法完全一致 |
| 与手写样式共存 | 你自己写的 `%c` 样式串照常生效，普通文本里的 `%` 也不会吞掉后面的参数 |

## 适用与不适用

**适合**：本地调试、Node 脚本与 SSR 输出、需要留痕的 CI 日志、给团队统一日志格式。

**默认不会处理以下写法**（需要显式改写为常规调用才有效果）：

```js
const log = console.log   // ✘ 先把方法存进变量再调用
log(1)
console[method](1)        // ✘ 方法名是变量
logger.info(1)            // ✘ 自定义 logger
```

以下写法都会正常出现标签：

```js
console.log(1)              // ✔
console?.log(1)             // ✔
console.log?.(1)            // ✔
console["warn"](1)          // ✔
globalThis.console.error(1) // ✔ window / self / global 前缀同样支持
```

## 下一步

- [安装](/guide/install)：安装依赖并注册到构建工具
- [快速开始](/guide/quick-start)：三步看到第一条带标签的日志
- [配置项参考](/config/options)：全部配置项与默认值
- [常见问题](/advanced/faq)：标签没出现、终端没颜色等排查路径
