import PropTypes from 'prop-types'
import './DiffHighlighter.css'

function DiffHighlighter({
  original,
  suggested,
  changes,
  selectedChangeIds,
  onAcceptChange,
  onRejectChange
}) {
  // Build highlighted version of suggested text
  const renderHighlightedText = () => {
    const parts = []
    let lastIndex = 0

    // Sort changes by position
    const sortedChanges = [...changes].sort((a, b) =>
      a.position.start - b.position.start
    )

    for (const change of sortedChanges) {
      const { start, end } = change.position
      const isSelected = selectedChangeIds.has(change.id)

      // Add text before this change
      if (start > lastIndex) {
        parts.push({
          type: 'unchanged',
          text: original.slice(lastIndex, start)
        })
      }

      // Add the change
      parts.push({
        type: change.type,
        text: change.suggested || change.original,
        changeId: change.id,
        isSelected
      })

      lastIndex = end
    }

    // Add remaining text
    if (lastIndex < original.length) {
      parts.push({
        type: 'unchanged',
        text: original.slice(lastIndex)
      })
    }

    return parts
  }

  const parts = renderHighlightedText()

  return (
    <div className="diff-highlighter">
      <div className="diff-header">
        <h3>Preview with Suggestions</h3>
        <div className="diff-legend">
          <span className="legend-item">
            <span className="legend-color addition"></span>
            Addition
          </span>
          <span className="legend-item">
            <span className="legend-color deletion"></span>
            Deletion
          </span>
          <span className="legend-item">
            <span className="legend-color modification"></span>
            Modification
          </span>
        </div>
      </div>

      <div className="diff-content">
        {parts.map((part, index) => {
          if (part.type === 'unchanged') {
            return (
              <span key={index} className="text-unchanged">
                {part.text}
              </span>
            )
          }

          return (
            <span
              key={index}
              className={`text-change ${part.type} ${part.isSelected ? 'selected' : 'unselected'}`}
              onClick={() => {
                if (part.isSelected) {
                  onRejectChange(part.changeId)
                } else {
                  onAcceptChange(part.changeId)
                }
              }}
              title={`Click to ${part.isSelected ? 'reject' : 'accept'} this change`}
            >
              {part.text}
            </span>
          )
        })}
      </div>

      <div className="diff-footer">
        <p className="diff-hint">
          💡 Click on highlighted text to accept/reject individual changes
        </p>
      </div>
    </div>
  )
}

DiffHighlighter.propTypes = {
  original: PropTypes.string.isRequired,
  suggested: PropTypes.string.isRequired,
  changes: PropTypes.array.isRequired,
  selectedChangeIds: PropTypes.instanceOf(Set).isRequired,
  onAcceptChange: PropTypes.func.isRequired,
  onRejectChange: PropTypes.func.isRequired
}

export default DiffHighlighter
