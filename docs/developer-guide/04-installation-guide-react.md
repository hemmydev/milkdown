# Milkdown Installation Guide for React

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation Methods](#installation-methods)
3. [Quick Start](#quick-start)
4. [Package Overview](#package-overview)
5. [Environment Setup](#environment-setup)
6. [Verification Checklist](#verification-checklist)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended | Check Command |
|----------|----------------|-------------|---------------|
| Node.js | 16.x | 18.x or 20.x | `node --version` |
| npm | 8.x | 9.x or 10.x | `npm --version` |
| React | 17.x | 18.x | Check `package.json` |

### Check Your Environment

```bash
# Check Node.js version
node --version
# Expected output: v18.x.x or v20.x.x

# Check npm version
npm --version
# Expected output: 9.x.x or 10.x.x

# Alternative: Use pnpm (recommended)
npm install -g pnpm
pnpm --version
# Expected output: 8.x.x
```

### System Requirements

- **OS**: macOS, Windows, Linux
- **RAM**: Minimum 4GB, recommended 8GB
- **Disk Space**: ~500MB for node_modules
- **Browser**: Modern browser with ES6+ support

---

## Installation Methods

### Method 1: Create React App (Recommended for Beginners)

```bash
# Create new React app
npx create-react-app milkdown-app
cd milkdown-app

# Install Milkdown packages
npm install @milkdown/core @milkdown/ctx @milkdown/react
npm install @milkdown/preset-commonmark @milkdown/theme-nord

# Install peer dependencies
npm install react react-dom

# Start development server
npm start
```

**Verification:**
- App should open at `http://localhost:3000`
- No compilation errors in console
- Ready to add Milkdown editor

---

### Method 2: Vite (Recommended for Production)

```bash
# Create Vite React app
npm create vite@latest milkdown-app -- --template react-ts
cd milkdown-app

# Install dependencies
npm install

# Install Milkdown packages
npm install @milkdown/core @milkdown/ctx @milkdown/react
npm install @milkdown/preset-commonmark @milkdown/theme-nord
npm install @milkdown/plugin-listener

# Start development server
npm run dev
```

**Verification:**
- App should open at `http://localhost:5173`
- Fast Hot Module Replacement (HMR)
- TypeScript support out of the box

---

### Method 3: Next.js (For Server-Side Rendering)

```bash
# Create Next.js app
npx create-next-app@latest milkdown-app
cd milkdown-app

# Select options:
# ✓ TypeScript: Yes
# ✓ ESLint: Yes
# ✓ Tailwind CSS: Yes (optional)
# ✓ src/ directory: Yes (recommended)
# ✓ App Router: Yes
# ✓ Import alias: No

# Install Milkdown packages
npm install @milkdown/core @milkdown/ctx @milkdown/react
npm install @milkdown/preset-commonmark @milkdown/theme-nord

# Start development server
npm run dev
```

**Important Note for Next.js:**
Milkdown uses browser APIs, so you need to use dynamic imports:

```typescript
// app/page.tsx
'use client'

import dynamic from 'next/dynamic'

const MilkdownEditor = dynamic(
  () => import('@/components/MilkdownEditor'),
  { ssr: false }
)

export default function Home() {
  return <MilkdownEditor />
}
```

---

### Method 4: Add to Existing React Project

```bash
# Navigate to your project
cd your-react-project

# Install Milkdown packages
npm install @milkdown/core @milkdown/ctx @milkdown/react
npm install @milkdown/preset-commonmark @milkdown/theme-nord
npm install @milkdown/plugin-listener

# Optional: Install additional plugins
npm install @milkdown/plugin-history
npm install @milkdown/plugin-cursor
npm install @milkdown/plugin-clipboard
```

---

## Quick Start

### Minimal Setup (Functional Component)

Create `src/components/Editor.jsx`:

```jsx
import { Editor, rootCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { nord } from '@milkdown/theme-nord'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { useEffect } from 'react'

// Import theme CSS
import '@milkdown/theme-nord/style.css'

function MilkdownEditor() {
  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
      })
      .use(nord)
      .use(commonmark)
  )

  return <Milkdown />
}

export default function App() {
  return (
    <MilkdownProvider>
      <MilkdownEditor />
    </MilkdownProvider>
  )
}
```

### With TypeScript

Create `src/components/Editor.tsx`:

```typescript
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { nord } from '@milkdown/theme-nord'
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { FC } from 'react'

import '@milkdown/theme-nord/style.css'

const MilkdownEditor: FC = () => {
  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, '# Hello Milkdown')
      })
      .use(nord)
      .use(commonmark)
  )

  return <Milkdown />
}

const App: FC = () => {
  return (
    <MilkdownProvider>
      <MilkdownEditor />
    </MilkdownProvider>
  )
}

export default App
```

---

## Package Overview

### Core Packages (Required)

```json
{
  "dependencies": {
    "@milkdown/core": "^7.0.0",
    "@milkdown/ctx": "^7.0.0",
    "@milkdown/react": "^7.0.0"
  }
}
```

**Purpose:**
- `@milkdown/core`: Main editor engine
- `@milkdown/ctx`: Context and dependency injection
- `@milkdown/react`: React integration hooks

---

### Preset Packages (Choose One or More)

```json
{
  "dependencies": {
    "@milkdown/preset-commonmark": "^7.0.0",
    "@milkdown/preset-gfm": "^7.0.0"
  }
}
```

**Purpose:**
- `preset-commonmark`: Standard Markdown support (headings, lists, bold, italic, etc.)
- `preset-gfm`: GitHub Flavored Markdown (tables, task lists, strikethrough, etc.)

**Recommendation:** Start with `preset-commonmark`, add `preset-gfm` if you need GitHub features.

---

### Theme Packages (Required)

```json
{
  "dependencies": {
    "@milkdown/theme-nord": "^7.0.0"
  }
}
```

**Available Themes:**
- `@milkdown/theme-nord`: Nord color scheme (recommended)
- `@milkdown/theme-tokyo`: Tokyo Night theme
- Custom themes: You can create your own

**Important:** Always import theme CSS:
```javascript
import '@milkdown/theme-nord/style.css'
```

---

### Plugin Packages (Optional)

```json
{
  "dependencies": {
    "@milkdown/plugin-listener": "^7.0.0",
    "@milkdown/plugin-history": "^7.0.0",
    "@milkdown/plugin-cursor": "^7.0.0",
    "@milkdown/plugin-clipboard": "^7.0.0",
    "@milkdown/plugin-tooltip": "^7.0.0",
    "@milkdown/plugin-slash": "^7.0.0",
    "@milkdown/plugin-emoji": "^7.0.0"
  }
}
```

**Plugin Descriptions:**

| Plugin | Purpose | When to Use |
|--------|---------|-------------|
| `plugin-listener` | Listen to editor events | Need to sync state with React |
| `plugin-history` | Undo/redo | Almost always |
| `plugin-cursor` | Cursor drop position | Better UX |
| `plugin-clipboard` | Enhanced copy/paste | Recommended |
| `plugin-tooltip` | Selection toolbar | Rich text features |
| `plugin-slash` | Slash command menu | Quick node insertion |
| `plugin-emoji` | Emoji picker | Emoji support |

---

### Utility Packages

```json
{
  "dependencies": {
    "@milkdown/utils": "^7.0.0",
    "@milkdown/prose": "^7.0.0"
  }
}
```

**Purpose:**
- `@milkdown/utils`: Helper functions (`getMarkdown`, `setMarkdown`, `callCommand`)
- `@milkdown/prose`: ProseMirror re-exports (for advanced usage)

---

## Environment Setup

### 1. TypeScript Configuration

If using TypeScript, update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

---

### 2. Webpack Configuration (Create React App)

If you need custom webpack config, eject or use `react-app-rewired`:

```bash
npm install react-app-rewired --save-dev
```

Create `config-overrides.js`:

```javascript
module.exports = function override(config, env) {
  // Allow CSS imports from node_modules
  config.module.rules[1].oneOf.forEach((rule) => {
    if (rule.test && rule.test.toString().includes('css')) {
      rule.exclude = /\.module\.css$/
    }
  })

  return config
}
```

Update `package.json`:

```json
{
  "scripts": {
    "start": "react-app-rewired start",
    "build": "react-app-rewired build",
    "test": "react-app-rewired test"
  }
}
```

---

### 3. Vite Configuration

For Vite projects, update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@milkdown/core',
      '@milkdown/ctx',
      '@milkdown/react',
      '@milkdown/preset-commonmark',
      '@milkdown/theme-nord'
    ]
  }
})
```

---

### 4. CSS Setup

**Option A: Import in Component**

```jsx
// src/components/Editor.jsx
import '@milkdown/theme-nord/style.css'
```

**Option B: Import in Main CSS**

```css
/* src/index.css or src/App.css */
@import '@milkdown/theme-nord/style.css';
```

**Option C: Import in HTML**

```html
<!-- public/index.html -->
<link rel="stylesheet" href="https://unpkg.com/@milkdown/theme-nord/style.css">
```

---

### 5. Environment Variables

Create `.env.local`:

```bash
# API endpoint for suggestions feature (Phase 3)
REACT_APP_API_URL=http://localhost:3001

# Enable debug mode
REACT_APP_DEBUG=true
```

Access in code:

```javascript
const API_URL = process.env.REACT_APP_API_URL
```

---

## Verification Checklist

### ✅ Installation Verification

Run these checks to verify your setup:

#### 1. Package Installation

```bash
npm list @milkdown/core @milkdown/react @milkdown/preset-commonmark
```

**Expected Output:**
```
├── @milkdown/core@7.x.x
├── @milkdown/react@7.x.x
└── @milkdown/preset-commonmark@7.x.x
```

#### 2. TypeScript Types

```bash
npm list @types/react @types/react-dom
```

**Expected Output:**
```
├── @types/react@18.x.x
└── @types/react-dom@18.x.x
```

#### 3. Development Server

```bash
npm start
# or
npm run dev
```

**Expected Output:**
- Server starts without errors
- No TypeScript compilation errors
- Browser opens automatically

#### 4. Basic Editor Test

Add this to `App.jsx` and verify:

```jsx
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { nord } from '@milkdown/theme-nord'
import '@milkdown/theme-nord/style.css'

function EditorComponent() {
  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, '# Test Editor\n\nHello **Milkdown**!')
      })
      .use(nord)
      .use(commonmark)
  )

  return <Milkdown />
}

