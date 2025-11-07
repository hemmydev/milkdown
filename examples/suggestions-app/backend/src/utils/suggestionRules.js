/**
 * Suggestion Rules
 * Each rule has: condition (optional), apply, and reason
 */

// ============================================================================
// IMPROVEMENT RULES
// ============================================================================

export const improvementRules = [
  {
    name: 'Enhance weak adjectives',
    apply: (text) => {
      const replacements = {
        'good': 'excellent',
        'nice': 'exceptional',
        'big': 'substantial',
        'small': 'minimal',
        'fast': 'lightning-fast',
        'slow': 'deliberate',
        'bad': 'suboptimal',
        'very good': 'outstanding',
        'pretty good': 'impressive'
      }

      let result = text
      for (const [weak, strong] of Object.entries(replacements)) {
        const regex = new RegExp(`\\b${weak}\\b`, 'gi')
        result = result.replace(regex, strong)
      }
      return result
    }
  },
  {
    name: 'Replace basic with comprehensive',
    apply: (text) => {
      return text.replace(/\bbasic\b/gi, 'comprehensive')
    }
  },
  {
    name: 'Add professional modifiers',
    condition: (text, context) => context?.tone === 'professional',
    apply: (text) => {
      // Add modifiers before nouns
      const enhancements = {
        'solution': 'innovative solution',
        'product': 'cutting-edge product',
        'service': 'premium service',
        'approach': 'strategic approach'
      }

      let result = text
      for (const [noun, enhanced] of Object.entries(enhancements)) {
        const regex = new RegExp(`\\b${noun}\\b`, 'gi')
        // Only replace if not already modified
        result = result.replace(
          new RegExp(`(?<!\\w )\\b${noun}\\b`, 'gi'),
          enhanced
        )
      }
      return result
    }
  },
  {
    name: 'Expand abbreviated forms',
    apply: (text) => {
      return text
        .replace(/\bapp\b/gi, 'application')
        .replace(/\binfo\b/gi, 'information')
        .replace(/\bpic\b/gi, 'picture')
    }
  }
]

// ============================================================================
// GRAMMAR RULES
// ============================================================================

