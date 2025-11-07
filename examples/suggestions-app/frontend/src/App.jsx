import { useState } from 'react'
import { MilkdownProvider } from '@milkdown/react'
import EditorWithSuggestions from './components/EditorWithSuggestions'
import './App.css'

function App() {
  return (
    <MilkdownProvider>
      <div className="app">
        <header className="app-header">
          <h1>🥛 Milkdown Suggestions App</h1>
          <p>AI-powered writing suggestions with word-level diff tracking</p>
        </header>

        <main className="app-main">
          <EditorWithSuggestions />
        </main>

        <footer className="app-footer">
          <p>Built with Milkdown • Powered by React</p>
        </footer>
      </div>
    </MilkdownProvider>
  )
}

export default App
