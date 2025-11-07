# 🥛 Milkdown Suggestions App

A production-ready application demonstrating Milkdown's capabilities with AI-powered suggestions, word-level diff tracking, and interactive change management.

![Milkdown Suggestions App](https://img.shields.io/badge/Status-Production%20Ready-success)
![License](https://img.shields.io/badge/License-MIT-blue)

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Component Structure](#component-structure)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Core Features

- **📝 Rich Text Editing**: Full-featured Markdown editor powered by Milkdown
- **🤖 AI Suggestions**: Multiple suggestion types (improve, grammar, simplify, expand)
- **🔍 Word-Level Diff**: Precise change tracking with visual highlighting
- **✅ Accept/Reject Controls**: Granular control over individual changes
- **💡 Change Reasoning**: Each suggestion comes with an explanation
- **⚡ Real-time Preview**: See changes highlighted in the editor
- **🎨 Beautiful UI**: Modern, responsive design with Nord theme

### Technical Features

- **🏗️ Modular Architecture**: Clean separation of frontend and backend
- **🔄 RESTful API**: Well-designed API with proper error handling
- **📊 Rate Limiting**: Built-in request throttling
- **🚀 Optimized Performance**: Efficient diff calculation algorithm
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **♿ Accessible**: WCAG-compliant UI components

---

## 🏛️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   MILKDOWN SUGGESTIONS APP                  │
└─────────────────────────────────────────────────────────────┘

Frontend (React + Vite)                 Backend (Node.js + Express)
┌─────────────────────┐                 ┌─────────────────────┐
│                     │                 │                     │
│  EditorWithSuggestions                │  Express Server     │
│  ├─ Milkdown Editor │                 │  ├─ Routes          │
│  ├─ SuggestionPanel │  ◄────HTTP────► │  ├─ Services        │
│  └─ DiffHighlighter │                 │  ├─ Diff Algorithm  │
│                     │                 │  └─ Rules Engine    │
└─────────────────────┘                 └─────────────────────┘
         │                                        │
         │                                        │
    Port 5173                                 Port 3001
```

### Technology Stack

**Frontend:**
- React 18.2
- Vite 5.0
- Milkdown 7.3
- Custom React hooks

**Backend:**
- Node.js 18+
- Express 4.18
- Myers' diff algorithm
- Rule-based suggestion engine

---

## 🚀 Getting Started

### Prerequisites

```bash
# Required software
Node.js >= 18.x
npm >= 9.x or pnpm >= 8.x

# Check versions
node --version
npm --version
```

### Quick Start

```bash
# Clone the repository (or navigate to project)
cd milkdown/examples/suggestions-app

# Install dependencies for both frontend and backend
cd backend && npm install
cd ../frontend && npm install

# Start backend server (Terminal 1)
cd backend
npm start

# Start frontend dev server (Terminal 2)
cd frontend
npm run dev
```

**Open**: http://localhost:5173

---

## 💻 Development

### Project Structure

```
suggestions-app/
├── backend/
│   ├── src/
│   │   ├── server.js                 # Express server
│   │   ├── routes/
│   │   │   └── suggestions.js        # API routes
│   │   ├── services/
│   │   │   └── suggestionService.js  # Business logic
│   │   ├── utils/
│   │   │   ├── diffCalculator.js     # Diff algorithm
│   │   │   └── suggestionRules.js    # Suggestion rules
│   │   └── middleware/
│   │       └── validation.js         # Request validation
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                  # Entry point
│   │   ├── App.jsx                   # Main app component
│   │   ├── components/
│   │   │   ├── EditorWithSuggestions.jsx
│   │   │   ├── SuggestionPanel.jsx
│   │   │   └── DiffHighlighter.jsx
│   │   └── hooks/
│   │       └── useSuggestions.js     # API hook
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── API_DESIGN.md                     # API documentation
└── README.md                         # This file
```

### Environment Configuration

**Backend** (`.env`):
```bash
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**Frontend** (`.env`):
```bash
VITE_API_URL=http://localhost:3001
```

### Development Workflow

```bash
# Backend development
cd backend
npm run dev          # Start with nodemon (auto-reload)
npm test             # Run tests

# Frontend development
cd frontend
npm run dev          # Start dev server with HMR
npm run build        # Production build
npm run preview      # Preview production build
```

---

## 📚 API Documentation

### POST /api/suggestions

Generate suggestions for content.

**Request:**
```json
{
  "content": "This is a good product.",
  "type": "improve",
  "context": {
    "tone": "professional"
  }
}
```

**Response:**
```json
{
  "id": "sug_abc123",
  "original": "This is a good product.",
  "suggested": "This is an excellent product.",
  "changes": [
    {
      "id": "chg_001",
      "type": "modification",
      "position": { "start": 10, "end": 14 },
      "original": "good",
      "suggested": "excellent",
      "reason": "Improves word choice"
    }
  ],
  "metadata": {
    "timestamp": "2025-11-07T10:30:00Z",
    "model": "improvement-v1",
    "confidence": 0.92
  }
}
```

**Suggestion Types:**
- `improve` - Enhance overall quality
- `grammar` - Fix grammatical errors
- `simplify` - Make content clearer
- `expand` - Add more detail

For complete API documentation, see [API_DESIGN.md](./API_DESIGN.md).

---

## 🧩 Component Structure

### EditorWithSuggestions

Main container component that orchestrates the entire application.

**Responsibilities:**
- Manages Milkdown editor instance
- Handles suggestion state
- Coordinates between editor, panel, and highlighter

**Key Features:**
- Auto-save to state
- Change tracking
- Apply/reject logic

### SuggestionPanel

Right sidebar panel for suggestion controls.

**Features:**
- Type selection buttons
- Change list with details
- Accept/reject controls
- Bulk actions (accept all, reject all)
- Loading and error states

### DiffHighlighter

Visual diff preview component.

**Features:**
- Inline change highlighting
- Color-coded change types
- Click-to-toggle acceptance
- Legend for change types

### useSuggestions Hook

Custom React hook for API interactions.

**API:**
```javascript
const { getSuggestions, loading, error } = useSuggestions()

// Get suggestions
const result = await getSuggestions(content, 'improve')
```

---

## 🔧 Customization

### Adding New Suggestion Types

1. **Update backend rules** (`backend/src/utils/suggestionRules.js`):

```javascript
export const myCustomRules = [
  {
    name: 'My custom rule',
    apply: (text) => {
      // Your transformation logic
      return transformedText
    }
  }
]
```

2. **Add to suggestionService** (`backend/src/services/suggestionService.js`):

```javascript
function selectRules(type) {
  switch (type) {
    case 'custom':
      return myCustomRules
    // ...
  }
}
```

3. **Update frontend UI** (`frontend/src/components/SuggestionPanel.jsx`):

```javascript
const SUGGESTION_TYPES = [
  // ...
  { id: 'custom', label: 'Custom', icon: '🎨', description: 'My custom type' }
]
```

### Styling

The app uses CSS modules for styling. Customize by editing:

- `frontend/src/App.css` - Global app styles
- `frontend/src/components/*.css` - Component-specific styles

**Theme customization:**
```css
/* Change primary color */
.btn-primary {
  background: #your-color;
}

/* Change editor theme */
/* Use different Milkdown theme (@milkdown/theme-tokyo, etc.) */
```

---

## 🚢 Deployment

### Production Build

**Backend:**
```bash
cd backend
npm start  # Runs production server

# Or with PM2
pm2 start src/server.js --name milkdown-api
```

**Frontend:**
```bash
cd frontend
npm run build  # Creates dist/ folder

# Serve with any static server
npx serve -s dist
```

### Docker Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=http://backend:3001
    depends_on:
      - backend
```

Run:
```bash
docker-compose up -d
```

### Environment Variables (Production)

**Backend:**
```bash
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
```

**Frontend:**
```bash
VITE_API_URL=https://api.your-domain.com
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Backend server won't start

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find process using port 3001
lsof -ti:3001

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3002
```

#### 2. Frontend can't connect to backend

**Error:** `Failed to fetch`

**Solutions:**
- Check backend is running: `curl http://localhost:3001/health`
- Verify VITE_API_URL in `.env`
- Check CORS settings in backend
- Ensure ports aren't blocked by firewall

#### 3. Diff highlighting not working

**Issue:** Changes not highlighting in preview

**Solutions:**
- Check that suggestion has changes array
- Verify change positions are correct
- Check browser console for errors
- Ensure change IDs are unique

#### 4. Rate limiting errors

**Error:** `429 Too Many Requests`

**Solutions:**
- Wait for rate limit window to reset
- Increase limits in backend config
- Implement user-specific rate limiting

#### 5. Styling issues

**Issue:** Components not displaying correctly

**Solutions:**
- Clear browser cache
- Check for CSS import errors
- Verify Milkdown theme is imported
- Check browser developer tools for CSS errors

### Debug Mode

Enable debug logging:

**Backend:**
```javascript
// server.js
app.use((req, res, next) => {
  console.log('[DEBUG]', req.method, req.path, req.body)
  next()
})
```

**Frontend:**
```javascript
// Add to component
console.log('[DEBUG] Suggestion:', suggestion)
console.log('[DEBUG] Changes:', changes)
```

---

## 📖 Learning Resources

### Related Documentation

- **[Architecture Analysis](../../docs/developer-guide/01-architecture-analysis.md)** - Understand Milkdown's architecture
- **[Design Patterns](../../docs/developer-guide/02-design-patterns.md)** - Learn core patterns
- **[Installation Guide](../../docs/developer-guide/04-installation-guide-react.md)** - Setup instructions
- **[Basic Tutorial](../../docs/developer-guide/05-basic-tutorial.md)** - Getting started

### External Resources

- [Milkdown Official Docs](https://milkdown.dev)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
- [React Documentation](https://react.dev)
- [Express Documentation](https://expressjs.com)

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests if applicable
5. Commit: `git commit -m "Add my feature"`
6. Push: `git push origin feature/my-feature`
7. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Update documentation as needed
- Test changes thoroughly
- Keep commits atomic and meaningful

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Milkdown** - Powerful WYSIWYG markdown editor
- **ProseMirror** - Robust editing framework
- **Remark** - Markdown processing
- **React** - UI library
- **Express** - Web framework
- **diff** library - Text diffing algorithm

---

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/Saul-Mirone/milkdown/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Saul-Mirone/milkdown/discussions)
- **Discord**: [Join our Discord](https://discord.gg/milkdown)

---

## 🎉 Success Criteria

✅ All phases completed:
- **Phase 1**: Architecture documentation ✓
- **Phase 2**: Installation guide & tutorial ✓
- **Phase 3**: Full application implementation ✓

✅ Features implemented:
- Milkdown editor integration ✓
- Multiple suggestion types ✓
- Word-level diff calculation ✓
- Accept/reject functionality ✓
- Real-time preview ✓
- API backend ✓

✅ Production ready:
- Error handling ✓
- Rate limiting ✓
- Responsive design ✓
- Documentation ✓

---

**Built with ❤️ using Milkdown**

Start exploring the code and building amazing things! 🚀
