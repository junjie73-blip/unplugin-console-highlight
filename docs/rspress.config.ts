import * as path from 'node:path';
import { defineConfig } from '@rspress/core';

const zhNav = [
  { text: '指南', link: '/guide/introduction', activeMatch: '^/guide/' },
  { text: '配置', link: '/config/options', activeMatch: '^/config/' },
  { text: 'API', link: '/api/index', activeMatch: '^/api/' },
  { text: '示例', link: '/examples/vanilla', activeMatch: '^/examples/' },
  { text: '进阶', link: '/advanced/best-practices', activeMatch: '^/advanced/' },
];

const zhSidebar = {
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
};

const enNav = [
  { text: 'Guide', link: '/en/guide/introduction', activeMatch: '^/en/guide/' },
  { text: 'Config', link: '/en/config/options', activeMatch: '^/en/config/' },
  { text: 'API', link: '/en/api/index', activeMatch: '^/en/api/' },
  { text: 'Examples', link: '/en/examples/vanilla', activeMatch: '^/en/examples/' },
  { text: 'Advanced', link: '/en/advanced/best-practices', activeMatch: '^/en/advanced/' },
];

const enSidebar = {
  '/en/guide/': [
    {
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/en/guide/introduction' },
        { text: 'Installation', link: '/en/guide/install' },
        { text: 'Quick Start', link: '/en/guide/quick-start' },
        { text: 'Prefix & Suffix Labels', link: '/en/guide/labels' },
        { text: 'Value Coloring & Color Modes', link: '/en/guide/highlight' },
        { text: 'Standalone Config File', link: '/en/guide/config-file' },
      ],
    },
  ],
  '/en/config/': [
    {
      text: 'Config',
      items: [{ text: 'Options Reference', link: '/en/config/options' }],
    },
  ],
  '/en/api/': [
    {
      text: 'API',
      items: [{ text: 'Exports & Types', link: '/en/api/index' }],
    },
  ],
  '/en/examples/': [
    {
      text: 'Examples',
      items: [
        { text: 'Vanilla JavaScript (Vite)', link: '/en/examples/vanilla' },
        { text: 'Vue 3', link: '/en/examples/vue' },
        { text: 'React 19', link: '/en/examples/react' },
      ],
    },
  ],
  '/en/advanced/': [
    {
      text: 'Advanced',
      items: [
        { text: 'Best Practices', link: '/en/advanced/best-practices' },
        { text: 'FAQ', link: '/en/advanced/faq' },
        { text: 'Migration Guide', link: '/en/advanced/migration' },
      ],
    },
  ],
};

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  base: '/unplugin-console-highlight/',
  title: 'unplugin-console-highlight',
  description: '让 console 输出自带定位标签与语法高亮的 unplugin 插件',
  // 默认语言为中文，文档位于 docs/ 根目录；英文文档位于 docs/en/
  lang: 'zh',
  i18nSourcePath: path.join(__dirname, 'i18n.json'),
  themeConfig: {
    nav: zhNav,
    sidebar: zhSidebar,
    locales: [
      {
        lang: 'zh',
        label: '简体中文',
      },
      {
        lang: 'en',
        label: 'English',
        description: 'Console labels and syntax highlighting for every build tool',
        nav: enNav,
        sidebar: enSidebar,
      },
    ],
    lastUpdated: true,
    searchPlaceholder: '搜索文档',
  },
});