export default function App() {
  return (
    <MilkdownProvider>
      <div style={{ padding: '20px' }}>
        <EditorComponent />
      </div>
    </MilkdownProvider>
  )
}
```

**Expected Result:**
- Editor renders with "Test Editor" heading
- "Milkdown" appears in bold
- Editor is interactive (you can type)

---

### ✅ Feature Verification

#### Test Basic Editing

1. **Type text**: Should appear immediately
2. **Bold**: Select text, press `Cmd/Ctrl + B`
3. **Italic**: Select text, press `Cmd/Ctrl + I`
4. **Heading**: Type `# ` at start of line
5. **List**: Type `- ` at start of line

#### Test Markdown

1. Type: `# Heading 1`
2. Type: `## Heading 2`
3. Type: `**bold text**`
4. Type: `*italic text*`
5. Type: `- List item`

All should render correctly.

---

## Troubleshooting

### Common Issues

#### Issue 1: "Cannot find module '@milkdown/core'"

**Cause:** Package not installed

**Solution:**
```bash
npm install @milkdown/core @milkdown/ctx @milkdown/react
```

---

#### Issue 2: Editor doesn't render

**Cause:** Missing theme CSS

**Solution:**
```jsx
import '@milkdown/theme-nord/style.css'
```

---

#### Issue 3: TypeScript errors

