# Milkdown Basic Tutorial

## Table of Contents
1. [Overview](#overview)
2. [Hello World Editor](#hello-world-editor)
3. [Understanding the Pipeline](#understanding-the-pipeline)
4. [Adding Features](#adding-features)
5. [Configuration Options](#configuration-options)
6. [Working with Content](#working-with-content)
7. [Styling the Editor](#styling-the-editor)
8. [Common Patterns](#common-patterns)

---

## Overview

This tutorial walks you through creating a Milkdown editor from scratch, explaining each step and the rationale behind it. By the end, you'll understand:

- How to set up a basic editor
- The rendering pipeline (Markdown → Editor → Output)
- Common configuration options
- How to interact with the editor programmatically

**Time to Complete**: 30-45 minutes

**Prerequisites**:
- React project set up ([see Installation Guide](./04-installation-guide-react.md))
- Basic React knowledge (hooks, components)
- Basic Markdown knowledge

---

## Hello World Editor

### Step 1: Create Project Structure

```bash
# Create directories
mkdir -p src/components
mkdir -p src/styles

# File structure we'll create:
# src/
# ├── components/
# │   └── MilkdownEditor.tsx
# ├── styles/
# │   └── editor.css
# └── App.tsx
```

---

### Step 2: Minimal Editor Component

Create `src/components/MilkdownEditor.tsx`:

```typescript
import { FC } from 'react'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { Editor, rootCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { nord } from '@milkdown/theme-nord'

// Import theme styles
import '@milkdown/theme-nord/style.css'

export const MilkdownEditor: FC = () => {
  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
      })
      .use(nord)
      .use(commonmark)
  )

  return <Milkdown />
}
```

**What's happening here?**

1. **`useEditor` hook**: Creates and manages the editor instance
2. **`Editor.make()`**: Starts the editor builder chain
3. **`.config()`**: Configures the editor (sets the DOM root)
4. **`.use(nord)`**: Applies Nord theme
5. **`.use(commonmark)`**: Adds CommonMark support (headings, lists, etc.)
6. **`<Milkdown />`**: Renders the editor to the DOM

---

### Step 3: Use in App

Update `src/App.tsx`:

```typescript
import { FC } from 'react'
import { MilkdownProvider } from '@milkdown/react'
import { MilkdownEditor } from './components/MilkdownEditor'

const App: FC = () => {
  return (
    <MilkdownProvider>
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>My Milkdown Editor</h1>
        <MilkdownEditor />
      </div>
    </MilkdownProvider>
  )
}

export default App
```

**Why `MilkdownProvider`?**

- Provides React context for editor instances
- Required wrapper for all Milkdown components
- Allows multiple editors on one page to share context

---

### Step 4: Run and Test

```bash
npm start
```

**You should see:**
- Empty editor with Nord theme styling
- Cursor blinking, ready for input
- No errors in console

**Try typing:**
```markdown
# Hello World

This is my **first** Milkdown editor!

- Feature 1
- Feature 2
```

**Expected Result:**
- "Hello World" renders as `<h1>`
- "first" renders as bold text
- List items render as `<ul><li>`

---

## Understanding the Pipeline

### The Rendering Flow

Let's trace what happens when you type `# Hello`:

```
┌─────────────────────────────────────────────────────────────┐
│                    RENDERING PIPELINE                       │
└─────────────────────────────────────────────────────────────┘

USER INPUT: Types "# Hello"
    │
    ▼
INPUT RULE MATCHES: Pattern /^#\s/ detected
    │
    ▼
MARKDOWN TO AST:
    {
      type: 'heading',
      depth: 1,
      children: [
        { type: 'text', value: 'Hello' }
      ]
    }
    │
    ▼
AST TO PROSEMIRROR:
    doc(
      heading({ level: 1 }, text('Hello'))
    )
    │
    ▼
PROSEMIRROR TO DOM:
    <h1>Hello</h1>
    │
    ▼
DOM RENDERED: User sees heading
```

### The Reverse Flow (Export)

When you export content:

```
DOM (contenteditable)
    │
    ▼
ProseMirror Document
    │
    ▼
Remark AST
    {
      type: 'heading',
      depth: 1,
      children: [{ type: 'text', value: 'Hello' }]
    }
    │
    ▼
Markdown String
    "# Hello"
```

**Key Insight**: Milkdown maintains **lossless bidirectional conversion** between Markdown and the editor state.

---

## Adding Features

### Feature 1: Default Content

Let's add initial content:

```typescript
import { defaultValueCtx } from '@milkdown/core'

useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)

      // Set default content
      ctx.set(defaultValueCtx, `# Welcome to Milkdown

This is a **WYSIWYG** markdown editor.

## Features

- Easy to use
- Markdown support
- Beautiful themes

Try editing this text!`)
    })
    .use(nord)
    .use(commonmark)
)
```

**Result**: Editor now starts with pre-populated content.

---

### Feature 2: History (Undo/Redo)

Install plugin:
```bash
npm install @milkdown/plugin-history
```

Add to editor:

```typescript
import { history } from '@milkdown/plugin-history'

useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
    })
    .use(nord)
    .use(commonmark)
    .use(history)  // Add history plugin
)
```

**Test it:**
- Type some text
- Press `Cmd/Ctrl + Z` to undo
- Press `Cmd/Ctrl + Shift + Z` to redo

**How it works:**
- History plugin tracks all transactions
- Builds undo/redo stack
- Keybindings automatically registered

---

### Feature 3: Listening to Changes

Install listener plugin:
```bash
npm install @milkdown/plugin-listener
```

Use it:

```typescript
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { useState } from 'react'

export const MilkdownEditor: FC = () => {
  const [markdown, setMarkdown] = useState('')

  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
      })
      .config((ctx) => {
        // Listen to markdown updates
        const listener = ctx.get(listenerCtx)

        listener.markdownUpdated((ctx, markdown) => {
          console.log('Markdown updated:', markdown)
          setMarkdown(markdown)
        })
      })
      .use(nord)
      .use(commonmark)
      .use(listener)
  )

  return (
    <div>
      <Milkdown />

      {/* Show live markdown */}
      <div style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5' }}>
        <h3>Live Markdown Output:</h3>
        <pre>{markdown}</pre>
      </div>
    </div>
  )
}
```

**Result**: As you type, the markdown output updates in real-time below the editor.

---

### Feature 4: Programmatic Control

Let's add buttons to interact with the editor:

```typescript
import { useEditor } from '@milkdown/react'
import { getMarkdown, setMarkdown } from '@milkdown/utils'

export const MilkdownEditor: FC = () => {
  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
      })
      .use(nord)
      .use(commonmark)
  )

  const handleGetMarkdown = () => {
    const editor = get()
    if (!editor) return

    const markdown = editor.action(getMarkdown())
    console.log('Current markdown:', markdown)
    alert(markdown)
  }

  const handleSetMarkdown = () => {
    const editor = get()
    if (!editor) return

    editor.action(setMarkdown('# New Content\n\nThis was set programmatically!'))
  }

  const handleClear = () => {
    const editor = get()
    if (!editor) return

    editor.action(setMarkdown(''))
  }

  return (
    <div>
      <div style={{ marginBottom: '10px', gap: '10px', display: 'flex' }}>
        <button onClick={handleGetMarkdown}>Get Markdown</button>
        <button onClick={handleSetMarkdown}>Set Content</button>
        <button onClick={handleClear}>Clear</button>
      </div>

      <Milkdown />
    </div>
  )
}
```

**How it works:**

1. **`get()` function**: Returns editor instance (or undefined if not ready)
2. **`editor.action()`**: Executes actions in editor context
3. **`getMarkdown()`**: Retrieves current markdown
4. **`setMarkdown(content)`**: Sets new content

---

### Feature 5: GitHub Flavored Markdown

Want tables, task lists, and strikethrough?

Install GFM preset:
```bash
npm install @milkdown/preset-gfm
```

Replace commonmark with gfm:

```typescript
import { gfm } from '@milkdown/preset-gfm'

useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
    })
    .use(nord)
    .use(gfm)  // Use GFM instead of commonmark
)
```

**Now you can use:**

```markdown
# Task List
- [x] Completed task
- [ ] Pending task

# Table
| Name | Age |
|------|-----|
| John | 30  |
| Jane | 25  |

# Strikethrough
~~This is deleted~~
```

---

## Configuration Options

### Common Configurations

```typescript
import {
  defaultValueCtx,
  editorViewOptionsCtx,
  rootDOMCtx
} from '@milkdown/core'

useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      // 1. Set root element
      ctx.set(rootCtx, root)

      // 2. Set default content
      ctx.set(defaultValueCtx, '# Hello')

      // 3. Configure editor view options
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        attributes: {
          class: 'my-editor',
          spellcheck: 'false'
        }
      }))
    })
    .use(nord)
    .use(commonmark)
)
```

---

### Read-Only Mode

```typescript
import { editorViewOptionsCtx } from '@milkdown/core'

const ReadOnlyEditor: FC<{ content: string }> = ({ content }) => {
  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, content)

        // Make read-only
        ctx.update(editorViewOptionsCtx, (prev) => ({
          ...prev,
          editable: () => false
        }))
      })
      .use(nord)
      .use(commonmark)
  )

  return <Milkdown />
}
```

---

### Custom Placeholder

```typescript
import { editorViewOptionsCtx } from '@milkdown/core'
import { Plugin } from '@milkdown/prose/state'
import { Decoration, DecorationSet } from '@milkdown/prose/view'

const placeholderPlugin = (text: string) => {
  return () => (ctx) => {
    return () => {
      return new Plugin({
        props: {
          decorations(state) {
            const doc = state.doc
            if (
              doc.childCount === 1 &&
              doc.firstChild?.isTextblock &&
              doc.firstChild?.content.size === 0
            ) {
              return DecorationSet.create(doc, [
                Decoration.widget(1, () => {
                  const placeholder = document.createElement('span')
                  placeholder.className = 'placeholder'
                  placeholder.textContent = text
                  return placeholder
                })
              ])
            }
            return DecorationSet.empty
          }
        }
      })
    }
  }
}

// Use it
useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root)
    })
    .use(nord)
    .use(commonmark)
    .use(placeholderPlugin('Type something...'))
)

// Add CSS
/*
.placeholder {
  color: #aaa;
  pointer-events: none;
  position: absolute;
}
*/
```

---

## Working with Content

### Getting Content in Different Formats

```typescript
import { getMarkdown, getHTML } from '@milkdown/utils'

const MyEditor: FC = () => {
  const { get } = useEditor(/* ... */)

  const exportContent = () => {
    const editor = get()
    if (!editor) return

    // Get as Markdown
    const markdown = editor.action(getMarkdown())
    console.log('Markdown:', markdown)

    // Get as HTML
    const html = editor.action(getHTML())
    console.log('HTML:', html)

    // Get as JSON (ProseMirror document)
    const json = editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      return view.state.doc.toJSON()
    })
    console.log('JSON:', json)
  }

  return (
    <div>
      <button onClick={exportContent}>Export</button>
      <Milkdown />
    </div>
  )
}
```

---

### Setting Content from Different Sources

```typescript
import { setMarkdown } from '@milkdown/utils'

const MyEditor: FC = () => {
  const { get } = useEditor(/* ... */)

  const loadFromLocalStorage = () => {
    const editor = get()
    if (!editor) return

    const saved = localStorage.getItem('editor-content')
    if (saved) {
      editor.action(setMarkdown(saved))
    }
  }

  const loadFromAPI = async () => {
    const editor = get()
    if (!editor) return

    const response = await fetch('/api/document/123')
    const data = await response.json()

    editor.action(setMarkdown(data.content))
  }

  useEffect(() => {
    loadFromLocalStorage()
  }, [])

  return <Milkdown />
}
```

---

### Auto-Save

```typescript
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { useRef, useEffect } from 'react'

const AutoSaveEditor: FC = () => {
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
      })
      .config((ctx) => {
        const listener = ctx.get(listenerCtx)

        listener.markdownUpdated((ctx, markdown) => {
          // Debounce saves
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
          }

          saveTimeoutRef.current = setTimeout(() => {
            localStorage.setItem('editor-content', markdown)
            console.log('Auto-saved!')
          }, 1000)
        })
      })
      .use(nord)
      .use(commonmark)
      .use(listener)
  )

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return <Milkdown />
}
```

---

## Styling the Editor

### Custom CSS

Create `src/styles/editor.css`:

```css
/* Container */
.milkdown {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Editor content */
.milkdown .editor {
  min-height: 300px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
}

/* Headings */
.milkdown h1 {
  font-size: 2em;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 0.5em;
  color: #1a1a1a;
}

.milkdown h2 {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.5em;
  color: #1a1a1a;
}

/* Paragraphs */
.milkdown p {
  margin: 0.5em 0;
}

/* Lists */
.milkdown ul,
.milkdown ol {
  padding-left: 2em;
  margin: 0.5em 0;
}

.milkdown li {
  margin: 0.25em 0;
}

/* Code blocks */
.milkdown pre {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  overflow-x: auto;
  font-family: 'Fira Code', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
}

/* Inline code */
.milkdown code {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 2px 6px;
  font-family: 'Fira Code', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

/* Blockquotes */
.milkdown blockquote {
  border-left: 4px solid #3b82f6;
  padding-left: 1em;
  margin: 1em 0;
  color: #666;
  font-style: italic;
}

/* Links */
.milkdown a {
  color: #3b82f6;
  text-decoration: none;
  border-bottom: 1px solid #3b82f6;
}

.milkdown a:hover {
  border-bottom: 2px solid #3b82f6;
}

/* Focus */
.milkdown .editor:focus {
  outline: none;
}

/* Selection */
.milkdown ::selection {
  background: #b4d5fe;
}
```

Import in component:

```typescript
import '../styles/editor.css'
```

---

### Dark Mode Support

```css
/* Light mode (default) */
.milkdown {
  background: #ffffff;
  color: #333333;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .milkdown {
    background: #1e1e1e;
    color: #e0e0e0;
    border-color: #404040;
  }

  .milkdown h1,
  .milkdown h2 {
    color: #ffffff;
  }

  .milkdown pre,
  .milkdown code {
    background: #2d2d2d;
    border-color: #404040;
  }

  .milkdown blockquote {
    border-left-color: #60a5fa;
    color: #b0b0b0;
  }

  .milkdown a {
    color: #60a5fa;
    border-bottom-color: #60a5fa;
  }
}
```

Or use a dark theme:

```bash
npm install @milkdown/theme-tokyo
```

```typescript
import { tokyo } from '@milkdown/theme-tokyo'
import '@milkdown/theme-tokyo/style.css'

useEditor((root) =>
  Editor.make()
    .use(tokyo)  // Dark theme
    .use(commonmark)
)
```

---

## Common Patterns

### Pattern 1: Controlled Component

```typescript
import { FC, useState, useEffect } from 'react'
import { setMarkdown, getMarkdown } from '@milkdown/utils'

interface ControlledEditorProps {
  value: string
  onChange: (value: string) => void
}

export const ControlledEditor: FC<ControlledEditorProps> = ({
  value,
  onChange
}) => {
  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, value)
      })
      .config((ctx) => {
        const listener = ctx.get(listenerCtx)
        listener.markdownUpdated((ctx, markdown) => {
          onChange(markdown)
        })
      })
      .use(nord)
      .use(commonmark)
      .use(listener)
  )

  // Sync external value changes
  useEffect(() => {
    const editor = get()
    if (!editor) return

    const current = editor.action(getMarkdown())
    if (current !== value) {
      editor.action(setMarkdown(value))
    }
  }, [value])

  return <Milkdown />
}

// Usage
const App = () => {
  const [content, setContent] = useState('# Hello')

  return (
    <ControlledEditor
      value={content}
      onChange={setContent}
    />
  )
}
```

---

### Pattern 2: Multiple Editors

```typescript
const App: FC = () => {
  return (
    <MilkdownProvider>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h2>Editor 1</h2>
          <MilkdownEditor key="editor-1" />
        </div>

        <div>
          <h2>Editor 2</h2>
          <MilkdownEditor key="editor-2" />
        </div>
      </div>
    </MilkdownProvider>
  )
}
```

**Important:** Each editor needs a unique `key` prop.

---

### Pattern 3: Editor with Toolbar

```typescript
import { FC } from 'react'
import { callCommand } from '@milkdown/utils'

const Toolbar: FC<{ editor: Editor | undefined }> = ({ editor }) => {
  const exec = (command: string) => {
    if (!editor) return
    editor.action(callCommand(command))
  }

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '8px',
      borderBottom: '1px solid #e0e0e0',
      background: '#f9f9f9'
    }}>
      <button onClick={() => exec('ToggleBold')}>
        <strong>B</strong>
      </button>
      <button onClick={() => exec('ToggleItalic')}>
        <em>I</em>
      </button>
      <button onClick={() => exec('ToggleInlineCode')}>
        <code>Code</code>
      </button>
      <button onClick={() => exec('WrapInHeading', { level: 1 })}>H1</button>
      <button onClick={() => exec('WrapInHeading', { level: 2 })}>H2</button>
      <button onClick={() => exec('WrapInBulletList')}>• List</button>
    </div>
  )
}

const EditorWithToolbar: FC = () => {
  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => ctx.set(rootCtx, root))
      .use(nord)
      .use(commonmark)
  )

  return (
    <div>
      <Toolbar editor={get()} />
      <Milkdown />
    </div>
  )
}
```

---

### Pattern 4: Lazy Loading

```typescript
import { lazy, Suspense } from 'react'

const LazyEditor = lazy(() => import('./components/MilkdownEditor'))

const App: FC = () => {
  return (
    <MilkdownProvider>
      <Suspense fallback={<div>Loading editor...</div>}>
        <LazyEditor />
      </Suspense>
    </MilkdownProvider>
  )
}
```

---

## Summary

### What You Learned

✅ **Basic Setup**: Created a minimal Milkdown editor
✅ **Pipeline Understanding**: Markdown → AST → ProseMirror → DOM
✅ **Features**: Added history, listeners, programmatic control
✅ **Configuration**: Default content, read-only, placeholders
✅ **Content Management**: Get/set markdown, auto-save
✅ **Styling**: Custom CSS, dark mode, themes
✅ **Patterns**: Controlled components, multiple editors, toolbars

### Next Steps

Now you can:
1. **Build custom features** → See [Design Patterns Guide](./02-design-patterns.md)
2. **Create custom nodes/marks** → See [Architecture Analysis](./01-architecture-analysis.md)
3. **Build the suggestions app** → Continue to Phase 3

---

## Complete Example

Here's a full-featured editor component:

```typescript
import { FC, useState, useEffect, useRef } from 'react'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { nord } from '@milkdown/theme-nord'
import { history } from '@milkdown/plugin-history'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { getMarkdown, setMarkdown } from '@milkdown/utils'

import '@milkdown/theme-nord/style.css'

const MilkdownEditor: FC = () => {
  const [markdown, setMarkdownState] = useState('')
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)

        // Load saved content
        const saved = localStorage.getItem('editor-content')
        ctx.set(defaultValueCtx, saved || '# Welcome!\n\nStart typing...')
      })
      .config((ctx) => {
        const listener = ctx.get(listenerCtx)

        listener.markdownUpdated((ctx, markdown) => {
          setMarkdownState(markdown)

          // Auto-save with debounce
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
          }

          saveTimeoutRef.current = setTimeout(() => {
            localStorage.setItem('editor-content', markdown)
          }, 1000)
        })
      })
      .use(nord)
      .use(commonmark)
      .use(history)
      .use(listener)
  )

  const handleClear = () => {
    const editor = get()
    if (editor) {
      editor.action(setMarkdown(''))
      localStorage.removeItem('editor-content')
    }
  }

  const handleExport = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'document.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div>
      <div style={{
        marginBottom: '10px',
        display: 'flex',
        gap: '10px',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleClear}>Clear</button>
          <button onClick={handleExport}>Export Markdown</button>
        </div>
        <span style={{ fontSize: '12px', color: '#666' }}>
          {markdown.length} characters
        </span>
      </div>

      <Milkdown />
    </div>
  )
}

export default function App() {
  return (
    <MilkdownProvider>
      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <h1>My Advanced Milkdown Editor</h1>
        <MilkdownEditor />
      </div>
    </MilkdownProvider>
  )
}
```

**This example includes:**
- ✅ Auto-save to localStorage
- ✅ Character count
- ✅ Export to markdown file
- ✅ Clear button
- ✅ History (undo/redo)
- ✅ Live markdown preview

---

**You're now ready to build amazing things with Milkdown! 🥛⬇️**

**Next**: [Phase 3 - Building the Suggestions Feature →](#)
