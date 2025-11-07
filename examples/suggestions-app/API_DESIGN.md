# Suggestions API Design

## Overview

This document defines the API for the Milkdown Suggestions feature, which allows users to:
1. Request AI-powered suggestions for their content
2. View word-level diffs between original and suggested content
3. Accept or reject individual suggestions

---

## API Endpoints

### POST /api/suggestions

Generate suggestions for the provided content.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "content": "string",          // Original markdown content
  "type": "string",              // Suggestion type: "improve", "grammar", "simplify", "expand"
  "context": {                   // Optional context
    "tone": "string",            // "professional", "casual", "technical"
    "audience": "string"         // Target audience description
  }
}
```

**Example:**
```json
{
  "content": "# Introduction\n\nThis is a basic introduction to our product.",
  "type": "improve",
  "context": {
    "tone": "professional",
    "audience": "technical users"
  }
}
```

#### Response

**Success (200 OK):**
```json
{
  "id": "string",                // Unique suggestion ID
  "original": "string",          // Original content
  "suggested": "string",         // Suggested content
  "changes": [                   // Array of changes
    {
      "id": "string",            // Unique change ID
      "type": "addition" | "deletion" | "modification",
      "position": {
        "start": number,         // Start offset in original
        "end": number            // End offset in original
      },
      "original": "string",      // Original text (for deletion/modification)
      "suggested": "string",     // Suggested text (for addition/modification)
      "reason": "string"         // Explanation for the change
    }
  ],
  "metadata": {
    "timestamp": "string",       // ISO 8601 timestamp
    "model": "string",           // AI model used
    "confidence": number         // 0-1 confidence score
  }
}
```

**Example:**
```json
{
  "id": "sug_abc123",
  "original": "# Introduction\n\nThis is a basic introduction to our product.",
  "suggested": "# Introduction\n\nThis is a comprehensive introduction to our innovative product.",
  "changes": [
    {
      "id": "chg_001",
      "type": "modification",
      "position": {
        "start": 26,
        "end": 31
      },
      "original": "basic",
      "suggested": "comprehensive",
      "reason": "More professional and descriptive"
    },
    {
      "id": "chg_002",
      "type": "addition",
      "position": {
        "start": 58,
        "end": 58
      },
      "original": "",
      "suggested": "innovative ",
      "reason": "Adds value proposition"
    }
  ],
  "metadata": {
    "timestamp": "2025-11-07T10:30:00Z",
    "model": "gpt-4",
    "confidence": 0.92
  }
}
```

**Error (400 Bad Request):**
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Content is required",
    "details": {}
  }
}
```

**Error (500 Internal Server Error):**
```json
{
  "error": {
    "code": "GENERATION_FAILED",
    "message": "Failed to generate suggestions",
    "details": {
      "reason": "AI service timeout"
    }
  }
}
```

---

## Data Models

### Suggestion

```typescript
interface Suggestion {
  id: string
  original: string
  suggested: string
  changes: Change[]
  metadata: SuggestionMetadata
}
```

### Change

```typescript
interface Change {
  id: string
  type: 'addition' | 'deletion' | 'modification'
  position: {
    start: number
    end: number
  }
  original: string
  suggested: string
  reason: string
}
```

### SuggestionMetadata

```typescript
interface SuggestionMetadata {
  timestamp: string
  model: string
  confidence: number
}
```

---

## Suggestion Types

### 1. Improve (`type: "improve"`)

Enhances overall content quality:
- Better word choices
- Clearer phrasing
- Stronger impact

**Example:**
```
Original: "This is a good product."
Suggested: "This is an exceptional product."
```

### 2. Grammar (`type: "grammar"`)

Fixes grammatical errors:
- Subject-verb agreement
- Tense consistency
- Punctuation

**Example:**
```
Original: "The team are working on it."
Suggested: "The team is working on it."
```

### 3. Simplify (`type: "simplify"`)

Makes content more accessible:
- Simpler vocabulary
- Shorter sentences
- Clearer structure