export const grammarRules = [
  {
    name: 'Subject-verb agreement (collective nouns)',
    apply: (text) => {
      return text
        .replace(/\b(team|group|committee|company) are\b/gi, '$1 is')
        .replace(/\b(team|group|committee|company) were\b/gi, '$1 was')
    }
  },
  {
    name: 'Possessive vs contraction',
    apply: (text) => {
      return text
        // Fix "they're" vs "their"
        .replace(/\btheyre\s+([\w]+)/gi, (match, next) => {
          // If followed by a noun, use "their"
          return `their ${next}`
        })
        // Fix "its" vs "it's"
        .replace(/\bits\s+(?!a\b)/gi, "it's ")
    }
  },
  {
    name: 'Past participle corrections',
    apply: (text) => {
      return text
        .replace(/\bhas went\b/gi, 'has gone')
        .replace(/\bhas did\b/gi, 'has done')
        .replace(/\bhas ran\b/gi, 'has run')
        .replace(/\bhas came\b/gi, 'has come')
    }
  },
  {
    name: 'Article usage',
    apply: (text) => {
      return text
        // "a" before vowel sounds should be "an"
        .replace(/\ba\s+([aeiou])/gi, 'an $1')
        // "an" before consonant sounds should be "a"
        .replace(/\ban\s+([^aeiou])/gi, 'a $1')
    }
  },
  {
    name: 'Double negatives',
    apply: (text) => {
      return text
        .replace(/\bdon't have no\b/gi, "don't have any")
        .replace(/\bcan't hardly\b/gi, 'can hardly')
        .replace(/\bwon't never\b/gi, 'will never')
    }
  },
  {
    name: 'Comma splice fixes',
    apply: (text) => {
      // Simple heuristic: replace ", and" or ", but" when appropriate
      return text
        .replace(/\s*,\s*and\s+/gi, ', and ')
        .replace(/\s*,\s*but\s+/gi, ', but ')
    }
  }
]

// ============================================================================
// SIMPLIFICATION RULES
// ============================================================================

export const simplificationRules = [
  {
    name: 'Replace complex words',
    apply: (text) => {
      const replacements = {
        'utilize': 'use',
        'facilitate': 'help',
        'endeavor': 'try',
        'commence': 'start',
        'terminate': 'end',
        'demonstrate': 'show',
        'sufficient': 'enough',
        'subsequently': 'later',
        'prior to': 'before',
        'in order to': 'to',
        'due to the fact that': 'because',
        'at this point in time': 'now',
        'in the event that': 'if',
        'with regard to': 'about',
        'methodology': 'method',
        'implement': 'do',
        'optimization': 'improvement',
        'state-of-the-art': 'modern',
        'cutting-edge': 'advanced',
        'revolutionary': 'new'
      }

      let result = text
      for (const [complex, simple] of Object.entries(replacements)) {
        const regex = new RegExp(`\\b${complex}\\b`, 'gi')
        result = result.replace(regex, simple)
      }
      return result
    }
  },
  {
    name: 'Remove unnecessary modifiers',
    apply: (text) => {
      return text
        .replace(/\bvery\s+/gi, '')
        .replace(/\breally\s+/gi, '')
        .replace(/\bquite\s+/gi, '')
        .replace(/\bjust\s+/gi, '')
        .replace(/\bactually\s+/gi, '')
        .replace(/\bbasically\s+/gi, '')
    }
  },
  {
    name: 'Simplify compound words',
    apply: (text) => {
      return text
        .replace(/\bin accordance with\b/gi, 'following')
        .replace(/\bfor the purpose of\b/gi, 'to')
        .replace(/\bin spite of the fact that\b/gi, 'although')
        .replace(/\bby means of\b/gi, 'by')
    }
  }
]

// ============================================================================
// EXPANSION RULES
// ============================================================================

export const expansionRules = [
  {
    name: 'Add descriptive details',
    apply: (text) => {
      const expansions = {
        'fast': 'fast, with response times under 100ms',
        'easy': 'easy to use, with an intuitive interface',
        'powerful': 'powerful, capable of handling complex workflows',
        'reliable': 'reliable, with 99.9% uptime',
        'secure': 'secure, using industry-standard encryption',
        'efficient': 'efficient, optimizing resource usage'
      }

      let result = text
      for (const [simple, expanded] of Object.entries(expansions)) {
        // Only expand if not already detailed
        const regex = new RegExp(`\\b${simple}\\b(?!,)`, 'gi')
        result = result.replace(regex, expanded)
      }
      return result
    }
  },
  {
    name: 'Expand abbreviations with context',
    apply: (text) => {
      return text
        .replace(/\bAPI\b/g, 'API (Application Programming Interface)')
        .replace(/\bUI\b/g, 'UI (User Interface)')
        .replace(/\bUX\b/g, 'UX (User Experience)')
        .replace(/\bCTA\b/g, 'CTA (Call To Action)')
    }
  },
  {
    name: 'Add examples',
    condition: (text) => text.length < 200, // Only for short content
    apply: (text) => {
      // Add example after certain keywords
      if (/\bfeature/i.test(text) && !/\bsuch as\b/i.test(text)) {
        return text.replace(
          /\bfeature/i,
          'feature, such as real-time collaboration'
        )
      }

      if (/\bbenefit/i.test(text) && !/\bincluding\b/i.test(text)) {
        return text.replace(
          /\bbenefit/i,
          'benefit, including increased productivity'
        )
      }

      return text
    }
  },
  {
    name: 'Add quantitative details',
    apply: (text) => {
      return text
        .replace(/\bmany users\b/gi, 'over 10,000 users')
        .replace(/\bquick response\b/gi, 'response in under 2 seconds')
        .replace(/\blarge database\b/gi, 'database with millions of records')
    }
  }
]

/**
 * Get all rules by type
 */
export function getRulesByType(type) {
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
      throw new Error(`Unknown rule type: ${type}`)
  }
}
