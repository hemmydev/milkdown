# Milkdown Developer Guide

Welcome to the comprehensive Milkdown developer guide! This guide provides in-depth documentation about Milkdown's architecture, design patterns, and workflows to help you understand and extend the editor.

## 📚 Guide Contents

### [01. Architecture Analysis](./01-architecture-analysis.md)
**Complete architectural overview of Milkdown**

- Project structure and package organization
- How Milkdown wraps ProseMirror and Remark
- Plugin system and lifecycle
- Core components (Ctx, Slice, CommandManager, etc.)
- Data flow diagrams
- Transformation pipeline (Markdown ↔ ProseMirror)

**Read this first** to understand how all pieces fit together.

---

### [02. Design Patterns Guide](./02-design-patterns.md)
**Core design patterns used throughout Milkdown**

- **Core Patterns**: Dependency Injection, Factory, Manager, Stack Machine
- **Plugin Patterns**: Composition, Extension, Conditional Loading
- **Schema Patterns**: Dual Specification, Priority System
- **Command Patterns**: Factory, Chain, Wrapper
- **State Management**: Immutability, Transaction Builder
- Best practices and code examples

**Use this** when building custom plugins, nodes, marks, or commands.

---

### [03. Workflow & Method Documentation](./03-workflow-and-methods.md)
**Complete editor workflows and API reference**

- Editor lifecycle from initialization to destruction
- Rendering pipeline (Markdown → Editor → DOM)
- Edit operation flow
- Command execution workflow
- Event system and listeners
- Complete API reference for all major methods
- Lifecycle hooks

**Refer to this** when working with the editor API or debugging workflows.

---

## 🚀 Quick Start Path

### For Understanding Milkdown:
1. Read **Architecture Analysis** → Understand the big picture
2. Read **Design Patterns** → Learn how to extend
3. Skim **Workflow & Methods** → Know what's available

### For Building Features:
1. Check **Design Patterns** → Find the right pattern
2. Check **Workflow & Methods** → Find the right API
3. Check **Architecture Analysis** → Understand dependencies

### For Debugging:
1. Check **Workflow & Methods** → Understand the flow
2. Check **Architecture Analysis** → Check data flow
3. Check **Design Patterns** → Verify pattern usage

---

## 🎯 Common Tasks

### Creating a Custom Node

