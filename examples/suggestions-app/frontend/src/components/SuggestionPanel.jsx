import PropTypes from 'prop-types'
import './SuggestionPanel.css'

const SUGGESTION_TYPES = [
  { id: 'improve', label: 'Improve', icon: '✨', description: 'Enhance overall quality' },
  { id: 'grammar', label: 'Grammar', icon: '📝', description: 'Fix grammatical errors' },
  { id: 'simplify', label: 'Simplify', icon: '🎯', description: 'Make it clearer' },
  { id: 'expand', label: 'Expand', icon: '📈', description: 'Add more detail' }
]

function SuggestionPanel({
  onGetSuggestions,
  loading,
  error,
  suggestion,
  selectedChangeIds,
  onAcceptChange,
  onRejectChange,
  onAcceptAll,
  onRejectAll,
  onApplyChanges,
  onClear
}) {
  const hasChanges = suggestion && suggestion.changes.length > 0
  const hasSelectedChanges = selectedChangeIds.size > 0

  return (
    <div className="suggestion-panel">
      <div className="panel-header">
        <h2>Suggestions</h2>
      </div>

      {!suggestion && (
        <div className="panel-content">
          <div className="suggestion-types">
            <p className="types-label">Choose suggestion type:</p>
            {SUGGESTION_TYPES.map(type => (
              <button
                key={type.id}
                className="type-button"
                onClick={() => onGetSuggestions(type.id)}
                disabled={loading}
              >
                <span className="type-icon">{type.icon}</span>
                <div className="type-info">
                  <div className="type-label">{type.label}</div>
                  <div className="type-description">{type.description}</div>
                </div>
              </button>
            ))}
          </div>

          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Generating suggestions...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </div>
          )}
        </div>
      )}

      {suggestion && (
        <div className="panel-content">
          <div className="suggestion-summary">
            <div className="summary-row">
              <span className="summary-label">Changes Found:</span>
              <span className="summary-value">{suggestion.changes.length}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Selected:</span>
              <span className="summary-value">{selectedChangeIds.size}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Confidence:</span>
              <span className="summary-value">
                {Math.round(suggestion.metadata.confidence * 100)}%
              </span>
            </div>
          </div>

          <div className="changes-list">
            <h3>Changes</h3>
            {suggestion.changes.map((change, index) => {
              const isSelected = selectedChangeIds.has(change.id)

              return (
                <div
                  key={change.id}
                  className={`change-item ${isSelected ? 'selected' : ''}`}
                >
                  <div className="change-header">
                    <span className="change-number">#{index + 1}</span>
                    <span className={`change-type ${change.type}`}>
                      {change.type}
                    </span>
                  </div>

                  <div className="change-content">
                    {change.type === 'deletion' && (
                      <div className="change-text deletion">
                        <span className="label">Remove:</span>
                        <span className="text">"{change.original}"</span>
                      </div>
                    )}

                    {change.type === 'addition' && (
                      <div className="change-text addition">
                        <span className="label">Add:</span>
                        <span className="text">"{change.suggested}"</span>
                      </div>
                    )}

                    {change.type === 'modification' && (
                      <>
                        <div className="change-text deletion">
                          <span className="label">From:</span>
                          <span className="text">"{change.original}"</span>
                        </div>
                        <div className="change-text addition">
                          <span className="label">To:</span>
                          <span className="text">"{change.suggested}"</span>
                        </div>
                      </>
                    )}

                    <div className="change-reason">
                      <span className="reason-icon">💡</span>
                      {change.reason}
                    </div>
                  </div>

                  <div className="change-actions">
                    {isSelected ? (
                      <button
                        className="btn btn-reject"
                        onClick={() => onRejectChange(change.id)}
                      >
                        ✗ Reject
                      </button>
                    ) : (
                      <button
                        className="btn btn-accept"
                        onClick={() => onAcceptChange(change.id)}
                      >
                        ✓ Accept
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="panel-actions">
            <button
              className="btn btn-secondary"
              onClick={onAcceptAll}
              disabled={!hasChanges}
            >
              Accept All
            </button>
            <button
              className="btn btn-secondary"
              onClick={onRejectAll}
              disabled={!hasSelectedChanges}
            >
              Reject All
            </button>
            <button
              className="btn btn-primary"
              onClick={onApplyChanges}
              disabled={!hasSelectedChanges}
            >
              Apply Changes
            </button>
            <button
              className="btn btn-text"
              onClick={onClear}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

SuggestionPanel.propTypes = {
  onGetSuggestions: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  suggestion: PropTypes.object,
  selectedChangeIds: PropTypes.instanceOf(Set).isRequired,
  onAcceptChange: PropTypes.func.isRequired,
  onRejectChange: PropTypes.func.isRequired,
  onAcceptAll: PropTypes.func.isRequired,
  onRejectAll: PropTypes.func.isRequired,
  onApplyChanges: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired
}

export default SuggestionPanel
