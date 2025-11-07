import { v4 as uuidv4 } from 'uuid'
import { calculateWordDiff } from '../utils/diffCalculator.js'
import { improvementRules, grammarRules, simplificationRules, expansionRules } from '../utils/suggestionRules.js'

/**
 * Generate suggestions for the given content
 * @param {string} content - Original content
 * @param {string} type - Suggestion type ('improve', 'grammar', 'simplify', 'expand')
 * @param {object} context - Additional context
 * @returns {Promise<object>} Suggestion object with changes
 */
export async function generateSuggestions(content, type, context = {}) {
  try {
    // Select appropriate rules based on type
    const rules = selectRules(type)

    // Apply rules to generate suggested content
    const suggested = applyRules(content, rules, context)

    // Calculate word-level diff
    const changes = calculateWordDiff(content, suggested)

    // Generate suggestion object
    const suggestion = {
      id: `sug_${uuidv4().substring(0, 8)}`,
      original: content,
      suggested: suggested,
      changes: changes,
      metadata: {
        timestamp: new Date().toISOString(),
        model: getModelName(type),
        confidence: calculateConfidence(changes)
      }
    }

    return suggestion
  } catch (error) {
    console.error('Error generating suggestions:', error)
    throw {
      status: 500,
      code: 'GENERATION_FAILED',
      message: 'Failed to generate suggestions',
      details: { reason: error.message }
    }
  }
}

/**
 * Select rules based on suggestion type
 */
function selectRules(type) {
  switch (type) {
    case 'improve':
      return improvementRules
    case 'grammar':
      return grammarRules
    case 'simplify':
      return simplificationRules
    case 'expand':
      return expansionRules
    default:
      throw new Error(`Unknown suggestion type: ${type}`)
  }
}

/**
 * Apply rules to content to generate suggestions
 */
function applyRules(content, rules, context) {
  let result = content

  for (const rule of rules) {
    if (rule.condition && !rule.condition(result, context)) {
      continue
    }

    result = rule.apply(result, context)
  }

  return result
}

/**
 * Get model name based on type
 */
function getModelName(type) {
  const models = {
    'improve': 'improvement-v1',
    'grammar': 'grammar-check-v1',
    'simplify': 'simplification-v1',
    'expand': 'expansion-v1'
  }
  return models[type] || 'unknown'
}

/**
 * Calculate confidence score based on changes
 */
function calculateConfidence(changes) {
  if (changes.length === 0) return 1.0

  // Simple confidence calculation:
  // - More changes = lower confidence
  // - Larger changes = lower confidence
  const baseConfidence = 0.95
  const changesPenalty = changes.length * 0.02
  const sizePenalty = changes.reduce((sum, change) => {
    const size = Math.max(
      (change.original || '').length,
      (change.suggested || '').length
    )
    return sum + (size > 20 ? 0.01 : 0)
  }, 0)

  const confidence = Math.max(0.5, baseConfidence - changesPenalty - sizePenalty)
  return Math.round(confidence * 100) / 100
}
