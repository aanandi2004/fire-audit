import React, { useState } from 'react'
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'

const normalizeBlock = (s) => (s || '').toLowerCase().trim()
const isInputOnlyBlock = (b) => {
  const x = normalizeBlock(b)
  return x === 'building details' || x === 'bulding details' || x === 'building materials' || x === 'type of construction'
}

function CategoriesView({ statusMap, commentMap, auditorStatusMap, auditorCommentMap }) {
  const [selectedGroup, setSelectedGroup] = useState(RECORD_GROUPS[0].id)
  const [selectedSubdivision, setSelectedSubdivision] = useState(RECORD_GROUPS[0].subdivisions[0].id)

  const activeGroup = RECORD_GROUPS.find(g => g.id === selectedGroup)
  const activeSubdivision = activeGroup?.subdivisions.find(s => s.id === selectedSubdivision)

  const questions = activeSubdivision ? getQuestions(selectedGroup, selectedSubdivision) : []

  // Filter for gaps (similar to Close Audit Observations)
  const gaps = questions.filter(q => {
    const isInputOnly = isInputOnlyBlock(q.block)
    if (isInputOnly) return false
    const status = statusMap[q.id]
    return status === 'not_in_place' || status === 'partial'
  })

  return (
    <div className="categories-view-container">
      <div className="categories-sidebar">
        <h3 className="categories-sidebar-title">Categories</h3>
        {RECORD_GROUPS.map(group => (
          <div key={group.id} className="category-group">
            <div 
              className={`category-group-header ${selectedGroup === group.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedGroup(group.id)
                setSelectedSubdivision(group.subdivisions[0].id)
              }}
            >
              {group.label}
            </div>
            {selectedGroup === group.id && (
              <div className="subcategory-list">
                {group.subdivisions.map(sub => (
                  <div 
                    key={sub.id} 
                    className={`subcategory-item ${selectedSubdivision === sub.id ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedSubdivision(sub.id)
                    }}
                  >
                    {sub.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="categories-content">
        <div className="categories-header">
          <h2>{activeGroup?.label} - {activeSubdivision?.label}</h2>
          <div className="categories-stats">
            <div className="stat-badge">
              <span className="label">Total Gaps:</span>
              <span className="value">{gaps.length}</span>
            </div>
          </div>
        </div>

        <div className="gaps-list">
          {gaps.length === 0 ? (
            <div className="no-gaps-message">
              No gaps found in this section.
            </div>
          ) : (
            gaps.map(q => {
                const auditorStatus = auditorStatusMap[q.id]
                const auditorComment = auditorCommentMap[q.id]
                const userComment = commentMap[q.id]
                const isInputOnly = isInputOnlyBlock(q.block)

                return (
                    <div key={q.id} className="gap-item-card">
                        <div className="gap-item-header">
                            <span className="gap-id">{q.id}</span>
                            <span className={`gap-status-badge ${statusMap[q.id]}`}>
                                {statusMap[q.id] === 'not_in_place' ? 'Not In Place' : 'Partial'}
                            </span>
                        </div>
                        <div className="gap-question-text">{q.requirement}</div>
                        {q.subText && <div className="gap-question-subtext">{q.subText}</div>}
                        
                        <div className="gap-details-grid">
                            <div className="gap-detail-section">
                                <h4>User Comment</h4>
                                <p>{userComment || '-'}</p>
                            </div>
                            {!isInputOnly && (
                              <>
                                <div className="gap-detail-section">
                                  <h4>Auditor Status</h4>
                                  <p className={auditorStatus ? `status-${auditorStatus}` : ''}>
                                      {auditorStatus ? auditorStatus.replace(/_/g, ' ').toUpperCase() : 'PENDING'}
                                  </p>
                                </div>
                                <div className="gap-detail-section">
                                  <h4>Auditor Comment</h4>
                                  <p>{auditorComment || '-'}</p>
                                </div>
                              </>
                            )}
                        </div>
                    </div>
                )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default CategoriesView