**Example:**
```
Original: "We utilize cutting-edge methodologies."
Suggested: "We use modern methods."
```

### 4. Expand (`type: "expand"`)

Adds more detail:
- Additional context
- Examples
- Elaboration

**Example:**
```
Original: "Our product is fast."
Suggested: "Our product delivers lightning-fast performance, processing requests in under 100ms."
```

---

## Word-Level Diff Algorithm

### Algorithm Overview

The diff calculation uses a modified Myers' diff algorithm optimized for words:

```typescript
function calculateWordDiff(original: string, suggested: string): Change[] {
  // 1. Tokenize into words
  const originalWords = tokenize(original)
  const suggestedWords = tokenize(suggested)

  // 2. Calculate LCS (Longest Common Subsequence)
  const lcs = longestCommonSubsequence(originalWords, suggestedWords)

  // 3. Generate changes from LCS
  const changes = generateChanges(originalWords, suggestedWords, lcs)

  // 4. Merge adjacent changes
  const merged = mergeAdjacentChanges(changes)

  return merged
}
```

### Tokenization

Words are tokenized with context:

```typescript
function tokenize(text: string): Token[] {
  // Split on whitespace and punctuation
  // Preserve punctuation as separate tokens
  // Track original positions
}

interface Token {
  text: string
  position: { start: number; end: number }
  type: 'word' | 'punctuation' | 'whitespace'
}
```

### Change Types

1. **Addition**: Word exists in suggested, not in original
2. **Deletion**: Word exists in original, not in suggested
3. **Modification**: Word changed from original to suggested

---

## Response Examples

### Example 1: Grammar Correction

**Request:**
```json
{
  "content": "The team are working on they're project.",
  "type": "grammar"
}
```

**Response:**
```json
{
  "id": "sug_gram001",
  "original": "The team are working on they're project.",
  "suggested": "The team is working on their project.",
  "changes": [
    {
      "id": "chg_001",
      "type": "modification",
      "position": { "start": 9, "end": 12 },
      "original": "are",
      "suggested": "is",
      "reason": "Subject-verb agreement: 'team' is singular"
    },
    {
      "id": "chg_002",
      "type": "modification",
      "position": { "start": 27, "end": 34 },
      "original": "they're",
      "suggested": "their",
      "reason": "Possessive pronoun required"
    }
  ],
  "metadata": {
    "timestamp": "2025-11-07T10:35:00Z",
    "model": "grammar-check-v1",
    "confidence": 0.98
  }
}
```

### Example 2: Content Improvement

**Request:**
```json
{
  "content": "Our app is good and fast.",
  "type": "improve",
  "context": {
    "tone": "professional"
  }
}
```

**Response:**
```json
{
  "id": "sug_imp001",
  "original": "Our app is good and fast.",
  "suggested": "Our application delivers exceptional performance with lightning-fast response times.",
  "changes": [
    {
      "id": "chg_001",
      "type": "modification",
      "position": { "start": 0, "end": 7 },
      "original": "Our app",
      "suggested": "Our application",
      "reason": "More professional terminology"
    },
    {
      "id": "chg_002",
      "type": "modification",
      "position": { "start": 8, "end": 25 },
      "original": "is good and fast",
      "suggested": "delivers exceptional performance with lightning-fast response times",
      "reason": "More specific and impactful description"
    }
  ],
  "metadata": {
    "timestamp": "2025-11-07T10:40:00Z",
    "model": "gpt-4",
    "confidence": 0.89
  }
}
```

### Example 3: Simplification

**Request:**
```json
{
  "content": "We utilize state-of-the-art methodologies to facilitate optimization.",
  "type": "simplify"
}
```

