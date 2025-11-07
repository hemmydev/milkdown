# Milkdown Architecture Analysis

## Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [ProseMirror & Remark Integration](#prosemirror--remark-integration)
4. [Plugin System](#plugin-system)
5. [Data Flow](#data-flow)
6. [Key Components](#key-components)

---

## Overview

Milkdown is a **plugin-first WYSIWYG markdown editor** that combines the power of ProseMirror (for rich-text editing) and Remark (for markdown processing). Its architecture is built on three core principles:

1. **Plugin-First Design**: Everything is a plugin with a predictable lifecycle
2. **Dual Specification System**: Every node/mark has both ProseMirror and Markdown specs for lossless conversion
3. **Dependency Injection**: No global state; each component gets its own isolated context

### Core Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Milkdown Editor                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │   Plugins    │──────│  Ctx/DI      │                   │
│  │   System     │      │  Container   │                   │
│  └──────────────┘      └──────────────┘                   │
│         │                      │                           │
│         ├─ Internal Plugins (10)                          │
│         │  ├─ config                                      │
│         │  ├─ init                                        │
│         │  ├─ schema ────────┐                            │
│         │  ├─ parser         │                            │
│         │  ├─ serializer     │                            │
│         │  ├─ commands       │                            │
│         │  ├─ keymap         │                            │
│         │  ├─ editorState    │                            │
│         │  ├─ editorView     │                            │
│         │  └─ pasteRule      │                            │
│         │                     │                            │
│         └─ User Plugins       │                            │
│                               │                            │
│  ┌────────────────────────────▼─────────────────────────┐  │
│  │         Transformation Layer                        │  │
│  ├─────────────────────────────────────────────────────┤  │
│  │  Markdown ←→ Remark AST ←→ PM Doc ←→ DOM          │  │
│  │                                                     │  │
│  │  ┌──────────────┐          ┌──────────────┐       │  │
│  │  │ ParserState  │          │ Serializer   │       │  │
│  │  │ (Stack-Based)│          │ State        │       │  │
│  │  └──────────────┘          └──────────────┘       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              ProseMirror Core                       │  │
│  │  ┌─────────────┐  ┌──────────────┐                │  │
│  │  │ EditorState │  │ EditorView   │                │  │
│  │  │  - Schema   │  │  - DOM       │                │  │
│  │  │  - Doc      │  │  - Rendering │                │  │
│  │  │  - Plugins  │  │  - Events    │                │  │
│  │  └─────────────┘  └──────────────┘                │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

Milkdown is a **monorepo** using **pnpm workspaces**, organized into 12+ packages:

### Core Packages

```
packages/
├── core/              # Main Editor class, plugin lifecycle
├── ctx/               # Dependency injection (Ctx, Slice, Container)
├── prose/             # ProseMirror wrapper for modular exports
├── transformer/       # Remark integration (Parser/Serializer)
├── utils/             # Composable plugin factories
├── exception/         # Centralized error handling
└── kit/               # Pre-built feature bundles
```

### Plugin Packages

```
packages/
├── preset-commonmark/ # CommonMark nodes/marks
├── preset-gfm/        # GitHub Flavored Markdown
├── plugin-history/    # Undo/redo
├── plugin-listener/   # Event listeners
├── plugin-cursor/     # Cursor drop position
├── plugin-block/      # Block handles UI
├── plugin-slash/      # Slash command menu
├── plugin-tooltip/    # Selection tooltip
├── plugin-clipboard/  # Enhanced clipboard
├── plugin-collab/     # Real-time collaboration
├── plugin-upload/     # File upload handling
└── plugin-automd/     # Auto markdown conversion
```

### Package Dependencies

```
@milkdown/core
  ├─ depends on: ctx, prose, transformer, exception
  └─ provides: Editor class, plugin system

@milkdown/transformer
  ├─ depends on: ctx, prose, exception
  └─ provides: Parser, Serializer, ParserState, SerializerState

@milkdown/utils
  ├─ depends on: ctx, prose, transformer, exception
  └─ provides: $node, $mark, $command, $shortcut factories

@milkdown/preset-commonmark
  ├─ depends on: utils, prose, ctx
  └─ provides: 13 nodes, 6 marks (standard markdown)
```

---

## ProseMirror & Remark Integration

### The Dual Specification Pattern

Milkdown's key innovation is the **dual spec** system. Every node and mark has TWO specifications:

```typescript
// Example: Heading Node
const heading = $node('heading', (ctx) => ({
  // 1. Node Content & Attributes (Shared)
  content: 'inline*',
  attrs: { level: { default: 1 } },

  // 2. ProseMirror Specification (for HTML/DOM)
  parseDOM: [
    { tag: 'h1', attrs: { level: 1 } },
    { tag: 'h2', attrs: { level: 2 } },
    // ... h3-h6
  ],
  toDOM: (node) => {
    return [`h${node.attrs.level}`, 0]
  },

  // 3. Markdown Specification (for Markdown)
  parseMarkdown: {
    match: (node) => node.type === 'heading',
    runner: (state, node, type) => {
      state.openNode(type, { level: node.depth })
      state.next(node.children)
      state.closeNode()
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === 'heading',
    runner: (state, node) => {
      state.openNode('heading', undefined, { depth: node.attrs.level })
      state.next(node.content)
      state.closeNode()
    }
  }
}))
```

### Bidirectional Transformation Pipeline

```
┌────────────────────────────────────────────────────────────┐
│                   MARKDOWN → EDITOR                        │
└────────────────────────────────────────────────────────────┘

Markdown String
    │
    ├─ remark.parse()
    │
    ▼
Remark AST (mdast)
    │
    ├─ ParserState
    │  ├─ Match node type → schema spec
    │  ├─ Call spec.parseMarkdown.runner()
    │  └─ Build ProseMirror node on stack
    │
    ▼
ProseMirror Document
    │
    ├─ EditorView renders to DOM
    │
    ▼
Editable DOM Content


┌────────────────────────────────────────────────────────────┐
│                   EDITOR → MARKDOWN                        │
└────────────────────────────────────────────────────────────┘

ProseMirror Document
    │
    ├─ SerializerState
    │  ├─ Match node type → schema spec
    │  ├─ Call spec.toMarkdown.runner()
    │  └─ Build Remark AST on stack
    │
    ▼
Remark AST (mdast)
    │
    ├─ remark.stringify()
    │
    ▼
Markdown String
```

### Stack-Based Transformation

Both `ParserState` and `SerializerState` use **stack machines** for composable, resumable transformations:

**ParserState (Markdown → ProseMirror):**
```typescript
class ParserState {
  private stack: Node[] = []

  openNode(type: NodeType, attrs?: Attrs) {
    // Push new node onto stack
    const node = type.create(attrs)
    this.stack.push(node)
  }

  addNode(type: NodeType, attrs?: Attrs, children?: Node[]) {
    // Create and add to current parent
    const node = type.create(attrs, children)
    const parent = this.stack[this.stack.length - 1]
    parent.content.push(node)
  }

  closeNode() {
    // Pop from stack, add to parent
    const node = this.stack.pop()!
    if (this.stack.length > 0) {
      const parent = this.stack[this.stack.length - 1]
      parent.content.push(node)
    }
    return node
  }

  next(children: mdast.Node[]) {
    // Recursively process children
    children.forEach(child => this.run(child))
  }
}
```

**SerializerState (ProseMirror → Markdown):**
```typescript
class SerializerState {
  private stack: mdast.Node[] = []

  openNode(type: string, value?: string, data?: any) {
    const node = { type, children: [], ...data }
    this.stack.push(node)
  }

  addNode(type: string, value?: string, data?: any) {
    const node = { type, value, ...data }
    const parent = this.stack[this.stack.length - 1]
    parent.children.push(node)
  }

  closeNode() {
    const node = this.stack.pop()!
    if (this.stack.length > 0) {
      const parent = this.stack[this.stack.length - 1]
      parent.children.push(node)
    }
    return node
  }

  next(content: Fragment) {
    // Recursively process content
    content.forEach(child => this.run(child))
  }
}
```

### Why Stack-Based?

1. **Composability**: Each spec's runner is independent and composable
2. **Testability**: Easy to test individual node transformations
3. **Resumability**: Can pause/resume transformation at any point
4. **Error Handling**: Clear stack trace for debugging
5. **Performance**: O(n) time complexity, single pass

---

## Plugin System

### Plugin Architecture

Milkdown's plugin system is based on **dependency injection** and **async coordination**.

#### Plugin Definition

```typescript
type MilkdownPlugin = (ctx: Ctx) => PluginRunner

type PluginRunner = () => Promise<void | (() => void)>
```

Every plugin:
1. Receives a `Ctx` (context) for dependency injection
2. Returns an async runner function
3. Runner can return a cleanup function

#### Plugin Lifecycle

```
┌────────────────────────────────────────────────────────────┐
│                    Plugin Lifecycle                        │
└────────────────────────────────────────────────────────────┘

1. SETUP (Synchronous)
   ├─ Plugin receives Ctx
   ├─ Inject slices: ctx.inject(sliceA, valueA)
   ├─ Record timers: ctx.record(TimerA)
   └─ Return runner function

2. RUN (Asynchronous)
   ├─ Editor calls runner: await runner()
   ├─ Wait for dependencies: await ctx.waitTimers([TimerB])
   ├─ Execute plugin logic
   ├─ Mark timer done: ctx.done(TimerA)
   └─ Return cleanup function (optional)

3. CLEANUP (On destroy)
   ├─ Editor calls cleanup in reverse order
   └─ Plugin cleans up resources
```

#### Example Plugin

```typescript
import { $ctx, $command } from '@milkdown/utils'

// 1. Define a slice (injectable value)
const myConfigSlice = $ctx({ color: 'blue' }, 'myConfig')

// 2. Create plugin using factory
const myPlugin = $command('MyCommand', (ctx) => {
  // SETUP: runs synchronously
  const config = ctx.get(myConfigSlice)

  // Return RUNNER: runs asynchronously
  return () => (state, dispatch) => {
    // Command logic using config
    console.log('Config color:', config.color)
    return true
  }
})

// 3. Use in editor
Editor.make()
  .config(ctx => {
    ctx.set(myConfigSlice.key, { color: 'red' })
  })
  .use(myPlugin)
  .create()
```

### Internal Plugins (The 10 Core Plugins)

Milkdown has **10 internal plugins** that orchestrate the entire editor:

```typescript
// packages/core/src/internal-plugin/

1. config      - Manages user configuration
2. init        - Prepares initial slices and values
3. schema      - Builds ProseMirror schema from nodes/marks
4. parser      - Creates Markdown→ProseMirror parser
5. serializer  - Creates ProseMirror→Markdown serializer
6. commands    - Initializes CommandManager
7. keymap      - Initializes KeymapManager
8. editorState - Creates ProseMirror EditorState
9. editorView  - Creates ProseMirror EditorView, mounts DOM
10. pasteRule  - Sets up paste handling rules
```

#### Dependency Chain

```
config
  │
  ▼
init
  │
  ▼
schema
  ├──────┬──────────┬─────────┐
  ▼      ▼          ▼         ▼
parser serializer commands keymap
  │      │          │         │
  └──────┴──────────┴─────────┘
           │
           ▼
      editorState
           │
           ▼
      editorView
           │
           ▼
      pasteRule
```

Plugins use **Timers** to declare dependencies:

```typescript
// Example: editorState depends on schema, parser, commands
const editorStatePlugin = (ctx: Ctx) => {
  ctx.record(EditorStateTimer)

  return async () => {
    // Wait for dependencies
    await ctx.waitTimers([
      SchemaTimer,
      ParserTimer,
      CommandsTimer,
      KeymapTimer
    ])

    // Now safe to use schema, parser, etc.
    const schema = ctx.get(schemaCtx)
    const parser = ctx.get(parserCtx)

    // Create editor state
    const state = EditorState.create({ schema, ... })
    ctx.set(editorStateCtx.key, state)

    // Mark timer done
    ctx.done(EditorStateTimer)
  }
}
```

### Timer/Clock System

**Purpose**: Coordinate async plugin execution without race conditions

```typescript
class Clock {
  private timers: Map<Timer, TimerStatus> = new Map()

  record(timer: Timer) {
    this.timers.set(timer, 'pending')
  }

  done(timer: Timer) {
    this.timers.set(timer, 'done')
  }

  async waitTimers(timers: Timer[]) {
    // Poll until all timers are done
    while (timers.some(t => this.timers.get(t) !== 'done')) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }
}
```

**Benefits:**
- No race conditions between plugins
- Explicit dependency declaration
- Predictable execution order
- Easy debugging (can inspect timer status)

### Plugin Stores

Milkdown has **two plugin stores**:

```typescript
class Editor {
  private systemStore: PluginStore  // Internal plugins
  private userStore: PluginStore    // User plugins

  async create() {
    // 1. Load system plugins first
    await this.systemStore.load()

    // 2. Then load user plugins
    await this.userStore.load()

    // 3. Both stores share the same Ctx
  }
}
```

**Why Two Stores?**
- System plugins must run before user plugins
- User plugins can be added/removed dynamically
- Both follow same lifecycle (setup → run → cleanup)
- Cleanup happens in reverse order

---

## Data Flow

### Initialization Flow

```
User Code: Editor.make().use(plugins).config(fn).create()
    │
    ├─ 1. Instantiate Editor
    ├─ 2. Register plugins to userStore
    ├─ 3. Register config function
    │
    ▼
Editor.create()
    │
    ├─ 4. Create Ctx + Container
    ├─ 5. Load systemStore plugins
    │      ├─ config → inject user config
    │      ├─ init → prepare slices
    │      ├─ schema → build PM schema
    │      ├─ parser/serializer → create transformers
    │      ├─ commands/keymap → initialize managers
    │      ├─ editorState → create PM state
    │      ├─ editorView → create PM view, mount DOM
    │      └─ pasteRule → setup paste handling
    │
    ├─ 6. Load userStore plugins
    │      └─ Execute in dependency order
    │
    ├─ 7. Wait for EditorViewReady timer
    │
    ▼
Editor instance ready
    │
    └─ DOM mounted, editor interactive
```

### Edit Interaction Flow

```
User types "# Hello" in editor
    │
    ▼
ProseMirror Input Rules detect pattern
    │
    ├─ Match "^#\s" → heading input rule
    │
    ▼
Create Transaction
    │
    ├─ Replace text with heading node
    ├─ attrs: { level: 1 }
    │
    ▼
Apply Transaction to EditorState
    │
    ├─ New state = oldState.apply(tr)
    │
    ▼
EditorView updates DOM
    │
    ├─ Re-render changed nodes
    ├─ Update <h1> element
    │
    ▼
DOM reflects new content
```

### Command Execution Flow

```
User code: editor.action(callCommand('MyCommand', payload))
    │
    ├─ 1. Dispatch action to Ctx
    │
    ▼
Action handler executes
    │
    ├─ 2. Get CommandManager from Ctx
    ├─ 3. Look up command by key
    │
    ▼
CommandManager.call('MyCommand', payload)
    │
    ├─ 4. Get EditorView from Ctx
    ├─ 5. Call command function: cmd(view.state, view.dispatch, view)
    │
    ▼
Command function executes
    │
    ├─ 6. Create transaction
    ├─ 7. Dispatch transaction
    │
    ▼
EditorState updated → EditorView re-renders
```

### Markdown Export Flow

```
User code: editor.action(getMarkdown())
    │
    ├─ 1. Get SerializerState from Ctx
    ├─ 2. Get current EditorState
    │
    ▼
SerializerState.run(doc.content)
    │
    ├─ 3. Iterate over nodes
    ├─ 4. For each node:
    │      ├─ Match node type to schema spec
    │      ├─ Call spec.toMarkdown.runner(state, node)
    │      └─ Build Remark AST on stack
    │
    ▼
Remark AST complete
    │
    ├─ 5. Call remark.stringify(ast)
    │
    ▼
Markdown string returned
```

---

## Key Components

### 1. Ctx (Context) - Dependency Injection

**Location**: `packages/ctx/src/ctx.ts`

```typescript
class Ctx {
  private container: Container  // Symbol-keyed Map
  private clock: Clock          // Timer coordinator

  // Inject values
  inject<T>(slice: Slice<T>, value?: T) {
    this.container.set(slice.id, value ?? slice.value)
  }

  // Get values
  get<T>(slice: Slice<T>): T {
    return this.container.get(slice.id) as T
  }

  // Update values
  set<T>(sliceKey: symbol, value: T) {
    this.container.set(sliceKey, value)
  }

  // Timer methods
  record(timer: Timer) { this.clock.record(timer) }
  done(timer: Timer) { this.clock.done(timer) }
  waitTimers(timers: Timer[]) { return this.clock.waitTimers(timers) }
}
```

**Why Symbol-keyed?**
- O(1) lookup (faster than string keys)
- No namespace collisions
- Type-safe via TypeScript

### 2. Slice - Typed Value Container

**Location**: `packages/ctx/src/slice.ts`

```typescript
class Slice<T> {
  readonly id: symbol       // Unique identifier
  readonly value: T         // Default value
  readonly name?: string    // Debug name

  constructor(value: T, name?: string) {
    this.id = Symbol(name)
    this.value = value
    this.name = name
  }
}

// Usage
const configSlice = new Slice({ theme: 'dark' }, 'config')
ctx.inject(configSlice)
const config = ctx.get(configSlice)  // Type-safe!
```

### 3. CommandManager - Command Registry

**Location**: `packages/core/src/internal-plugin/commands.ts`

```typescript
class CommandManager {
  private commands: Map<string, Command> = new Map()

  create(key: string, value: Command) {
    this.commands.set(key, value)
  }

  get(key: string): Command | undefined {
    return this.commands.get(key)
  }

  call(key: string, payload?: any): boolean {
    const command = this.get(key)
    if (!command) return false

    const view = this.ctx.get(editorViewCtx)
    return command(payload)(view.state, view.dispatch, view)
  }

  remove(key: string) {
    this.commands.delete(key)
  }
}
```

### 4. Schema Builder

**Location**: `packages/core/src/internal-plugin/schema.ts`

```typescript
const schemaPlugin = (ctx: Ctx) => {
  ctx.record(SchemaTimer)

  return async () => {
    await ctx.waitTimers([InitTimer])

    // Collect all node/mark specs from plugins
    const nodeSpecs = ctx.get(nodeSpecCtx)
    const markSpecs = ctx.get(markSpecCtx)

    // Build ProseMirror schema
    const schema = new Schema({
      nodes: nodeSpecs,
      marks: markSpecs
    })

    ctx.set(schemaCtx.key, schema)
    ctx.done(SchemaTimer)
  }
}
```

### 5. ParserState - Markdown to ProseMirror

**Location**: `packages/transformer/src/parser/state.ts`

```typescript
class ParserState {
  private stack: StackElement[] = []
  private marks: Mark[] = []

  run(node: mdast.Node): Node {
    // Find matching spec
    const spec = this.findSpec(node)
    if (!spec) throw new Error(`No spec for ${node.type}`)

    // Run spec's parser
    spec.runner(this, node, this.schema.nodes[spec.id])

    return this.stack[0].node
  }

  openNode(type: NodeType, attrs?: Attrs) {
    this.stack.push({ type, attrs, content: [] })
  }

  addNode(type: NodeType, attrs?: Attrs, content?: Node[]) {
    const node = type.create(attrs, content, this.marks)
    const parent = this.stack[this.stack.length - 1]
    parent.content.push(node)
  }

  closeNode(): Node {
    const element = this.stack.pop()!
    const node = element.type.create(
      element.attrs,
      element.content,
      this.marks
    )

    if (this.stack.length > 0) {
      const parent = this.stack[this.stack.length - 1]
      parent.content.push(node)
    }

    return node
  }

  addMark(mark: Mark) {
    this.marks = mark.addToSet(this.marks)
  }

  removeMark(mark: Mark) {
    this.marks = mark.removeFromSet(this.marks)
  }

  next(children: mdast.Node[]) {
    children.forEach(child => this.run(child))
  }
}
```

### 6. SerializerState - ProseMirror to Markdown

**Location**: `packages/transformer/src/serializer/state.ts`

```typescript
class SerializerState {
  private stack: mdast.Node[] = []

  run(content: Fragment): mdast.Node {
    content.forEach(node => {
      // Find matching spec
      const spec = this.findSpec(node)
      if (!spec) throw new Error(`No spec for ${node.type.name}`)

      // Run spec's serializer
      spec.runner(this, node)
    })

    return this.stack[0]
  }

  openNode(type: string, value?: string, data?: any) {
    const node = { type, children: [], value, ...data }
    this.stack.push(node)
  }

  addNode(type: string, value?: string, data?: any) {
    const node = { type, value, ...data }
    const parent = this.stack[this.stack.length - 1]
    parent.children.push(node)
  }

  closeNode(): mdast.Node {
    const node = this.stack.pop()!

    if (this.stack.length > 0) {
      const parent = this.stack[this.stack.length - 1]
      parent.children.push(node)
    }

    return node
  }

  next(content: Fragment) {
    content.forEach(node => this.run(Fragment.from(node)))
  }

  withMark(mark: Mark, type: string, data?: any) {
    this.openNode(type, undefined, data)
    // Process content with mark
    this.closeNode()
  }
}
```

---

## Summary

### Architectural Strengths

1. **Modularity**: Everything is a plugin; easy to add/remove features
2. **Type Safety**: Strong TypeScript types throughout
3. **Performance**: Symbol-keyed maps, single-pass transformations
4. **Lossless**: Dual specs enable perfect Markdown ↔ Editor conversion
5. **Predictability**: Explicit dependencies, no hidden state
6. **Testability**: Each component is independently testable
7. **Extensibility**: Clean extension points at every layer

### Key Takeaways

- **Plugins are the building blocks**: Every feature is a plugin
- **Ctx provides isolation**: No global state, each plugin gets its own context
- **Timers coordinate async**: No race conditions between plugins
- **Dual specs enable lossless conversion**: ProseMirror + Markdown specs
- **Stack machines are efficient**: Single-pass, composable transformations
- **Managers provide registries**: Commands, keymaps stored in managers

### Next Steps

With this architectural understanding, you can:
1. Create custom nodes/marks with dual specs
2. Build plugins that integrate with the lifecycle
3. Extend existing nodes with `.extendSchema()`
4. Create custom commands and keymaps
5. Build preset bundles for specific use cases

---

## References

- **Core Packages**: `packages/core/`, `packages/ctx/`, `packages/prose/`, `packages/transformer/`
- **Plugin Examples**: `packages/preset-commonmark/`, `packages/plugin-*/`
- **Internal Plugins**: `packages/core/src/internal-plugin/*.ts`
- **Transformer**: `packages/transformer/src/parser/`, `packages/transformer/src/serializer/`
