import express from 'express'
import { generateSuggestions } from '../services/suggestionService.js'
import { validateRequest } from '../middleware/validation.js'

const router = express.Router()

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map()
const RATE_LIMIT = 10 // requests per minute
const RATE_WINDOW = 60 * 1000 // 1 minute

function checkRateLimit(ip) {
  const now = Date.now()
  const requests = rateLimitMap.get(ip) || []

  // Filter out requests older than window
  const recentRequests = requests.filter(time => now - time < RATE_WINDOW)

  if (recentRequests.length >= RATE_LIMIT) {
    const resetTime = recentRequests[0] + RATE_WINDOW
    return {
      allowed: false,
      limit: RATE_LIMIT,
      remaining: 0,
      resetTime
    }
  }

  recentRequests.push(now)
  rateLimitMap.set(ip, recentRequests)

  return {
    allowed: true,
    limit: RATE_LIMIT,
    remaining: RATE_LIMIT - recentRequests.length,
    resetTime: now + RATE_WINDOW
  }
}

// POST /api/suggestions - Generate suggestions
router.post('/', validateRequest, async (req, res, next) => {
  try {
    // Rate limiting
    const clientIp = req.ip
    const rateLimit = checkRateLimit(clientIp)

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimit.limit,
      'X-RateLimit-Remaining': rateLimit.remaining,
      'X-RateLimit-Reset': Math.floor(rateLimit.resetTime / 1000)
    })

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          details: {
            resetTime: new Date(rateLimit.resetTime).toISOString()
          }
        }
      })
    }

    const { content, type, context } = req.body

    // Generate suggestions
    const suggestion = await generateSuggestions(content, type, context)

    res.json(suggestion)
  } catch (error) {
    next(error)
  }
})

export default router