**Response:**
```json
{
  "id": "sug_simp001",
  "original": "We utilize state-of-the-art methodologies to facilitate optimization.",
  "suggested": "We use modern methods to improve performance.",
  "changes": [
    {
      "id": "chg_001",
      "type": "modification",
      "position": { "start": 3, "end": 10 },
      "original": "utilize",
      "suggested": "use",
      "reason": "Simpler, more direct word"
    },
    {
      "id": "chg_002",
      "type": "modification",
      "position": { "start": 11, "end": 38 },
      "original": "state-of-the-art methodologies",
      "suggested": "modern methods",
      "reason": "Clearer, less jargon"
    },
    {
      "id": "chg_003",
      "type": "modification",
      "position": { "start": 42, "end": 71 },
      "original": "facilitate optimization",
      "suggested": "improve performance",
      "reason": "More straightforward phrasing"
    }
  ],
  "metadata": {
    "timestamp": "2025-11-07T10:45:00Z",
    "model": "simplify-v1",
    "confidence": 0.95
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Missing or invalid request parameters |
| `CONTENT_TOO_LONG` | 400 | Content exceeds maximum length (10,000 chars) |
| `INVALID_TYPE` | 400 | Invalid suggestion type |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `GENERATION_FAILED` | 500 | Failed to generate suggestions |
| `SERVICE_UNAVAILABLE` | 503 | AI service temporarily unavailable |

---

## Rate Limiting

```
Rate Limit: 10 requests per minute per IP
Headers:
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 7
  X-RateLimit-Reset: 1636284000
```

---

## Implementation Notes

### Backend Implementation

```typescript
// Express route handler
app.post('/api/suggestions', async (req, res) => {
  try {
    const { content, type, context } = req.body

    // Validate
    if (!content || !type) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Content and type are required'
        }
      })
    }

    // Generate suggestions
    const suggestion = await generateSuggestions(content, type, context)

    // Return response
    res.json(suggestion)
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'GENERATION_FAILED',
        message: error.message
      }
    })
  }
})
```

### Frontend Integration

```typescript
// React hook for suggestions
const useSuggestions = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const getSuggestions = async (content: string, type: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type })
      })

      if (!response.ok) {
        throw new Error('Failed to get suggestions')
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { getSuggestions, loading, error }
}
```

---

## Security Considerations

1. **Input Validation**: Sanitize content before processing
2. **Rate Limiting**: Prevent abuse via rate limiting
3. **Content Length**: Limit maximum content size
4. **CORS**: Configure appropriate CORS headers
5. **Authentication**: Add API key authentication for production

---

## Future Enhancements

1. **Batch Suggestions**: Support multiple content pieces
2. **Custom Rules**: Allow user-defined suggestion rules
3. **Suggestion History**: Store and retrieve past suggestions
4. **Collaborative Suggestions**: Multi-user suggestion review
5. **AI Model Selection**: Allow users to choose AI models

---

## Testing

### Unit Tests

```typescript
describe('Suggestions API', () => {
  it('should generate suggestions for valid content', async () => {
    const response = await request(app)
      .post('/api/suggestions')
      .send({ content: 'Test content', type: 'improve' })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('id')
    expect(response.body).toHaveProperty('changes')
  })

  it('should return 400 for missing content', async () => {
    const response = await request(app)
      .post('/api/suggestions')
      .send({ type: 'improve' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_REQUEST')
  })
})
```

### Integration Tests

```typescript
describe('E2E Suggestions Flow', () => {
  it('should complete full suggestion workflow', async () => {
    // 1. Request suggestions
    const suggestion = await getSuggestions('Test', 'improve')

    // 2. Verify structure
    expect(suggestion.changes.length).toBeGreaterThan(0)

    // 3. Apply changes
    const result = applyChanges(suggestion.original, suggestion.changes)

    // 4. Verify result matches suggested
    expect(result).toBe(suggestion.suggested)
  })
})
```

---

## API Versioning

Current version: **v1**

Base URL: `https://api.example.com/v1`

Future versions will be accessible via:
- `https://api.example.com/v2`
- `https://api.example.com/v3`

---

## Summary

This API provides:
- ✅ Simple, RESTful interface
- ✅ Word-level diff tracking
- ✅ Multiple suggestion types
- ✅ Comprehensive error handling
- ✅ Extensible design

**Next Steps**: Implement backend service and integrate with Milkdown editor.
