import React from 'react'
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'

function AuditGapsView({ 
  statusMap, 
  blocks = [],
  auditorStatusMap,
  setAuditorStatusMap,
  auditorCommentMap,
  setAuditorCommentMap
}) {
  const [selectedBlockId, setSelectedBlockId] = React.useState(blocks[0]?.id || 1)

  // Collect all gaps
  const gaps = []
  
  RECORD_GROUPS.forEach(group => {
    group.subdivisions.forEach(sub => {
      const questions = getQuestions(group.id, sub.id)
      questions.forEach(q => {
        const status = statusMap[q.id]
        if (status === 'not_in_place' || status === 'partial') {
          gaps.push({
            ...q,
            groupLabel: group.label,
            subLabel: sub.label,
            status: status
          })
        }
      })
    })
  })

  const handleChangeAuditorStatus = (questionId, value) => {
    if (setAuditorStatusMap) {
        setAuditorStatusMap(prev => ({
            ...prev,
            [questionId]: value
        }))
    }
  }

  const handleChangeAuditorClosure = (questionId, value) => {
    if (setAuditorCommentMap) {
        setAuditorCommentMap(prev => ({
            ...prev,
            [questionId]: value
        }))
    }
  }

  return (
    <div className="audit-gaps-container">
      <div className="gaps-sidebar">
        <div className="gaps-sidebar-title">Sections</div>
        {blocks.map(block => (
            <div 
                key={block.id} 
                className={`gaps-sidebar-item ${selectedBlockId === block.id ? 'active' : ''}`}
                onClick={() => setSelectedBlockId(block.id)}
            >
                {block.name}
            </div>
        ))}
      </div>
      
      <div className="gaps-grid">
        {gaps.length === 0 ? (
            <div className="no-gaps-message">
                <div className="success-icon">🎉</div>
                <h3>No Compliance Gaps Found!</h3>
                <p>All assessed parameters are in place.</p>
            </div>
        ) : (
            gaps.map((gap, index) => {
                const auditorStatus = auditorStatusMap?.[gap.id] || ''
                const auditorClosure = auditorCommentMap?.[gap.id] || ''

                return (
                    <div key={`${gap.id}-${index}`} className="gap-card">
                        <div className="gap-card-header">
                            <span className="gap-id">{gap.id}</span>
                            <span className="gap-badge">{gap.subLabel}</span>
                        </div>
                        
                        <div className="gap-question">
                            {gap.text}
                        </div>
                        
                        {gap.subText && (
                            <div className="gap-subtext">{gap.subText}</div>
                        )}
                        
                        <div className="gap-status-row">
                            <span className="label">Current Status:</span>
                            <span className={`status-pill ${gap.status}`}>
                                {gap.status === 'not_in_place' ? 'Not In Place' : 'Partially In Place'}
                            </span>
                        </div>

                        <div className="gap-action-section">
                            <div className="gap-action-header">Auditor Closure Action</div>
                            
                            <div className="gap-input-group">
                                <select
                                    className="gap-select"
                                    value={auditorStatus}
                                    onChange={(e) => handleChangeAuditorStatus(gap.id, e.target.value)}
                                >
                                    <option value="">Select Action...</option>
                                    <option value="in_place">Close (In Place)</option>
                                    <option value="not_in_place">Keep Open</option>
                                </select>
                            </div>

                            <div className="gap-input-group">
                                <textarea
                                    className="gap-textarea"
                                    placeholder="Enter verification notes..."
                                    value={auditorClosure}
                                    onChange={(e) => handleChangeAuditorClosure(gap.id, e.target.value)}
                                    rows={2}
                                />
                            </div>
                            
                            <div className="gap-footer-actions">
                                <button className="btn-link">View Images</button>
                                <button className="btn-link">History</button>
                            </div>
                        </div>
                    </div>
                )
            })
        )}
      </div>
    </div>
  )
}

export default AuditGapsView
