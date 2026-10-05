---
pageType: home
hero:
  name: unplugin-console-highlight
  text: Location labels and syntax highlighting for your console output
  tagline: prefix / suffix labels · value syntax coloring · adapts to browser / terminal / plain text
  actions:
    - text: Quick Start
      link: /en/guide/quick-start
      theme: brand
    - text: Config Reference
      link: /en/config/options
      theme: alt
features:
  - title: Chip location labels
    details: A prefix chip shows "icon + file·line ~ function" by default. Place it before or after your arguments, and configure it as a template, a fragment array, or a function.
  - title: Value syntax coloring
    details: Strings, numbers, booleans, objects, Map / Set, and Error values are colored by type, with automatic light & dark color modes.
  - title: Adapts to every environment
    details: Browser, terminal, and plain-text CI output each use the styles they support. Objects stay expandable in devtools.
  - title: Multiple build tools
    details: Vite / Rollup / webpack / Rspack / esbuild / Farm work out of the box with the exact same configuration.
  - title: Strong type inference
    details: defineConsoleHighlightConfig preserves literal types, while InferMethods / InferIcons derive the union types for methods and icons.
  - title: Zero-config start
    details: Register the plugin and go. You get the default label and light & dark colors without changing how you call console.
---
