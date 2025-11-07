import { diffWords } from 'diff'
import { v4 as uuidv4 } from 'uuid'

/**
 * Calculate word-level diff between original and suggested text
 * @param {string} original - Original text
 * @param {string} suggested - Suggested text
 * @returns {Array} Array of change objects
 */
export function calculateWordDiff(original, suggested) {
  // Use Myers' diff algorithm via 'diff' library
  const diff = diffWords(original, suggested)

  const changes = []
  let position = 0

  for (const part of diff) {
    if (part.added) {
      // Addition: exists in suggested, not in original
      changes.push({
        id: `chg_${uuidv4().substring(0, 8)}`,
        type: 'addition',
        position: {
          start: position,
          end: position
        },
        original: '',
        suggested: part.value,
        reason: getReasonForChange('addition', '', part.value)
      })
    } else if (part.removed) {
      // Deletion: exists in original, not in suggested
      changes.push({
        id: `chg_${uuidv4().substring(0, 8)}`,
        type: 'deletion',
        position: {
          start: position,
          end: position + part.value.length
        },
        original: part.value,
        suggested: '',
        reason: getReasonForChange('deletion', part.value, '')
      })

      position += part.value.length
    } else {
      // No change, advance position
      position += part.value.length
    }
  }

  // Merge adjacent changes into modifications
  const mergedChanges = mergeAdjacentChanges(changes)

  return mergedChanges
}

/**
 * Merge adjacent additions and deletions into modifications
 */
function mergeAdjacentChanges(changes) {
  const merged = []
  let i = 0

  while (i < changes.length) {
    const current = changes[i]

    // Check if current deletion is followed by addition
    if (
      current.type === 'deletion' &&
      i + 1 < changes.length &&
      changes[i + 1].type === 'addition' &&
      changes[i + 1].position.start === current.position.start
    ) {
      const next = changes[i + 1]

      // Merge into modification
      merged.push({
        id: `chg_${uuidv4().substring(0, 8)}`,
        type: 'modification',
        position: current.position,
        original: current.original,
        suggested: next.suggested,
        reason: getReasonForChange('modification', current.original, next.suggested)
      })

      i += 2 // Skip both changes
    } else {
      merged.push(current)
      i += 1
    }
  }

  return merged
}

/**
 * Generate reason for the change
 */
function getReasonForChange(type, original, suggested) {
  // Simple heuristic-based reasoning
  const originalLower = (original || '').toLowerCase()
  const suggestedLower = (suggested || '').toLowerCase()

  if (type === 'addition') {
    if (suggestedLower.match(/\b(innovative|exceptional|comprehensive)\b/)) {
      return 'Adds descriptive emphasis'
    }
    return 'Adds additional context'
  }

  if (type === 'deletion') {
    if (originalLower.match(/\b(very|really|quite|just)\b/)) {
      return 'Removes unnecessary modifier'
    }
    return 'Simplifies phrasing'
  }

  if (type === 'modification') {
    // Check for grammar corrections
    if (isGrammarCorrection(originalLower, suggestedLower)) {
      return getGrammarReason(originalLower, suggestedLower)
    }

    // Check for word choice improvements
    if (isWordChoiceImprovement(originalLower, suggestedLower)) {
      return 'Improves word choice'
    }

    // Check for simplification
    if (original.length > suggested.length * 1.5) {
      return 'Simplifies expression'
    }

    // Check for expansion
    if (suggested.length > original.length * 1.5) {
      return 'Adds more detail'
    }

    return 'Enhances clarity'
  }

  return 'Improves content'
}

/**
 * Check if change is a grammar correction
 */
function isGrammarCorrection(original, suggested) {
  const grammarPatterns = [
    // Subject-verb agreement
    { from: /\b(team|group|committee) are\b/, to: /\b(team|group|committee) is\b/ },
    { from: /\b(he|she|it) were\b/, to: /\b(he|she|it) was\b/ },

    // Possessive vs contraction
    { from: /\btheyre\b/, to: /\btheir\b/ },
    { from: /\bits\b(?!')/, to: /\bit's\b/ },

    // Tense consistency
    { from: /\bhas went\b/, to: /\bhas gone\b/ },
    { from: /\bhas did\b/, to: /\bhas done\b/ }
  ]

  return grammarPatterns.some(pattern =>
    pattern.from.test(original) && pattern.to.test(suggested)
  )
}

/**
 * Get specific grammar reason
 */
function getGrammarReason(original, suggested) {
  if (/\b(team|group|committee) are\b/.test(original) && /\b(team|group|committee) is\b/.test(suggested)) {
    return 'Subject-verb agreement: collective noun is singular'
  }

  if (/\btheyre\b/.test(original) && /\btheir\b/.test(suggested)) {
    return 'Possessive pronoun required'
  }

  if (/\bhas went\b/.test(original) && /\bhas gone\b/.test(suggested)) {
    return 'Correct past participle'
  }

  return 'Grammar correction'
}

/**
 * Check if change is word choice improvement
 */
function isWordChoiceImprovement(original, suggested) {
  const improvements = {
    'utilize': 'use',
    'facilitate': 'help',
    'endeavor': 'try',
    'commence': 'start',
    'terminate': 'end',
    'good': 'excellent',
    'nice': 'pleasant',
    'big': 'substantial',
    'small': 'minimal'
  }

  const originalWords = original.split(/\s+/)
  const suggestedWords = suggested.split(/\s+/)

  return originalWords.some((word, i) => {
    const betterWord = improvements[word]
    return betterWord && suggestedWords[i] === betterWord
  })
}

/**
 * Tokenize text into words with positions
 */
export function tokenize(text) {
  const tokens = []
  const regex = /(\w+|[^\w\s]+|\s+)/g
  let match

  while ((match = regex.exec(text)) !== null) {
    const value = match[0]
    const position = {
      start: match.index,
      end: match.index + value.length
    }

    let type
    if (/^\w+$/.test(value)) {
      type = 'word'
    } else if (/^\s+$/.test(value)) {
      type = 'whitespace'
    } else {
      type = 'punctuation'
    }

    tokens.push({ value, position, type })
  }

  return tokens
}
