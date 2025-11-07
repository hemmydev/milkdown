# Milkdown Design Patterns Guide

## Table of Contents
1. [Overview](#overview)
2. [Core Patterns](#core-patterns)
3. [Plugin Patterns](#plugin-patterns)
4. [Schema Patterns](#schema-patterns)
5. [Command Patterns](#command-patterns)
6. [State Management Patterns](#state-management-patterns)
7. [Best Practices](#best-practices)

---

## Overview

Milkdown employs several key design patterns that make the codebase maintainable, extensible, and testable. Understanding these patterns is crucial for effective development with Milkdown.

### Pattern Categories

1. **Dependency Injection Pattern** - Ctx and Slices
2. **Factory Pattern** - Plugin factories ($node, $mark, $command)
3. **Manager Pattern** - CommandManager, KeymapManager
4. **Stack Machine Pattern** - Parser and Serializer
5. **Observer Pattern** - Slice watchers and listeners
6. **Chain of Responsibility** - Command chains
7. **Strategy Pattern** - Dual specs (ProseMirror + Markdown)

---

## Core Patterns

### 1. Dependency Injection via Slices

**Purpose**: Provide type-safe, collision-free dependency injection without global state.

**Pattern Structure:**

```typescript
// 1. Define a Slice (typed container)
const mySlice = new Slice<ConfigType>(defaultValue, 'mySlice')

// 2. Inject into context
ctx.inject(mySlice, customValue)

// 3. Retrieve from context
const value = ctx.get(mySlice)  // Type-safe!
```

**Real Example:**

```typescript
// packages/core/src/internal-plugin/schema.ts

import { Slice } from '@milkdown/ctx'
import { Schema } from '@milkdown/prose/model'

// Define slice
export const schemaCtx = new Slice<Schema>(
  {} as Schema,
  'schema'
)

// In schema plugin: inject
const schemaPlugin = (ctx: Ctx) => {
  return async () => {
    const schema = new Schema({ nodes, marks })
    ctx.set(schemaCtx.key, schema)
  }
}

// In other plugins: retrieve
const otherPlugin = (ctx: Ctx) => {
  return async () => {
    const schema = ctx.get(schemaCtx)  // Get the schema
    // Use schema...
  }
}
```

**Benefits:**
- **Type Safety**: TypeScript ensures correct types
- **No Collisions**: Symbol keys prevent naming conflicts
- **Testability**: Easy to mock/inject test values
- **Isolation**: Each Ctx is independent

**When to Use:**
- Sharing data between plugins
- Providing configuration options
- Exposing APIs (CommandManager, KeymapManager)
- Storing editor state references

---

### 2. Factory Pattern for Plugins

**Purpose**: Create composable, reusable plugin builders with consistent APIs.

**Pattern Structure:**

```typescript
// Factory function that returns a plugin
const $factory = (id: string, spec: SpecType) => {
  return (ctx: Ctx) => {
    // Setup phase
    return async () => {
      // Run phase
    }
  }
}
```

**Real Examples:**

#### $node Factory

```typescript
// packages/utils/src/factory/node.ts

export const $node = (
  id: string,
  schema: (ctx: Ctx) => NodeSchema
) => {
  return atomGetter(AtomKind.node, (ctx) => {
    // Setup: generate schema
    const nodeSchema = schema(ctx)

    // Register with schema system
    ctx.get(schemaCtx).addNode(id, nodeSchema)

    // Return runner
    return async () => {
      // Additional setup if needed
    }
  })
}

// Usage
const heading = $node('heading', (ctx) => ({
  content: 'inline*',
  attrs: { level: { default: 1 } },
  parseDOM: [{ tag: 'h1', attrs: { level: 1 } }],
  toDOM: (node) => [`h${node.attrs.level}`, 0],
  parseMarkdown: { /* ... */ },
  toMarkdown: { /* ... */ }
}))
```

#### $command Factory

```typescript
// packages/utils/src/factory/command.ts

export const $command = (
  key: string,
  command: (ctx: Ctx) => Command
) => {
  return atomGetter(AtomKind.command, (ctx) => {
    // Setup: create command
    const cmd = command(ctx)

    // Register with CommandManager
    ctx.get(commandManagerCtx).create(key, cmd)

    // Return runner
    return async () => {
      // Command is ready
    }
  })
}

// Usage
const insertHeading = $command('InsertHeading', (ctx) => {
  return (level = 1) => (state, dispatch) => {
    const { schema } = state
    const type = schema.nodes.heading
    if (!type) return false

    if (dispatch) {
      const node = type.create({ level })
      dispatch(state.tr.replaceSelectionWith(node))
    }
    return true
  }
})
```

#### $mark Factory

```typescript
// packages/utils/src/factory/mark.ts

export const $mark = (
  id: string,
  schema: (ctx: Ctx) => MarkSchema
) => {
  return atomGetter(AtomKind.mark, (ctx) => {
    const markSchema = schema(ctx)
    ctx.get(schemaCtx).addMark(id, markSchema)

    return async () => {}
  })
}

// Usage
const bold = $mark('bold', () => ({
  parseDOM: [
    { tag: 'strong' },
    { tag: 'b' },
    { style: 'font-weight', getAttrs: v => /^(bold(er)?|[5-9]\d{2})$/.test(v) }
  ],
  toDOM: () => ['strong', 0],
  parseMarkdown: {
    match: node => node.type === 'strong',
    runner: (state, node) => {
      state.openMark(state.schema.marks.bold)
      state.next(node.children)
      state.closeMark(state.schema.marks.bold)
    }
  },
  toMarkdown: {
    match: mark => mark.type.name === 'bold',
    runner: (state, mark) => {
      state.withMark(mark, 'strong')
    }
  }
}))
```

**Benefits:**
- **Consistency**: All plugins follow same pattern
- **Reusability**: Easy to create similar plugins
- **Composability**: Combine multiple factories
- **Type Safety**: Factory enforces correct structure

**When to Use:**
- Creating nodes, marks, commands, shortcuts
- Building preset bundles
- Providing configuration contexts

---

### 3. Manager Pattern

**Purpose**: Centralize registration, lookup, and lifecycle management of related items.

**Pattern Structure:**

```typescript
class Manager<T> {
  private registry: Map<string, T> = new Map()

  create(key: string, value: T) {
    this.registry.set(key, value)
  }

  get(key: string): T | undefined {
    return this.registry.get(key)
  }

  remove(key: string) {
    this.registry.delete(key)
  }

  has(key: string): boolean {
    return this.registry.has(key)
  }

  getAll(): Map<string, T> {
    return this.registry
  }
}
```

**Real Examples:**

#### CommandManager

```typescript
// packages/core/src/internal-plugin/commands.ts

export class CommandManager {
  private commands = new Map<string, Command>()

  constructor(private ctx: Ctx) {}

  create(key: string, value: Command) {
    this.commands.set(key, value)
    return this
  }

  get(key: string) {
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
    return this
  }
}

// Usage
const cmd = ctx.get(commandsCtx)
cmd.create('MyCommand', myCommand)
cmd.call('MyCommand', payload)
```

#### KeymapManager

```typescript
// packages/core/src/internal-plugin/keymap.ts

export class KeymapManager {
  private keymaps = new Map<string, Keymap>()

  constructor(private ctx: Ctx) {}

  add(key: string, keymap: Keymap) {
    this.keymaps.set(key, keymap)
    return this
  }

  get(key: string) {
    return this.keymaps.get(key)
  }

  remove(key: string) {
    this.keymaps.delete(key)
    return this
  }

  toPlugins(): Plugin[] {
    const allKeymaps = Array.from(this.keymaps.values())
    return [keymap(Object.assign({}, ...allKeymaps))]
  }
}

// Usage
const km = ctx.get(keymapCtx)
km.add('bold', { 'Mod-b': toggleBoldCommand })
```

**Benefits:**
- **Centralization**: Single source of truth
- **Discoverability**: Easy to list all items
- **Lifecycle**: Manage creation/removal
- **Type Safety**: Typed registry

**When to Use:**
- Managing collections of related items (commands, keymaps, nodes)
- Providing lookup APIs
- Dynamic registration/removal

---

### 4. Stack Machine Pattern

**Purpose**: Transform trees (AST ↔ ProseMirror) in a single pass with composable operations.

**Pattern Structure:**

```typescript
class StackMachine<T> {
  private stack: T[] = []

  push(item: T) {
    this.stack.push(item)
  }

  pop(): T {
    return this.stack.pop()!
  }

  peek(): T {
    return this.stack[this.stack.length - 1]
  }

  process(node: InputNode) {
    // Match node type
    // Call appropriate handler
    // Handler uses push/pop/peek
  }
}
```

**Real Example: ParserState**

```typescript
// packages/transformer/src/parser/state.ts

export class ParserState {
  private stack: StackElement[] = []
  private marks: Mark[] = []

  // Open a new node (push to stack)
  openNode(type: NodeType, attrs?: Attrs, content?: Node[]) {
    this.stack.push({
      type,
      attrs,
      content: content ?? []
    })
    return this
  }

  // Add to current parent
  addNode(type: NodeType, attrs?: Attrs, content?: Node[]) {
    const node = type.create(attrs, content, this.marks)
    this.peek().content.push(node)
    return this
  }

  // Close current node (pop from stack)
  closeNode(): Node {
    const element = this.stack.pop()!
    const node = element.type.create(
      element.attrs,
      element.content,
      this.marks
    )

    if (this.stack.length > 0) {
      this.peek().content.push(node)
    }

    return node
  }

  // Peek at current parent
  private peek(): StackElement {
    return this.stack[this.stack.length - 1]
  }

  // Process children recursively
  next(children: mdast.Node[]) {
    children.forEach(child => this.run(child))
    return this
  }

  // Add marks
  openMark(mark: Mark) {
    this.marks = mark.addToSet(this.marks)
    return this
  }

  closeMark(mark: Mark) {
    this.marks = mark.removeFromSet(this.marks)
    return this
  }
}

// Usage in node spec
const paragraph = $node('paragraph', () => ({
  // ...
  parseMarkdown: {
    match: node => node.type === 'paragraph',
    runner: (state, node, type) => {
      state.openNode(type)
      state.next(node.children)  // Recurse
      state.closeNode()
    }
  }
}))
```

**Flow Diagram:**

```
Input: Paragraph with bold text
Markdown AST:
  paragraph
    └─ strong
         └─ text "Hello"

Stack Trace:
1. openNode(paragraph)       → Stack: [paragraph]
2. next(children)            → Process strong node
3.   openMark(bold)          → Marks: [bold]
4.   next(text)              → Process text node
5.     addNode(text "Hello") → Add to paragraph with bold mark
6.   closeMark(bold)         → Marks: []
7. closeNode()               → Stack: [], return paragraph node

Result ProseMirror:
  paragraph
    └─ text "Hello" [bold mark]
```

**Benefits:**
- **Single Pass**: O(n) time complexity
- **Composability**: Each spec is independent
- **Testability**: Easy to test individual specs
- **Maintainability**: Clear, linear flow

**When to Use:**
- Tree transformations (AST ↔ DOM ↔ ProseMirror)
- Recursive processing with context
- Building complex nested structures

---

### 5. Observer Pattern via Watchers

**Purpose**: React to changes in slices without tight coupling.

**Pattern Structure:**

```typescript
// packages/ctx/src/slice.ts

class Slice<T> {
  private watchers: Array<(prev: T, next: T) => void> = []

  watch(callback: (prev: T, next: T) => void) {
    this.watchers.push(callback)
  }

  notify(prev: T, next: T) {
    this.watchers.forEach(cb => cb(prev, next))
  }
}

// In Ctx.set()
set<T>(key: symbol, value: T) {
  const prev = this.container.get(key)
  this.container.set(key, value)

  // Notify watchers
  const slice = this.findSlice(key)
  if (slice) {
    slice.notify(prev, value)
  }
}
```

**Real Example:**

```typescript
// Listen for editor state changes
const stateSlice = ctx.get(editorStateCtx)

stateSlice.watch((prev, next) => {
  console.log('State changed:', prev, next)
  // React to state change
})

// Or use listener plugin
import { listener, listenerCtx } from '@milkdown/plugin-listener'

Editor.make()
  .use(listener)
  .config(ctx => {
    const listener = ctx.get(listenerCtx)
    listener.markdownUpdated((ctx, markdown, prevMarkdown) => {
      console.log('Markdown changed:', markdown)
    })
  })
```

**Benefits:**
- **Decoupling**: Observers don't know about each other
- **Extensibility**: Easy to add new observers
- **Reactivity**: Automatic updates on changes

**When to Use:**
- Reacting to editor state changes
- Syncing with external state (React, Vue)
- Logging/debugging
- Auto-save functionality

---

## Plugin Patterns

### 1. Plugin Composition Pattern

**Purpose**: Combine multiple related plugins into a single preset.

**Pattern:**

```typescript
// Create individual plugins
const plugin1 = $node('node1', () => ({ /* ... */ }))
const plugin2 = $mark('mark1', () => ({ /* ... */ }))
const plugin3 = $command('Cmd1', () => myCommand)

// Compose into preset
export const myPreset = [
  plugin1,
  plugin2,
  plugin3
]

// Usage
Editor.make()
  .use(myPreset)
  .create()
```

**Real Example: CommonMark Preset**

```typescript
// packages/preset-commonmark/src/index.ts

import { nodes } from './node'
import { marks } from './mark'
import { commands } from './command'
import { shortcuts } from './shortcut'

export const commonmark = [
  ...nodes,      // 13 nodes (doc, paragraph, heading, etc.)
  ...marks,      // 6 marks (bold, italic, code, etc.)
  ...commands,   // Commands for nodes/marks
  ...shortcuts   // Keyboard shortcuts
]

// Usage
import { commonmark } from '@milkdown/preset-commonmark'

Editor.make()
  .use(commonmark)
  .create()
```

**Benefits:**
- **Modularity**: Easy to use related features together
- **Discoverability**: Clear feature sets
- **Versioning**: Update all related plugins at once

---

### 2. Plugin Extension Pattern

**Purpose**: Modify existing node/mark schemas without recreating them.

**Pattern:**

```typescript
// Extend existing node
const extendedHeading = $node('heading', (ctx) => {
  // Get base schema
  const base = ctx.get(baseHeadingSchema)

  return {
    ...base,
    attrs: {
      ...base.attrs,
      id: { default: '' }  // Add new attribute
    },
    toDOM: (node) => {
      return [
        `h${node.attrs.level}`,
        { id: node.attrs.id },  // Include new attr
        0
      ]
    }
  }
})
```

**Real Example:**

```typescript
// Add custom classes to code blocks
import { codeBlock } from '@milkdown/preset-commonmark'

const customCodeBlock = $node('code_block', (ctx) => {
  return {
    ...codeBlock.schema(ctx),
    attrs: {
      language: { default: '' },
      class: { default: '' }  // New attribute
    },
    toDOM: (node) => {
      return [
        'pre',
        {
          class: node.attrs.class || 'code-block',
          'data-language': node.attrs.language
        },
        ['code', 0]
      ]
    }
  }
})
```

**Benefits:**
- **Reusability**: Build on existing schemas
- **Maintainability**: Changes to base propagate
- **Flexibility**: Customize without forking

---

### 3. Conditional Plugin Pattern

**Purpose**: Load plugins based on runtime conditions.

**Pattern:**

```typescript
const conditionalPlugin = (ctx: Ctx) => {
  const config = ctx.get(configSlice)

  return async () => {
    if (config.enableFeature) {
      // Load feature
      const feature = await import('./feature')
      ctx.use(feature.plugin)
    }
  }
}
```

**Real Example:**

```typescript
// Load different plugins based on platform
const platformPlugin = (ctx: Ctx) => {
  return async () => {
    const isMobile = /Mobile|Android|iOS/.test(navigator.userAgent)

    if (isMobile) {
      // Load mobile-specific plugins
      ctx.use(mobileKeymap)
      ctx.use(touchGestures)
    } else {
      // Load desktop plugins
      ctx.use(desktopKeymap)
      ctx.use(mouseHandlers)
    }
  }
}
```

---

## Schema Patterns

### 1. Dual Specification Pattern

**Purpose**: Enable lossless bidirectional transformation between Markdown and ProseMirror.

**Pattern:**

```typescript
const node = $node('nodeName', () => ({
  // Shared: content model & attributes
  content: 'inline*',
  attrs: { level: { default: 1 } },

  // ProseMirror spec: HTML/DOM
  parseDOM: [ /* parse from HTML */ ],
  toDOM: (node) => { /* render to HTML */ },

  // Markdown spec: remark AST
  parseMarkdown: {
    match: (node) => { /* match mdast node */ },
    runner: (state, node, type) => { /* build PM node */ }
  },
  toMarkdown: {
    match: (node) => { /* match PM node */ },
    runner: (state, node) => { /* build mdast node */ }
  }
}))
```

**Complete Example: Heading**

```typescript
// packages/preset-commonmark/src/node/heading.ts

export const heading = $node('heading', () => ({
  content: 'inline*',
  group: 'block',
  attrs: {
    level: { default: 1 }
  },
  defining: true,

  // ProseMirror: HTML parsing/rendering
  parseDOM: [
    { tag: 'h1', attrs: { level: 1 } },
    { tag: 'h2', attrs: { level: 2 } },
    { tag: 'h3', attrs: { level: 3 } },
    { tag: 'h4', attrs: { level: 4 } },
    { tag: 'h5', attrs: { level: 5 } },
    { tag: 'h6', attrs: { level: 6 } }
  ],
  toDOM: (node) => {
    return [`h${node.attrs.level}`, 0]
  },

  // Markdown: remark AST parsing
  parseMarkdown: {
    match: (node) => node.type === 'heading',
    runner: (state, node, type) => {
      const level = node.depth as number
      state.openNode(type, { level })
      state.next(node.children)
      state.closeNode()
    }
  },

  // Markdown: remark AST serialization
  toMarkdown: {
    match: (node) => node.type.name === 'heading',
    runner: (state, node) => {
      const level = node.attrs.level as number
      state.openNode('heading', undefined, { depth: level })
      state.next(node.content)
      state.closeNode()
    }
  }
}))
```

**Benefits:**
- **Lossless Conversion**: No data lost in roundtrip
- **Separation of Concerns**: HTML and Markdown logic separate
- **Flexibility**: Can customize each independently

---

### 2. Priority Pattern

**Purpose**: Control parsing order when multiple specs could match.

**Pattern:**

```typescript
const node = $node('nodeName', () => ({
  // ...
  parseMarkdown: {
    match: (node) => node.type === 'code',
    priority: 100  // Higher = parsed first
  }
}))
```

**Real Example: Code vs Code Block**

```typescript
// Inline code (higher priority)
const code = $mark('code', () => ({
  parseMarkdown: {
    match: node => node.type === 'inlineCode',
    priority: 100  // Parse inline code first
  }
}))

// Code block (lower priority)
const codeBlock = $node('code_block', () => ({
  parseMarkdown: {
    match: node => node.type === 'code',
    priority: 50   // Parse block code second
  }
}))
```

**Benefits:**
- **Disambiguation**: Handle overlapping patterns
- **Predictability**: Explicit ordering
- **Debugging**: Easy to understand parse order

---

## Command Patterns

### 1. Command Factory Pattern

**Purpose**: Create reusable commands with consistent signatures.

**Pattern:**

```typescript
const createCommand = (ctx: Ctx) => {
  return (payload?: Payload) => {
    return (state: EditorState, dispatch?: Dispatch, view?: EditorView) => {
      // Command logic
      if (dispatch) {
        dispatch(state.tr./* ... */)
      }
      return true  // or false if can't execute
    }
  }
}

export const myCommand = $command('MyCommand', createCommand)
```

**Real Example: Toggle Mark**

```typescript
// packages/preset-commonmark/src/command/mark.ts

export const toggleBold = $command('ToggleBold', (ctx) => {
  return () => (state, dispatch) => {
    const mark = state.schema.marks.bold
    if (!mark) return false

    const { from, to } = state.selection
    const hasMark = state.doc.rangeHasMark(from, to, mark)

    if (dispatch) {
      if (hasMark) {
        dispatch(state.tr.removeMark(from, to, mark))
      } else {
        dispatch(state.tr.addMark(from, to, mark.create()))
      }
    }

    return true
  }
})

// Usage
editor.action(callCommand('ToggleBold'))
```

---

### 2. Command Chain Pattern

**Purpose**: Execute multiple commands in sequence, stopping if any fails.

**Pattern:**

```typescript
const chainCommands = (...commands: Command[]) => {
  return (state: EditorState, dispatch?: Dispatch, view?: EditorView) => {
    for (const cmd of commands) {
      if (cmd(state, dispatch, view)) {
        return true  // First successful command wins
      }
    }
    return false  // All commands failed
  }
}
```

**Real Example:**

```typescript
// Try multiple ways to exit code block
const exitCodeBlock = chainCommands(
  exitCode,           // Try ProseMirror's exitCode
  createParagraphNear, // Try creating paragraph
  liftEmptyBlock,     // Try lifting block
  splitBlock          // Finally try split
)

// Usage in keymap
const keymap = {
  'Mod-Enter': exitCodeBlock
}
```

---

### 3. Command Wrapper Pattern

**Purpose**: Add pre/post processing to commands.

**Pattern:**

```typescript
const withLogging = (command: Command) => {
  return (state, dispatch, view) => {
    console.log('Before:', state)
    const result = command(state, dispatch, view)
    console.log('After:', state, 'Result:', result)
    return result
  }
}

const myCommand = withLogging(originalCommand)
```

**Real Example: Transaction Tracking**

```typescript
const withTracking = (command: Command) => {
  return (state, dispatch, view) => {
    const wrappedDispatch = dispatch
      ? (tr: Transaction) => {
          tr.setMeta('tracked', true)
          tr.setMeta('timestamp', Date.now())
          return dispatch(tr)
        }
      : undefined

    return command(state, wrappedDispatch, view)
  }
}
```

---

## State Management Patterns

### 1. Immutable State Pattern

**Purpose**: Ensure predictable state updates via immutable transactions.

**Pattern:**

```typescript
// DON'T: Mutate state directly
state.doc.content[0] = newNode  // ❌ Error!

// DO: Create transaction
const tr = state.tr
tr.replaceWith(pos, pos, newNode)
const newState = state.apply(tr)
```

**Real Example:**

```typescript
const insertNode = (node: Node) => {
  return (state: EditorState, dispatch?: Dispatch) => {
    if (dispatch) {
      const { from } = state.selection
      const tr = state.tr.insert(from, node)
      dispatch(tr)
    }
    return true
  }
}
```

---

### 2. Transaction Builder Pattern

**Purpose**: Build complex transactions step-by-step.

**Pattern:**

```typescript
const complexOperation = (state, dispatch) => {
  const tr = state.tr
    .delete(from, to)
    .insert(pos, node)
    .setSelection(newSelection)
    .scrollIntoView()
    .setMeta('myPlugin', { action: 'complex' })

  if (dispatch) {
    dispatch(tr)
  }
  return true
}
```

**Real Example: Insert Table**

```typescript
const insertTable = (rows: number, cols: number) => {
  return (state, dispatch) => {
    const { schema } = state
    const { table, tableRow, tableCell } = schema.nodes

    // Build table structure
    const cells = []
    for (let i = 0; i < cols; i++) {
      cells.push(tableCell.create(null, schema.nodes.paragraph.create()))
    }
    const row = tableRow.create(null, cells)
    const rowNodes = []
    for (let i = 0; i < rows; i++) {
      rowNodes.push(row)
    }
    const tableNode = table.create(null, rowNodes)

    // Insert with transaction
    if (dispatch) {
      const { from } = state.selection
      const tr = state.tr
        .insert(from, tableNode)
        .setSelection(TextSelection.create(tr.doc, from + 2))
        .scrollIntoView()

      dispatch(tr)
    }

    return true
  }
}
```

---

## Best Practices

### 1. Plugin Development

✅ **DO:**
- Use factory functions ($node, $mark, $command)
- Declare timer dependencies explicitly
- Inject slices in setup phase, not run phase
- Return cleanup functions from runners
- Make plugins pure (no side effects in setup)

❌ **DON'T:**
- Create plugins without factory functions
- Access unready slices (wait for timers)
- Mutate ctx directly
- Create circular dependencies between timers

**Example:**

```typescript
// ✅ Good
const myPlugin = $node('myNode', (ctx) => {
  // Setup: synchronous, pure
  const config = ctx.get(configSlice)

  return async () => {
    // Run: async, wait for dependencies
    await ctx.waitTimers([SchemaTimer])
    const schema = ctx.get(schemaCtx)
    // ... use schema

    // Return cleanup
    return () => {
      // Cleanup resources
    }
  }
})

// ❌ Bad
const badPlugin = (ctx) => {
  // Missing factory wrapper
  const schema = ctx.get(schemaCtx)  // May not be ready!
  return () => {}  // No cleanup
}
```

---

### 2. Schema Design

✅ **DO:**
- Define both ProseMirror and Markdown specs
- Use priorities to disambiguate overlapping patterns
- Keep content models flexible (`inline*`, `block+`)
- Use groups for categorization (`block`, `inline`)

❌ **DON'T:**
- Create nodes without markdown specs (breaks serialization)
- Use overly strict content models
- Forget to handle edge cases in parse/serialize

**Example:**

```typescript
// ✅ Good
const myNode = $node('myNode', () => ({
  content: 'block+',  // Flexible
  group: 'block',
  parseDOM: [{ tag: 'div.my-node' }],
  toDOM: () => ['div', { class: 'my-node' }, 0],
  parseMarkdown: {
    match: node => node.type === 'myNode',
    priority: 100,  // Explicit priority
    runner: (state, node, type) => {
      state.openNode(type)
      state.next(node.children)
      state.closeNode()
    }
  },
  toMarkdown: {
    match: node => node.type.name === 'myNode',
    runner: (state, node) => {
      state.openNode('myNode')
      state.next(node.content)
      state.closeNode()
    }
  }
}))

// ❌ Bad
const badNode = $node('badNode', () => ({
  content: 'text',  // Too strict
  parseDOM: [{ tag: 'div' }],  // No class, too generic
  toDOM: () => ['div', 0],
  // Missing markdown specs!
}))
```

---

### 3. Command Design

✅ **DO:**
- Check if command can execute (return false if not)
- Only dispatch if dispatch function provided
- Use chainCommands for fallbacks
- Add undo/redo support via transactions

❌ **DON'T:**
- Mutate state directly
- Always dispatch (check `if (dispatch)`)
- Forget to return boolean
- Create commands without error handling

**Example:**

```typescript
// ✅ Good
const myCommand = $command('MyCommand', (ctx) => {
  return (payload) => (state, dispatch, view) => {
    // Check if can execute
    const node = state.schema.nodes.myNode
    if (!node) return false

    // Only dispatch if provided
    if (dispatch) {
      const tr = state.tr.insert(state.selection.from, node.create())
      dispatch(tr)
    }

    return true
  }
})

// ❌ Bad
const badCommand = $command('BadCommand', (ctx) => {
  return (payload) => (state, dispatch) => {
    // Always dispatches (even during dry-run check)
    dispatch(state.tr.insert(0, someNode))  // ❌
    // No return value
  }
})
```

---

### 4. Context Usage

✅ **DO:**
- Use slices for shared data
- Use symbols for slice keys
- Provide default values
- Watch slices for reactivity

❌ **DON'T:**
- Store state in global variables
- Use string keys
- Mutate slice values directly (use ctx.set)

**Example:**

```typescript
// ✅ Good
const mySlice = new Slice({ count: 0 }, 'mySlice')

const myPlugin = (ctx: Ctx) => {
  ctx.inject(mySlice)

  return async () => {
    const value = ctx.get(mySlice)
    ctx.set(mySlice.key, { count: value.count + 1 })  // Immutable update
  }
}

// ❌ Bad
let globalCount = 0  // ❌ Global state

const badPlugin = (ctx: Ctx) => {
  return async () => {
    globalCount++  // ❌ Mutation
    const value = ctx.get('mySlice')  // ❌ String key (not type-safe)
  }
}
```

---

## Summary

### Key Pattern Takeaways

1. **Dependency Injection** - Use Ctx and Slices for type-safe, isolated state
2. **Factories** - Use $node, $mark, $command for consistent plugin APIs
3. **Managers** - Centralize registration and lookup
4. **Stack Machines** - Transform trees efficiently in single pass
5. **Observers** - React to changes via watchers
6. **Immutability** - All state updates via transactions
7. **Composition** - Combine plugins into presets
8. **Dual Specs** - Enable lossless Markdown ↔ Editor conversion

### Pattern Selection Guide

| Task | Pattern | Factory |
|------|---------|---------|
| Create node | Dual Specification | $node |
| Create mark | Dual Specification | $mark |
| Create command | Command Factory | $command |
| Share data | Dependency Injection | Slice |
| Manage collection | Manager | Class |
| Transform tree | Stack Machine | ParserState |
| React to changes | Observer | watch() |
| Combine plugins | Composition | Array |

### Next Steps

With these patterns, you can:
1. Create custom nodes/marks following best practices
2. Build commands with proper error handling
3. Manage state immutably via transactions
4. Compose features into reusable presets
5. Extend Milkdown's functionality cleanly

---

## References

- `packages/utils/src/factory/` - Plugin factories
- `packages/ctx/src/` - Dependency injection
- `packages/transformer/src/` - Stack machines
- `packages/core/src/internal-plugin/` - Manager examples
- `packages/preset-commonmark/src/` - Pattern examples
