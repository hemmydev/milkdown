# Milkdown Workflow & Method Documentation

## Table of Contents
1. [Editor Lifecycle](#editor-lifecycle)
2. [Initialization Workflow](#initialization-workflow)
3. [Rendering Pipeline](#rendering-pipeline)
4. [Edit Operations](#edit-operations)
5. [Command Execution](#command-execution)
6. [Event System](#event-system)
7. [API Reference](#api-reference)

---

## Editor Lifecycle

### Complete Lifecycle Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                    EDITOR LIFECYCLE                           │
└───────────────────────────────────────────────────────────────┘

1. CONSTRUCTION
   Editor.make()
   └─ Create Editor instance
   └─ Initialize empty plugin stores
   └─ Create Ctx + Container + Clock

2. CONFIGURATION
   .use(plugins)
   └─ Register plugins to userStore

   .config(fn)
   └─ Register config function

3. CREATION
   .create()
   ├─ Load system plugins (10 internal)
   │  ├─ config: inject user config
   │  ├─ init: prepare initial slices
   │  ├─ schema: build PM schema from nodes/marks
   │  ├─ parser: create markdown→PM parser
   │  ├─ serializer: create PM→markdown serializer
   │  ├─ commands: initialize CommandManager
   │  ├─ keymap: initialize KeymapManager
   │  ├─ editorState: create ProseMirror EditorState
   │  ├─ editorView: create EditorView, mount to DOM
   │  └─ pasteRule: setup paste rule handling
   │
   ├─ Load user plugins
   │  └─ Execute in dependency order (wait for timers)
   │
   └─ Wait for EditorViewReady
   └─ Return Editor instance

4. ACTIVE (Interactive)
   User interactions → Events → Transactions → State updates → View re-renders

5. DESTRUCTION
   editor.destroy()
   ├─ Call plugin cleanup functions (reverse order)
   ├─ Destroy ProseMirror EditorView
   ├─ Clear Ctx container
   └─ Reset clock timers
```

---

## Initialization Workflow

### Step-by-Step Initialization

#### Step 1: Editor Construction

```typescript
import { Editor } from '@milkdown/core'

const editor = Editor.make()
```

**What happens:**
1. Creates `Editor` instance
2. Initializes `systemStore` with 10 internal plugins
3. Initializes empty `userStore`
4. Creates `Ctx` with fresh `Container` and `Clock`

**Code location:** `packages/core/src/editor.ts:50-70`

---

#### Step 2: Plugin Registration

```typescript
import { commonmark } from '@milkdown/preset-commonmark'

editor.use(commonmark)
```

**What happens:**
1. Plugins added to `userStore`
2. Each plugin is wrapped in a `PluginRecord` with metadata
3. No execution yet—just registration

**Code location:** `packages/core/src/editor.ts:100-110`

**Alternative: Direct array**
```typescript
editor.use([plugin1, plugin2, plugin3])
```

---

#### Step 3: Configuration

```typescript
editor.config((ctx) => {
  ctx.set(defaultValueCtx.key, '# Hello Milkdown')
  ctx.set(rootCtx.key, document.getElementById('editor'))
})
```

**What happens:**
1. Config function stored
2. Executed during `create()` after `config` plugin loads
3. Can inject/override any slice values

**Code location:** `packages/core/src/editor.ts:120-130`

---

#### Step 4: Creation & Plugin Execution

```typescript
await editor.create()
```

**Detailed execution flow:**

```
create() called
    │
    ├─ 1. Execute config function
    │      └─ User slices injected into Ctx
    │
    ├─ 2. Load systemStore plugins
    │      │
    │      ├─ config plugin
    │      │  └─ Records ConfigTimer
    │      │  └─ Marks ConfigTimer done
    │      │
    │      ├─ init plugin
    │      │  └─ Waits for [ConfigTimer]
    │      │  └─ Injects default slices
    │      │  └─ Marks InitTimer done
    │      │
    │      ├─ schema plugin
    │      │  └─ Waits for [InitTimer]
    │      │  └─ Collects node/mark specs from plugins
    │      │  └─ Builds ProseMirror Schema
    │      │  └─ Injects schema into schemaCtx
    │      │  └─ Marks SchemaTimer done
    │      │
    │      ├─ parser plugin
    │      │  └─ Waits for [SchemaTimer]
    │      │  └─ Creates ParserState
    │      │  └─ Injects parser function
    │      │  └─ Marks ParserTimer done
    │      │
    │      ├─ serializer plugin
    │      │  └─ Waits for [SchemaTimer]
    │      │  └─ Creates SerializerState
    │      │  └─ Injects serializer function
    │      │  └─ Marks SerializerTimer done
    │      │
    │      ├─ commands plugin
    │      │  └─ Waits for [SchemaTimer]
    │      │  └─ Creates CommandManager
    │      │  └─ Injects into commandsCtx
    │      │  └─ Marks CommandsTimer done
    │      │
    │      ├─ keymap plugin
    │      │  └─ Waits for [SchemaTimer]
    │      │  └─ Creates KeymapManager
    │      │  └─ Injects into keymapCtx
    │      │  └─ Marks KeymapTimer done
    │      │
    │      ├─ editorState plugin
    │      │  └─ Waits for [SchemaTimer, ParserTimer, CommandsTimer, KeymapTimer]
    │      │  └─ Parses defaultValue to ProseMirror doc
    │      │  └─ Creates EditorState with schema, doc, plugins
    │      │  └─ Injects into editorStateCtx
    │      │  └─ Marks EditorStateTimer done
    │      │
    │      ├─ editorView plugin
    │      │  └─ Waits for [EditorStateTimer]
    │      │  └─ Creates ProseMirror EditorView
    │      │  └─ Mounts to rootCtx DOM element
    │      │  └─ Injects into editorViewCtx
    │      │  └─ Marks EditorViewTimer done
    │      │
    │      └─ pasteRule plugin
    │         └─ Waits for [EditorViewTimer]
    │         └─ Sets up paste rule plugin
    │         └─ Marks PasteRuleTimer done
    │
    ├─ 3. Load userStore plugins
    │      └─ Execute each plugin's runner
    │      └─ Wait for declared timer dependencies
    │
    ├─ 4. Wait for EditorViewReady timer
    │
    └─ 5. Return editor instance
```

**Code location:** `packages/core/src/editor.ts:140-200`

---

### DOM Structure Created

After `create()`, the DOM looks like:

```html
<div id="milkdown-root">              <!-- rootCtx element -->
  <div class="milkdown">              <!-- Created by editorView plugin -->
    <div class="editor" role="textbox">
      <div contenteditable="true">    <!-- ProseMirror EditorView.dom -->
        <!-- Editor content rendered here -->
        <h1>Hello Milkdown</h1>
      </div>
    </div>
  </div>
</div>
```

---

## Rendering Pipeline

### Markdown → Editor → DOM

```
┌─────────────────────────────────────────────────────────────┐
│                  RENDERING PIPELINE                         │
└─────────────────────────────────────────────────────────────┘

INPUT: Markdown String
    │
    ▼
STEP 1: Remark Parse
    │   remark.parse(markdown)
    │
    ▼
Remark AST (mdast)
    │   Example:
    │   {
    │     type: 'root',
    │     children: [
    │       {
    │         type: 'heading',
    │         depth: 1,
    │         children: [
    │           { type: 'text', value: 'Hello' }
    │         ]
    │       }
    │     ]
    │   }
    │
    ▼
STEP 2: ParserState Transform
    │   For each mdast node:
    │     1. Match node.type to schema spec
    │     2. Call spec.parseMarkdown.runner()
    │     3. Build ProseMirror node on stack
    │
    ▼
ProseMirror Document
    │   Example:
    │   doc(
    │     heading({ level: 1 },
    │       text('Hello')
    │     )
    │   )
    │
    ▼
STEP 3: EditorState Creation
    │   EditorState.create({
    │     schema,
    │     doc,
    │     plugins: [...]
    │   })
    │
    ▼
STEP 4: EditorView Rendering
    │   EditorView creates/updates DOM:
    │     1. Call node.toDOM() for each node
    │     2. Build HTML elements
    │     3. Mount to container
    │
    ▼
DOM Output
    │   <div contenteditable>
    │     <h1>Hello</h1>
    │   </div>
```

### Detailed Parsing Example

**Input Markdown:**
```markdown
# Heading

This is a **bold** paragraph.
```

**Step 1: Remark AST**
```javascript
{
  type: 'root',
  children: [
    {
      type: 'heading',
      depth: 1,
      children: [
        { type: 'text', value: 'Heading' }
      ]
    },
    {
      type: 'paragraph',
      children: [
        { type: 'text', value: 'This is a ' },
        {
          type: 'strong',
          children: [
            { type: 'text', value: 'bold' }
          ]
        },
        { type: 'text', value: ' paragraph.' }
      ]
    }
  ]
}
```

**Step 2: ParserState Execution**
```typescript
// Processing root node
state.openNode(docType)

// Processing heading
state.openNode(headingType, { level: 1 })
  state.addNode(textType, {}, 'Heading')
state.closeNode()

// Processing paragraph
state.openNode(paragraphType)
  state.addNode(textType, {}, 'This is a ')

  // Processing strong (mark)
  state.openMark(boldMark)
    state.addNode(textType, {}, 'bold')
  state.closeMark(boldMark)

  state.addNode(textType, {}, ' paragraph.')
state.closeNode()

state.closeNode()
```

**Step 3: ProseMirror Document**
```typescript
const doc = schema.node('doc', null, [
  schema.node('heading', { level: 1 }, [
    schema.text('Heading')
  ]),
  schema.node('paragraph', null, [
    schema.text('This is a '),
    schema.text('bold', [schema.mark('bold')]),
    schema.text(' paragraph.')
  ])
])
```

**Step 4: DOM Rendering**
```html
<div contenteditable>
  <h1>Heading</h1>
  <p>This is a <strong>bold</strong> paragraph.</p>
</div>
```

---

## Edit Operations

### User Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  EDIT OPERATION FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. USER INPUT
   User types, clicks, or pastes
   └─ Browser fires DOM event

2. EVENT CAPTURE
   ProseMirror EditorView captures event
   └─ Input handlers, keymap, paste handlers

3. RULE MATCHING
   Check if input matches any:
   ├─ Input Rules (e.g., "# " → heading)
   ├─ Keymap (e.g., "Mod-b" → bold)
   └─ Paste Rules (e.g., paste URL → link)

4. COMMAND EXECUTION
   Matched rule executes command
   └─ Command creates Transaction

5. TRANSACTION DISPATCH
   Transaction applied to EditorState
   └─ newState = oldState.apply(tr)

6. STATE UPDATE
   EditorView.updateState(newState)
   └─ Triggers view re-render

7. DOM UPDATE
   ProseMirror updates changed nodes only
   └─ Efficient, minimal DOM manipulation

8. LISTENERS NOTIFIED
   Plugins listen to transactions
   └─ Update external state (React, Vue, etc.)
```

### Example: Typing "# Hello"

```typescript
// User types: "# Hello"

// After typing "# "
InputRule matches pattern /^#\s/
    │
    ▼
Create transaction:
  tr.replaceWith(
    from: 0,
    to: 2,  // "# " length
    node: schema.nodes.heading.create({ level: 1 })
  )
    │
    ▼
Dispatch transaction
    │
    ▼
EditorState updated
  Old: doc(paragraph(text("# ")))
  New: doc(heading({ level: 1 }, text("")))
    │
    ▼
EditorView re-renders
  Old DOM: <p># </p>
  New DOM: <h1></h1>
    │
    ▼
User continues typing "Hello"
    │
    ▼
Text inserted into heading
  doc(heading({ level: 1 }, text("Hello")))
    │
    ▼
DOM updated: <h1>Hello</h1>
```

---

## Command Execution

### Command Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                   COMMAND EXECUTION                         │
└─────────────────────────────────────────────────────────────┘

1. COMMAND INVOCATION
   editor.action(callCommand('CommandKey', payload))
   └─ Dispatches action to Ctx

2. ACTION HANDLER
   callCommand action handler executes
   └─ ctx.get(commandsCtx)

3. COMMAND LOOKUP
   CommandManager.get('CommandKey')
   └─ Returns command function or undefined

4. COMMAND EXECUTION
   command(payload)(state, dispatch, view)
   │
   ├─ Check if command can execute
   │  └─ Return false if not applicable
   │
   └─ Create and dispatch transaction
      └─ Return true if successful

5. TRANSACTION APPLICATION
   EditorState.apply(tr)
   └─ New state created

6. VIEW UPDATE
   EditorView.updateState(newState)
   └─ DOM re-rendered
```

### Command Signature

```typescript
type Command = (payload?: any) => ProseMirrorCommand

type ProseMirrorCommand = (
  state: EditorState,
  dispatch?: (tr: Transaction) => void,
  view?: EditorView
) => boolean
```

### Example Command Execution

```typescript
// Define command
const toggleBold = $command('ToggleBold', (ctx) => {
  return () => (state, dispatch, view) => {
    const { schema, selection } = state
    const { from, to } = selection
    const mark = schema.marks.bold

    if (!mark) return false  // Can't execute

    const hasMark = state.doc.rangeHasMark(from, to, mark)

    if (dispatch) {
      const tr = state.tr
      if (hasMark) {
        tr.removeMark(from, to, mark)
      } else {
        tr.addMark(from, to, mark.create())
      }
      dispatch(tr)
    }

    return true  // Success
  }
})

// Use in editor
Editor.make()
  .use(toggleBold)
  .create()

// Execute command
editor.action(callCommand('ToggleBold'))

// Or bind to keymap
const keymap = {
  'Mod-b': (state, dispatch, view) => {
    return ctx.get(commandsCtx).call('ToggleBold')
  }
}
```

---

## Event System

### Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      EVENT SYSTEM                           │
└─────────────────────────────────────────────────────────────┘

DOM Event (click, keydown, paste, etc.)
    │
    ▼
ProseMirror EditorView captures event
    │
    ├─ handleDOMEvents (custom handlers)
    ├─ handleClick, handleDoubleClick, etc.
    ├─ handleKeyDown (keymap)
    └─ handlePaste (paste handlers)
    │
    ▼
Event Handler decides action
    │
    ├─ If handled: prevent default, return true
    └─ If not handled: allow default, return false
    │
    ▼
Handler may create Transaction
    │
    └─ dispatch(tr)
    │
    ▼
Transaction applied → State updated
    │
    ▼
View re-renders
    │
    ▼
Plugin listeners notified
    │
    ├─ appendTransaction hooks
    ├─ filterTransaction hooks
    └─ Transaction hooks
```

### Listener Plugin

Milkdown provides a listener plugin for easy event handling:

```typescript
import { listener, listenerCtx } from '@milkdown/plugin-listener'

Editor.make()
  .use(listener)
  .config((ctx) => {
    const listener = ctx.get(listenerCtx)

    // Listen to markdown updates
    listener.markdownUpdated((ctx, markdown, prevMarkdown) => {
      console.log('Markdown changed:', markdown)
    })

    // Listen to editor state changes
    listener.updated((ctx, doc, prevDoc) => {
      console.log('Document changed')
    })

    // Listen to selection changes
    listener.selectionUpdate((ctx, selection) => {
      console.log('Selection:', selection)
    })

    // Listen to blur/focus
    listener.blur((ctx) => {
      console.log('Editor lost focus')
    })

    listener.focus((ctx) => {
      console.log('Editor focused')
    })
  })
  .create()
```

### Custom Transaction Listeners

```typescript
// Create custom plugin with transaction listener
const myPlugin = (ctx: Ctx) => {
  return async () => {
    const view = ctx.get(editorViewCtx)

    // Listen to all transactions
    const originalDispatch = view.dispatch
    view.dispatch = (tr: Transaction) => {
      console.log('Transaction:', tr)

      // Check transaction metadata
      if (tr.getMeta('myPlugin')) {
        console.log('My plugin transaction!')
      }

      // Call original dispatch
      originalDispatch(tr)
    }
  }
}
```

---

## API Reference

### Editor Class

**Location:** `packages/core/src/editor.ts`

#### Constructor

```typescript
class Editor {
  constructor()
}

// Usage
const editor = Editor.make()
```

#### Methods

##### `.use(plugins)`

Register plugins.

```typescript
use(...plugins: MilkdownPlugin[]): Editor

// Usage
editor.use(commonmark)
editor.use(plugin1, plugin2, plugin3)
editor.use([plugin1, plugin2])
```

##### `.config(fn)`

Configure editor before creation.

```typescript
config(fn: (ctx: Ctx) => void): Editor

// Usage
editor.config((ctx) => {
  ctx.set(defaultValueCtx.key, '# Hello')
  ctx.set(rootCtx.key, document.getElementById('app'))
})
```

##### `.create()`

Create and mount the editor.

```typescript
async create(): Promise<Editor>

// Usage
await editor.create()
```

##### `.destroy()`

Destroy the editor and clean up resources.

```typescript
destroy(): void

// Usage
editor.destroy()
```

##### `.action(fn)`

Execute an action in the editor context.

```typescript
action<T>(fn: (ctx: Ctx) => T): T

// Usage
const markdown = editor.action(getMarkdown())
editor.action(setMarkdown('# New content'))
editor.action(callCommand('Bold'))
```

---

### Ctx (Context) API

**Location:** `packages/ctx/src/ctx.ts`

#### Methods

##### `.inject(slice, value?)`

Inject a slice with value.

```typescript
inject<T>(slice: Slice<T>, value?: T): Ctx

// Usage
ctx.inject(mySlice, myValue)
```

##### `.get(slice)`

Get a slice value.

```typescript
get<T>(slice: Slice<T>): T

// Usage
const value = ctx.get(mySlice)
```

##### `.set(key, value)`

Update a slice value.

```typescript
set<T>(key: symbol, value: T): Ctx

// Usage
ctx.set(mySlice.key, newValue)
```

##### `.record(timer)`

Record a timer.

```typescript
record(timer: Timer): Ctx

// Usage
ctx.record(MyTimer)
```

##### `.done(timer)`

Mark a timer as done.

```typescript
done(timer: Timer): Ctx

// Usage
ctx.done(MyTimer)
```

##### `.waitTimers(timers)`

Wait for timers to complete.

```typescript
async waitTimers(timers: Timer[]): Promise<void>

// Usage
await ctx.waitTimers([SchemaTimer, ParserTimer])
```

---

### CommandManager API

**Location:** `packages/core/src/internal-plugin/commands.ts`

#### Methods

##### `.create(key, command)`

Register a command.

```typescript
create(key: string, command: Command): CommandManager

// Usage
const manager = ctx.get(commandsCtx)
manager.create('MyCommand', myCommand)
```

##### `.get(key)`

Get a command.

```typescript
get(key: string): Command | undefined

// Usage
const command = manager.get('MyCommand')
```

##### `.call(key, payload?)`

Execute a command.

```typescript
call(key: string, payload?: any): boolean

// Usage
const success = manager.call('MyCommand', payload)
```

##### `.remove(key)`

Remove a command.

```typescript
remove(key: string): CommandManager

// Usage
manager.remove('MyCommand')
```

---

### Actions API

#### `callCommand(key, payload?)`

Execute a command.

```typescript
import { callCommand } from '@milkdown/utils'

// Usage
editor.action(callCommand('Bold'))
editor.action(callCommand('InsertTable', { rows: 3, cols: 4 }))
```

#### `getMarkdown()`

Get current markdown content.

```typescript
import { getMarkdown } from '@milkdown/utils'

// Usage
const markdown = editor.action(getMarkdown())
console.log(markdown)  // "# Hello\n\nWorld"
```

#### `setMarkdown(markdown)`

Set markdown content.

```typescript
import { setMarkdown } from '@milkdown/utils'

// Usage
editor.action(setMarkdown('# New Content'))
```

#### `getHTML()`

Get current HTML content.

```typescript
import { getHTML } from '@milkdown/utils'

// Usage
const html = editor.action(getHTML())
console.log(html)  // "<h1>Hello</h1><p>World</p>"
```

---

### ParserState API

**Location:** `packages/transformer/src/parser/state.ts`

Used in `parseMarkdown.runner()` functions.

#### Methods

##### `.openNode(type, attrs?, content?)`

Open a new node on the stack.

```typescript
openNode(type: NodeType, attrs?: Attrs, content?: Node[]): this

// Usage
state.openNode(type, { level: 1 })
```

##### `.addNode(type, attrs?, content?)`

Add a node to current parent.

```typescript
addNode(type: NodeType, attrs?: Attrs, content?: Node[]): this

// Usage
state.addNode(schema.nodes.text, {}, 'Hello')
```

##### `.closeNode()`

Close current node (pop from stack).

```typescript
closeNode(): Node

// Usage
const node = state.closeNode()
```

##### `.openMark(mark)`

Add a mark to the mark set.

```typescript
openMark(mark: Mark): this

// Usage
state.openMark(schema.marks.bold.create())
```

##### `.closeMark(mark)`

Remove a mark from the mark set.

```typescript
closeMark(mark: Mark): this

// Usage
state.closeMark(schema.marks.bold.create())
```

##### `.next(children)`

Process child nodes recursively.

```typescript
next(children: mdast.Node[]): this

// Usage
state.next(node.children)
```

---

### SerializerState API

**Location:** `packages/transformer/src/serializer/state.ts`

Used in `toMarkdown.runner()` functions.

#### Methods

##### `.openNode(type, value?, data?)`

Open a new mdast node on the stack.

```typescript
openNode(type: string, value?: string, data?: any): this

// Usage
state.openNode('heading', undefined, { depth: 1 })
```

##### `.addNode(type, value?, data?)`

Add an mdast node to current parent.

```typescript
addNode(type: string, value?: string, data?: any): this

// Usage
state.addNode('text', 'Hello')
```

##### `.closeNode()`

Close current node (pop from stack).

```typescript
closeNode(): mdast.Node

// Usage
const node = state.closeNode()
```

##### `.next(content)`

Process ProseMirror content recursively.

```typescript
next(content: Fragment): this

// Usage
state.next(node.content)
```

##### `.withMark(mark, type, data?)`

Wrap content in a mark node.

```typescript
withMark(mark: Mark, type: string, data?: any): this

// Usage
state.withMark(mark, 'strong')
```

---

## Lifecycle Hooks

### Plugin Lifecycle Hooks

```typescript
const myPlugin = (ctx: Ctx) => {
  // SETUP PHASE (synchronous)
  console.log('1. Setup')
  ctx.inject(mySlice, value)
  ctx.record(MyTimer)

  // Return RUNNER (async)
  return async () => {
    console.log('2. Run')
    await ctx.waitTimers([DependencyTimer])

    // Do work
    console.log('3. Execute')

    ctx.done(MyTimer)

    // Return CLEANUP (optional)
    return () => {
      console.log('4. Cleanup')
      // Clean up resources
    }
  }
}
```

### Transaction Hooks

ProseMirror plugins can use transaction hooks:

```typescript
import { Plugin } from '@milkdown/prose/state'

const myPMPlugin = new Plugin({
  // Filter transactions (can prevent)
  filterTransaction(tr, state) {
    // Return false to prevent transaction
    return true
  },

  // Append transactions (chain additional changes)
  appendTransaction(transactions, oldState, newState) {
    // Return transaction to apply after
    return null
  },

  // View updates
  view(editorView) {
    return {
      update(view, prevState) {
        console.log('View updated')
      },
      destroy() {
        console.log('View destroyed')
      }
    }
  }
})
```

---

## Summary

### Key Workflows

1. **Initialization**: `make() → use() → config() → create()`
2. **Rendering**: `Markdown → remark AST → ProseMirror Doc → DOM`
3. **Editing**: `Input → Rule Match → Command → Transaction → State Update → View Re-render`
4. **Commands**: `action(callCommand()) → CommandManager → Transaction → State Update`
5. **Export**: `Doc → SerializerState → remark AST → Markdown`

### Important Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `Editor.make()` | Create editor instance | Editor |
| `.use(plugins)` | Register plugins | Editor |
| `.config(fn)` | Configure editor | Editor |
| `.create()` | Create & mount editor | Promise<Editor> |
| `.destroy()` | Destroy editor | void |
| `.action(fn)` | Execute action | T |
| `ctx.get(slice)` | Get slice value | T |
| `ctx.set(key, value)` | Update slice | Ctx |
| `callCommand(key)` | Execute command | boolean |
| `getMarkdown()` | Get markdown | string |
| `setMarkdown(md)` | Set markdown | void |

### Execution Order

```
System Plugins:
  config → init → schema → parser/serializer/commands/keymap
  → editorState → editorView → pasteRule

User Plugins:
  Execute after system plugins, in dependency order
```

---

## References

- **Core**: `packages/core/src/editor.ts`
- **Ctx**: `packages/ctx/src/ctx.ts`
- **Parser**: `packages/transformer/src/parser/state.ts`
- **Serializer**: `packages/transformer/src/serializer/state.ts`
- **Commands**: `packages/core/src/internal-plugin/commands.ts`
- **Utils**: `packages/utils/src/`