**Cause:** Missing type definitions

**Solution:**
```bash
npm install --save-dev @types/react @types/react-dom
```

---

#### Issue 4: "root is not defined"

**Cause:** Not using `MilkdownProvider`

**Solution:**
```jsx
<MilkdownProvider>
  <YourEditorComponent />
</MilkdownProvider>
```

---

#### Issue 5: Hot reload not working

**Cause:** React hooks rules violation

**Solution:** Make sure `useEditor` is called at component top level:

```jsx
// ❌ Wrong
function Editor() {
  if (condition) {
    useEditor(...)  // Don't call hooks conditionally
  }
}

// ✅ Correct
function Editor() {
  useEditor(...)  // Always call at top level
}
```

---

#### Issue 6: CSS conflicts

**Cause:** CSS specificity issues

**Solution:** Wrap editor in container:

```jsx
<div className="milkdown-container">
  <Milkdown />
</div>
```

```css
.milkdown-container .milkdown {
  /* Your custom styles */
}
```

---

#### Issue 7: Slow performance

**Cause:** Re-rendering too often

**Solution:** Memoize editor config:

```jsx
import { useMemo } from 'react'

function Editor() {
  const editor = useMemo(
    () => (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
        })
        .use(nord)
        .use(commonmark),
    []
  )

  useEditor(editor)

  return <Milkdown />
}
```

