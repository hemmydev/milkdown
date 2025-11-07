const MAX_CONTENT_LENGTH = 10000 // characters
const VALID_TYPES = ['improve', 'grammar', 'simplify', 'expand']

export function validateRequest(req, res, next) {
  const { content, type, context } = req.body

  // Validate content
  if (!content) {
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Content is required',
        details: { field: 'content' }
      }
    })
  }

  if (typeof content !== 'string') {
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Content must be a string',
        details: { field: 'content', receivedType: typeof content }
      }
    })
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({
      error: {
        code: 'CONTENT_TOO_LONG',
        message: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
        details: {
          maxLength: MAX_CONTENT_LENGTH,
          actualLength: content.length
        }
      }
    })
  }

  // Validate type
  if (!type) {
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Type is required',
        details: { field: 'type', validTypes: VALID_TYPES }
      }
    })
  }

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_TYPE',
        message: `Invalid suggestion type: ${type}`,
        details: {
          validTypes: VALID_TYPES,
          receivedType: type
        }
      }
    })
  }

  // Validate context (optional)
  if (context && typeof context !== 'object') {
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'Context must be an object',
        details: { field: 'context', receivedType: typeof context }
      }
    })
  }

  next()
}
