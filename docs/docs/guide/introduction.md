# 介绍

`unplugin-console-highlight` 是一个构建期 console 转换插件：在打包时为每个 `console.*` 调用注入**定位标签**（前缀 / 后缀）与**运行时值高亮**，让日志在浏览器 devtools、终端、CI 日志中都清晰可读。

## 效果一览

浏览器 DevTools（亮色 devtools 下自动使用亮色 token，暗色同理）：

<span style="background:#1890ff;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">📝 log.ts·4 ~ logMessage</span> <span style="color:#a31515">"Hello TypeScript"</span>

<span style="background:#faad14;color:#1f2328;padding:2px 6px;border-radius:4px;font-weight:600">📝 logjs.js·4 ~ logMessage</span> <span style="color:#a31515">"Hello JavaScript"</span>

<span style="background:#52c41a;color:#fff;padding:2px 6px;border-radius:4px;font-weight:600">📝 App.vue·6 ~ message</span> <span style="color:#a31515">"Hello Vue"</span>

终端（24-bit ANSI，色块 + 语法高亮）：

```text
📝 log.ts·4 ~ logMessage "Hello TypeScript"   ← 实际输出带 ANSI 背景色与 token 颜色
```

## 核心能力

| 能力                 | 说明                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------- |
| prefix / suffix 标签 | 图标、文件名、行号、函数名、时间、方法标签等片段自由组合，插入到参数之前或之后           |
| 自动定位             | 构建期扫描调用点，自动计算相对路径、行号与所在函数名（含箭头函数、class 方法、对象方法） |
| 值高亮               | 原始值按 token 着色；对象在浏览器中保留 `%o` 原生可展开展示                              |
| 亮 / 暗模式          | `auto` 跟随系统偏好（浏览器）或终端默认暗色；token 与标签色板均按模式切换                |
| 环境自适应           | 浏览器 `%c` CSS、终端 ANSI、其他环境纯文本降级，同一份产物三端通用                       |
| 多构建工具           | Vite / Rollup / webpack / Rspack / esbuild / Farm                                        |

## 工作原理

1. **构建期**：插件扫描源码中的 `console.*` 调用（字符串 / 注释 / 正则感知），将调用改写为
   `console.log(...__consoleHighlight("log", { file, line, fn }, ...args))`，
   并注入一个虚拟模块导入。
2. **注入运行时**：虚拟模块加载零依赖 IIFE 运行时与按当前配置序列化后的选项。
3. **运行期**：运行时探测环境（浏览器 / 终端 / 纯文本）与配色模式（亮 / 暗），
   把标签渲染为色块或 ANSI，把原始值渲染为着色片段或保留原生展示。

