import { useState, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Custom hook for managing suggestions API calls
 */
export function useSuggestions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getSuggestions = useCallback(async (content, type, context = {}) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          type,
          context
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to get suggestions')
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err.message || 'An unexpected error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    getSuggestions,
    loading,
    error
  }
}
