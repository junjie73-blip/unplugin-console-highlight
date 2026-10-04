import * as path from 'node:path';
import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'unplugin-console-highlight',
  description: '让 console 输出自带定位标签与语法高亮的 unplugin 插件',
  lang: 'zh-CN',
  outDir: 'doc_build',
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/introduction', activeMatch: '^/guide/' },
      { text: '配置', link: '/config/options', activeMatch: '^/config/' },
      { text: 'API', link: '/api/index', activeMatch: '^/api/' },
      { text: '示例', link: '/examples/vanilla', activeMatch: '^/examples/' },
      { text: '进阶', link: '/advanced/best-practices', activeMatch: '^/advanced/' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '介绍', link: '/guide/introduction' },
            { text: '安装', link: '/guide/install' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '前缀与后缀标签', link: '/guide/labels' },
            { text: '值高亮与亮暗模式', link: '/guide/highlight' },
            { text: '独立配置文件', link: '/guide/config-file' },
          ],
        },
      ],
      '/config/': [
        {
          text: '配置',
          items: [{ text: '配置项参考', link: '/config/options' }],
        },
      ],
      '/api/': [
        {
          text: 'API',
          items: [{ text: '导出与类型', link: '/api/index' }],
        },
      ],
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: '纯 JavaScript（Vite）', link: '/examples/vanilla' },
            { text: 'Vue 3', link: '/examples/vue' },
            { text: 'React 19', link: '/examples/react' },
          ],
        },
      ],
      '/advanced/': [
        {
          text: '进阶',
          items: [
            { text: '最佳实践', link: '/advanced/best-practices' },
            { text: '常见问题', link: '/advanced/faq' },
            { text: '迁移指南', link: '/advanced/migration' },
          ],
        },
      ],
    },
    outline: {
      label: '本页目录',
    },
    lastUpdated: true,
    searchPlaceholder: '搜索文档',
  },
});