**Reference**: [Design Patterns → Schema Patterns](./02-design-patterns.md#schema-patterns)

```typescript
import { $node } from '@milkdown/utils'

const customNode = $node('custom', () => ({
  content: 'block+',
  attrs: { id: { default: '' } },

  // ProseMirror spec (HTML/DOM)
  parseDOM: [{ tag: 'div.custom' }],
  toDOM: (node) => ['div', { class: 'custom' }, 0],

  // Markdown spec (remark AST)
  parseMarkdown: {
    match: node => node.type === 'custom',
    runner: (state, node, type) => {
      state.openNode(type)
      state.next(node.children)
      state.closeNode()
    }
  },
  toMarkdown: {
    match: node => node.type.name === 'custom',
    runner: (state, node) => {
      state.openNode('custom')
      state.next(node.content)
      state.closeNode()
    }
  }
}))
```

---

### Creating a Custom Command

**Reference**: [Design Patterns → Command Patterns](./02-design-patterns.md#command-patterns)

```typescript
import { $command, callCommand } from '@milkdown/utils'

const myCommand = $command('MyCommand', (ctx) => {
  return (payload) => (state, dispatch) => {
    if (dispatch) {
      const tr = state.tr.insertText(payload.text)
      dispatch(tr)
    }
    return true
  }
})

// Use
editor.action(callCommand('MyCommand', { text: 'Hello' }))
```

---

### Listening to Editor Changes

**Reference**: [Workflow & Methods → Event System](./03-workflow-and-methods.md#event-system)

```typescript
import { listener, listenerCtx } from '@milkdown/plugin-listener'

Editor.make()
  .use(listener)
  .config(ctx => {
    const listener = ctx.get(listenerCtx)

    listener.markdownUpdated((ctx, markdown) => {
      console.log('New markdown:', markdown)
    })
  })
```

---

### Getting/Setting Content

**Reference**: [Workflow & Methods → Actions API](./03-workflow-and-methods.md#actions-api)

```typescript
import { getMarkdown, setMarkdown } from '@milkdown/utils'

// Get markdown
const markdown = editor.action(getMarkdown())

// Set markdown
editor.action(setMarkdown('# New content'))
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Milkdown Editor                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────┐      ┌──────────────┐                 │
│  │  Plugin System │◄────►│  Ctx/DI      │                 │
│  │  - Internal    │      │  Container   │                 │
│  │  - User        │      └──────────────┘                 │
│  └────────────────┘                                        │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────────────────────────────┐               │
│  │    Transformation Layer                │               │
│  │  Markdown ↔ Remark ↔ PM Doc ↔ DOM    │               │
│  └────────────────────────────────────────┘               │
│         │                                                   │
│         ▼                                                   │
│  ┌────────────────────────────────────────┐               │
│  │      ProseMirror Core                  │               │
│  │  - EditorState (Schema, Doc)          │               │
│  │  - EditorView (DOM, Rendering)        │               │
│  └────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Concepts:**
- **Plugin-First**: Everything is a plugin
- **Dual Specs**: Nodes have both ProseMirror + Markdown specs
- **Dependency Injection**: No global state, isolated contexts
- **Immutable State**: All updates via transactions

---

## 🔑 Key Design Principles

### 1. Plugin-First Architecture
Everything in Milkdown is a plugin, including core functionality. This makes the system:
- **Modular**: Easy to add/remove features
- **Testable**: Each plugin is independently testable
- **Extensible**: Clean extension points at every layer

### 2. Lossless Markdown Conversion
Every node/mark has both ProseMirror and Markdown specifications, enabling:
- **Roundtrip Conversion**: Markdown → Editor → Markdown (no data loss)
- **Flexibility**: Customize HTML rendering without affecting Markdown
- **Interoperability**: Easy integration with markdown tools

### 3. Type-Safe Dependency Injection
Ctx and Slices provide:
- **Type Safety**: TypeScript ensures correct types
- **Isolation**: No global state, each plugin has its own context
- **Predictability**: Explicit dependencies via Timer system

### 4. Immutable State Management
All state updates go through transactions:
- **Predictability**: Clear, traceable state changes
- **Undo/Redo**: Built-in support via transaction history
- **Collaboration**: Easy to sync via transaction sharing

---

## 📦 Package Overview

| Package | Purpose | Key Exports |
|---------|---------|-------------|
| `@milkdown/core` | Editor class, plugin system | `Editor` |
| `@milkdown/ctx` | Dependency injection | `Ctx`, `Slice` |
| `@milkdown/prose` | ProseMirror wrapper | ProseMirror modules |
| `@milkdown/transformer` | Markdown ↔ PM | `Parser`, `Serializer` |
| `@milkdown/utils` | Plugin factories | `$node`, `$mark`, `$command` |
| `@milkdown/preset-commonmark` | CommonMark support | Standard markdown nodes/marks |
| `@milkdown/plugin-*` | Feature plugins | History, listener, UI, etc. |

---

## 🧪 Development Workflow

### 1. Setup Development Environment
```bash
# Clone repository
git clone https://github.com/Saul-Mirone/milkdown.git
cd milkdown

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Watch mode for development
pnpm watch
```

### 2. Create a Custom Package
```bash
# Create new package
mkdir packages/my-plugin
cd packages/my-plugin
pnpm init
```

### 3. Link to Example App
```bash
# In example app
pnpm link ../../packages/my-plugin

# Run example
pnpm dev
```

---

## 🐛 Debugging Tips

### Check Timer Status
```typescript
const clock = ctx.get(clockCtx)
console.log('Timer status:', clock.getStatus(MyTimer))
```

### Inspect Transactions
```typescript
view.dispatch = (tr) => {
  console.log('Transaction:', tr)
  console.log('Steps:', tr.steps)
  originalDispatch(tr)
}
```

### View Current Schema
```typescript
const schema = ctx.get(schemaCtx)
console.log('Nodes:', Object.keys(schema.nodes))
console.log('Marks:', Object.keys(schema.marks))
```

### Check Plugin Loading
```typescript
Editor.make()
  .use([
    plugin1,
    (ctx) => {
      console.log('Plugin loaded!')
      return async () => {
        console.log('Plugin running!')
      }
    }
  ])
```

---

## 📖 Additional Resources

### Official Documentation
- [Milkdown Official Docs](https://milkdown.dev)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
- [Remark Documentation](https://github.com/remarkjs/remark)

### Source Code
- [GitHub Repository](https://github.com/Saul-Mirone/milkdown)
- [Core Packages](../../packages/)
- [Example Apps](../../examples/)

### Community
- [GitHub Discussions](https://github.com/Saul-Mirone/milkdown/discussions)
- [Discord Server](https://discord.gg/milkdown)

---

## 🤝 Contributing

Found an issue or want to improve this guide?

1. Open an issue on GitHub
2. Submit a pull request
3. Join the discussion on Discord

---

## 📝 License

This guide is part of the Milkdown project and is licensed under MIT.

---

**Happy coding with Milkdown! 🥛⬇️**
