---
pageType: home
hero:
  name: unplugin-console-highlight
  text: 让 console 输出自带定位标签与语法高亮
  tagline: prefix / suffix 标签 · 值语法着色 · 浏览器 / 终端 / 纯文本三端自适应
  actions:
    - text: 快速开始
      link: /guide/quick-start
      theme: brand
    - text: 配置参考
      link: /config/options
      theme: alt
features:
  - title: 定位色块标签
    details: 默认前缀色块展示「图标 + 文件·行号 ~ 函数名」，支持 prefix / suffix 双位置，模板、片段、函数三种配置形态。
  - title: 值语法着色
    details: 字符串、数字、布尔、对象、Map / Set、Error 等按类型着色，亮色 / 暗色模式自动适配。
  - title: 三端环境自适应
    details: 浏览器、终端、CI 纯文本自动切换可用样式；对象在 devtools 中仍保留可展开性。
  - title: 多构建工具支持
    details: Vite / Rollup / webpack / Rspack / esbuild / Farm 开箱即用，配置写法完全一致。
  - title: 强类型推导
    details: defineConsoleHighlightConfig 保留字面量类型，InferMethods / InferIcons 可推导方法与图标联合类型。
  - title: 零配置起步
    details: 注册插件即可使用，默认「图标 + 文件·行号 ~ 函数名」标签与亮暗自动配色，不改动任何调用写法。
---