---

#### Issue 8: Next.js "window is not defined"

**Cause:** SSR trying to access browser APIs

**Solution:** Use dynamic import:

```jsx
import dynamic from 'next/dynamic'

const Editor = dynamic(() => import('./Editor'), {
  ssr: false
})
```

---

### Debug Mode

Enable debug logging:

```jsx
Editor.make()
  .config((ctx) => {
    // Enable debug mode
    if (process.env.NODE_ENV === 'development') {
      window.milkdownDebug = true
    }
  })
  .use(commonmark)
```

---

### Check Browser Console

Look for:
- ❌ Red errors (critical issues)
- ⚠️ Yellow warnings (potential issues)
- ℹ️ Info logs (helpful for debugging)

Common error messages:
- "Timer X is not ready": Plugin dependency issue
- "Cannot read property 'schema'": Editor not fully initialized
- "Slice X not found": Missing plugin or incorrect initialization

---

## Next Steps

✅ Installation complete!

Now you can:
1. **Read the Basic Tutorial** → [05-basic-tutorial.md](./05-basic-tutorial.md)
2. **Explore Design Patterns** → [02-design-patterns.md](./02-design-patterns.md)
3. **Start building features** → Phase 3 of this guide

---

## Version Compatibility

### Milkdown v7.x

```json
{
  "peerDependencies": {
    "react": "^17.0.0 || ^18.0.0",
    "react-dom": "^17.0.0 || ^18.0.0"
  }
}
```

### Recommended Versions (Tested)

| Package | Version |
|---------|---------|
| React | 18.2.0 |
| React DOM | 18.2.0 |
| TypeScript | 5.0.0+ |
| Node.js | 18.x or 20.x |
| Vite | 5.x |

---

## Additional Resources

- **Official Docs**: https://milkdown.dev
- **GitHub**: https://github.com/Saul-Mirone/milkdown
- **Examples**: https://github.com/Saul-Mirone/milkdown/tree/main/examples
- **Discord**: https://discord.gg/milkdown

---

## Summary

### Installation Commands (Quick Reference)

```bash
# Using npm
npm install @milkdown/core @milkdown/ctx @milkdown/react
npm install @milkdown/preset-commonmark @milkdown/theme-nord

# Using yarn
yarn add @milkdown/core @milkdown/ctx @milkdown/react
yarn add @milkdown/preset-commonmark @milkdown/theme-nord

# Using pnpm
pnpm add @milkdown/core @milkdown/ctx @milkdown/react
pnpm add @milkdown/preset-commonmark @milkdown/theme-nord
```

### Minimal Code (Copy & Paste)

```jsx
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react'
import { Editor, rootCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { nord } from '@milkdown/theme-nord'
import '@milkdown/theme-nord/style.css'

function EditorComponent() {
  useEditor((root) =>
    Editor.make()
      .config((ctx) => ctx.set(rootCtx, root))
      .use(nord)
      .use(commonmark)
  )
  return <Milkdown />
}

export default function App() {
  return (
    <MilkdownProvider>
      <EditorComponent />
    </MilkdownProvider>
  )
}
```

---

**You're ready to start building with Milkdown! 🥛⬇️**
