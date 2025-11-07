import { useState, useCallback } from 'react'
import { Milkdown, useEditor } from '@milkdown/react'
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core'
import { commonmark } from '@milkdown/preset-commonmark'
import { nord } from '@milkdown/theme-nord'
import { history } from '@milkdown/plugin-history'
import { listener, listenerCtx } from '@milkdown/plugin-listener'
import { getMarkdown, setMarkdown } from '@milkdown/utils'

import SuggestionPanel from './SuggestionPanel'
import DiffHighlighter from './DiffHighlighter'
import { useSuggestions } from '../hooks/useSuggestions'

import '@milkdown/theme-nord/style.css'
import './EditorWithSuggestions.css'

const DEFAULT_CONTENT = `# Welcome to Milkdown Suggestions

This is a good app for writing. Try getting suggestions to improve your content!

## Features

- Get AI-powered suggestions
- View word-level diffs
- Accept or reject changes
- Multiple suggestion types

Type your content below and click "Get Suggestions" to see how it can be improved.`

function EditorWithSuggestions() {
  const [currentContent, setCurrentContent] = useState(DEFAULT_CONTENT)
  const [suggestion, setSuggestion] = useState(null)
  const [selectedChangeIds, setSelectedChangeIds] = useState(new Set())

  const { getSuggestions, loading, error } = useSuggestions()

  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, DEFAULT_CONTENT)
      })
      .config((ctx) => {
        const listener = ctx.get(listenerCtx)
        listener.markdownUpdated((ctx, markdown) => {
          setCurrentContent(markdown)
        })
      })
      .use(nord)
      .use(commonmark)
      .use(history)
      .use(listener)
  )

  const handleGetSuggestions = useCallback(async (type) => {
    try {
      const result = await getSuggestions(currentContent, type)
      setSuggestion(result)
      setSelectedChangeIds(new Set())
    } catch (err) {
      console.error('Failed to get suggestions:', err)
    }
  }, [currentContent, getSuggestions])

  const handleAcceptChange = useCallback((changeId) => {
    setSelectedChangeIds(prev => {
      const next = new Set(prev)
      next.add(changeId)
      return next
    })
  }, [])

  const handleRejectChange = useCallback((changeId) => {
    setSelectedChangeIds(prev => {
      const next = new Set(prev)
      next.delete(changeId)
      return next
    })
  }, [])

  const handleAcceptAll = useCallback(() => {
    if (!suggestion) return

    const allChangeIds = new Set(suggestion.changes.map(c => c.id))
    setSelectedChangeIds(allChangeIds)
  }, [suggestion])

  const handleRejectAll = useCallback(() => {
    setSelectedChangeIds(new Set())
  }, [])

  const handleApplyChanges = useCallback(() => {
    if (!suggestion) return

    const editor = get()
    if (!editor) return

    // Apply selected changes
    const acceptedChanges = suggestion.changes.filter(c =>
      selectedChangeIds.has(c.id)
    )

    // Build new content with accepted changes
    const newContent = applyChangesToContent(
      suggestion.original,
      acceptedChanges
    )

    editor.action(setMarkdown(newContent))
    setSuggestion(null)
    setSelectedChangeIds(new Set())
  }, [suggestion, selectedChangeIds, get])

  const handleClearSuggestions = useCallback(() => {
    setSuggestion(null)
    setSelectedChangeIds(new Set())
  }, [])

  return (
    <div className="editor-container">
      <div className="editor-section">
        <div className="editor-header">
          <h2>Editor</h2>
          <div className="editor-stats">
            {currentContent.length} characters
          </div>
        </div>

        <div className="editor-wrapper">
          <Milkdown />
        </div>

        {suggestion && (
          <DiffHighlighter
            original={suggestion.original}
            suggested={suggestion.suggested}
            changes={suggestion.changes}
            selectedChangeIds={selectedChangeIds}
            onAcceptChange={handleAcceptChange}
            onRejectChange={handleRejectChange}
          />
        )}
      </div>

      <SuggestionPanel
        onGetSuggestions={handleGetSuggestions}
        loading={loading}
        error={error}
        suggestion={suggestion}
        selectedChangeIds={selectedChangeIds}
        onAcceptChange={handleAcceptChange}
        onRejectChange={handleRejectChange}
        onAcceptAll={handleAcceptAll}
        onRejectAll={handleRejectAll}
        onApplyChanges={handleApplyChanges}
        onClear={handleClearSuggestions}
      />
    </div>
  )
}

/**
 * Apply selected changes to original content
 */
function applyChangesToContent(original, changes) {
  // Sort changes by position (reverse order to preserve positions)
  const sortedChanges = [...changes].sort((a, b) =>
    b.position.start - a.position.start
  )

  let result = original

  for (const change of sortedChanges) {
    const { start, end } = change.position

    if (change.type === 'addition') {
      result = result.slice(0, start) + change.suggested + result.slice(start)
    } else if (change.type === 'deletion') {
      result = result.slice(0, start) + result.slice(end)
    } else if (change.type === 'modification') {
      result = result.slice(0, start) + change.suggested + result.slice(end)
    }
  }

  return result
}

export default EditorWithSuggestions
