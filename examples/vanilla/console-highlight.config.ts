import { defineConsoleHighlightConfig } from 'unplugin-console-highlight'

export default defineConsoleHighlightConfig({
  icon: '🚀',
  suffix: [{ type: 'tag', glue: ' ' }, { type: 'time', glue: ' ' }],
  highlight: {
    mode: 'auto',
    maxDepth: 5,
  },
})
