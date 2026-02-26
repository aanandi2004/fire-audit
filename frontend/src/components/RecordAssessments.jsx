import React from 'react'
import { auth } from '../firebase'
import { getAudit, getAuditBaseline } from '../services/apiService'
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'

// --- V1 FREEZE: Organization Record Assessments ---
// 1) Assignment → Audit Identity:
//    - audit_id MUST equal the assignment document id
//    - audit_id MUST be created once at assignment creation
//    - audit_id MUST NOT be regenerated, mutated, or inferred elsewhere
// 2) Org Responses:
//    - Org UI writes ONLY via backend /org-responses/save
//    - org_responses is the single source of truth; no frontend Firestore writes
// 3) Frontend:
//    - Derive auditId and blockId ONLY from activeAssignment
//    - Block Save if assignment context is missing
//    - No alternate persistence paths may be introduced

const normalizeBlock = (s) => (s || '').toLowerCase().trim()
const isInputOnlyBlock = (b) => {
  const x = normalizeBlock(b)
  return x === 'building details' || x === 'bulding details' || x === 'type of construction'
}

const STATUS_OPTIONS = [
  { value: 'in_place', label: 'In place' },
  { value: 'not_in_place', label: 'Not in place' },
  { value: 'partial', label: 'Partially in place' },
  { value: 'not_relevant', label: 'Not relevant' },
]

function RecordAssessments({
  allowedSubdivision,
  groupId,
  subdivisionId,
  onChangeGroup,
  onChangeSubdivision,
  statusMap,
  setStatusMap,
  valueMap,
  setValueMap,
  user,
  assignments,
  selectedBlockId: controlledBlockId,
  onChangeBlockId,
  onAuditContextChange,
}) {
  const [auditInfo, setAuditInfo] = React.useState({})
  const PAGE_LOCKED = false
  const effAllowedSubdivision = Array.isArray(allowedSubdivision) ? allowedSubdivision : []
  const [blocks, setBlocks] = React.useState(() => {
    return []
  })
  React.useEffect(() => {
    const list = Array.isArray(assignments) ? assignments : []
    const orgId = user?.orgId || ''
    const scoped = list.filter(a => a.org_id === orgId || a.orgId === orgId)
    const ids = Array.from(new Set(scoped.map(a => a.block_id || a.block_name).filter(Boolean)))
    const next = ids.map(raw => {
      const s = String(raw || '')
      const m = /^Block\s*(\d+)/i.exec(s)
      const canonical = m ? `block_${parseInt(m[1], 10)}` : s.toLowerCase()
      const display = m ? `Block ${parseInt(m[1], 10)}` : (/^block_(\d+)$/i.test(s) ? `Block ${parseInt((/^block_(\d+)$/i.exec(s) || [])[1] || '1', 10)}` : s)
      return { id: canonical, name: display }
    })
    setBlocks(next)
  }, [user, blocks.length, assignments])
  const [selectedBlockIdLocal, setSelectedBlockIdLocal] = React.useState(() => blocks[0]?.id || '')
  const selectedBlockId = controlledBlockId || selectedBlockIdLocal
  React.useEffect(() => {
    const match = blocks.some(b => String(b.id || '').toLowerCase() === String(selectedBlockId || '').toLowerCase())
    if (!selectedBlockId || !match) {
      const next = blocks[0]?.id || ''
      if (!next || next === selectedBlockId) return
      if (onChangeBlockId) onChangeBlockId(next)
      else setSelectedBlockIdLocal(next)
    }
  }, [blocks, selectedBlockId, onChangeBlockId])
  const getKey = React.useCallback((qId) => {
    const bid = String(selectedBlockId || '').trim().toLowerCase()
    const qn = String(qId || '').trim().toLowerCase()
    return bid ? `${bid}::${qn}` : qn
  }, [selectedBlockId])
  
  

  const effectiveGroupId = React.useMemo(() => {
    const list = Array.isArray(assignments) ? assignments : []
    const orgId = user?.orgId || ''
    const scoped = list.filter(a => {
      const sameOrg = (a.org_id === orgId || a.orgId === orgId)
      const bid = selectedBlockId
      const sameBlock = (
        String(a.block_id) === String(bid) ||
        String(a.block_name) === String(bid) ||
        String(a.blockId) === String(bid)
      )
      return sameOrg && sameBlock
    })
    return scoped[0]?.group || groupId
  }, [assignments, user, selectedBlockId, groupId])
  const activeGroup = RECORD_GROUPS.find((group) => group.id === effectiveGroupId)
  const subdivisions = activeGroup ? activeGroup.subdivisions : []
  const assignedSubIds = React.useMemo(() => {
    const list = Array.isArray(assignments) ? assignments : []
    const orgId = user?.orgId || ''
    const blockMatch = (a) => {
      const bid = selectedBlockId
      if (!bid) return true
      if ((a.block_id || a.block_name) === '__ALL__') return true
      return (
        String(a.block_id) === String(bid) ||
        String(a.block_name) === String(bid) ||
        String(a.blockId) === String(bid)
      )
    }
    const groupMatch = (a) => {
      const g = a.group
      return String(g) === String(effectiveGroupId)
    }
    const subsRaw = list
      .filter(a => (a.org_id === orgId || a.orgId === orgId) && blockMatch(a) && groupMatch(a))
      .map(a => a.subdivision_id)
      .filter(Boolean)
    if (subsRaw.length === 0 && selectedBlockId) {
      try { console.warn('[RecordAssessments] No matching subdivision for selected block', { blockId: selectedBlockId, group: effectiveGroupId }) } catch { void 0 }
    }
    return Array.from(new Set(subsRaw))
  }, [assignments, user, selectedBlockId, effectiveGroupId])
  const allowedSubsByAssignment = subdivisions.filter(s => assignedSubIds.includes(s.id))
  const [selectedCategoryBlock, setSelectedCategoryBlock] = React.useState('')
  React.useEffect(() => { setSelectedCategoryBlock('') }, [subdivisionId, effectiveGroupId, selectedBlockId])
  React.useEffect(() => {
    if (!effectiveGroupId) return
    if (groupId !== effectiveGroupId) onChangeGroup(effectiveGroupId)
    const allowedList = assignedSubIds
    if (allowedList.length > 0) {
      const isAllowed = allowedList.includes(subdivisionId)
      if (!isAllowed) onChangeSubdivision(allowedList[0])
    } else {
      onChangeSubdivision('')
    }
  }, [assignedSubIds, effectiveGroupId, subdivisionId, onChangeGroup, onChangeSubdivision, groupId])
  const [questions, setQuestions] = React.useState([])
  React.useEffect(() => {
    try {
      const allowed = assignedSubIds
      if (!effectiveGroupId || allowed.length === 0) {
        console.error('[RecordAssessments] No allowed subdivisions or groupId')
        setQuestions([])
        return
      }
      const merged = []
      allowed.forEach(subId => {
        const items = getQuestions(effectiveGroupId, subId)
        merged.push(...items)
      })
      const filtered = merged.filter(q => {
        if (!selectedCategoryBlock) return true
        return (q.block || 'General') === selectedCategoryBlock
      })
      setQuestions(filtered)
      try { console.log('[RecordAssessments] Questions loaded', { count: filtered.length, group: effectiveGroupId, subs: allowed }) } catch { void 0 }
    } catch (e) {
      console.error('[RecordAssessments] Failed to load questions', e)
      setQuestions([])
    }
  }, [effectiveGroupId, selectedCategoryBlock, assignedSubIds])

  const summary = questions.reduce(
    (accumulator, question) => {
      const status = statusMap[getKey(question.id)]
      if (status && accumulator[status] !== undefined) {
        accumulator[status] += 1
      }
      return accumulator
    },
    {
      in_place: 0,
      not_in_place: 0,
      partial: 0,
      not_relevant: 0,
    },
  )

  function handleGroupChange(id) {
    onChangeGroup(id)
    const nextGroup = RECORD_GROUPS.find((group) => group.id === id)
    if (nextGroup && nextGroup.subdivisions && nextGroup.subdivisions.length > 0) {
      const nextAllowed = nextGroup.subdivisions.filter(s => assignedSubIds.includes(s.id))
      onChangeSubdivision(nextAllowed[0]?.id || nextGroup.subdivisions[0].id)
    } else {
      onChangeSubdivision('')
    }
  }

  function handleStatusChange(questionId, value) {
    setStatusMap((previous) => ({
      ...previous,
      [getKey(questionId)]: value,
    }))
  }

  function handleValueChange(questionId, value) {
    setValueMap((previous) => ({
      ...previous,
      [getKey(questionId)]: value,
    }))
    // Input-only fields are shown here; persist via Building Info (Step 1) or ignore for audit_responses
  }
  const orgIdResolved = user?.orgId || ''

  const canonicalBlockId = (() => {
    const bidRaw = selectedBlockId || ''
    const bid = String(bidRaw).trim()
    if (/^block_\d+$/i.test(bid)) return bid.toLowerCase()
    const list = Array.isArray(assignments) ? assignments : []
    const match = list.find(a => {
      const sameOrg = (a.org_id === orgIdResolved || a.orgId === orgIdResolved)
      const aName = String(a.block_name || '').trim().toLowerCase()
      return sameOrg && aName === bid.toLowerCase()
    })
    if (match?.block_id) return String(match.block_id)
    const m = /^Block\s*(\d+)/i.exec(bid)
    if (m) return `block_${parseInt(m[1], 10)}`
    return undefined
  })()
  // Derive assignment context strictly using org_id, block_id, group, subdivision_id, is_active === true
  const activeAssignment = (() => {
    const list = Array.isArray(assignments) ? assignments : []
    const g = String(effectiveGroupId || groupId || '')
    const sid = String(subdivisionId || '')
    if (!canonicalBlockId) return null
    const exact = list.find(a =>
      (a.org_id === orgIdResolved || a.orgId === orgIdResolved) &&
      String(a.block_id) === String(canonicalBlockId) &&
      String(a.group) === g &&
      String(a.subdivision_id) === sid
    )
    if (exact) return exact
    const missingSub = list.find(a =>
      (a.org_id === orgIdResolved || a.orgId === orgIdResolved) &&
      String(a.block_id) === String(canonicalBlockId) &&
      String(a.group) === g &&
      !a.subdivision_id
    )
    if (missingSub) return { ...missingSub, subdivision_id: sid }
    const byBlock = list.find(a =>
      (a.org_id === orgIdResolved || a.orgId === orgIdResolved) &&
      (String(a.block_id) === String(canonicalBlockId) || String(a.block_name) === String(selectedBlockId))
    )
    return byBlock || null
  })()
  const assignmentIdForSelection = activeAssignment?.audit_id || activeAssignment?.id || ''
  const blockIdForSelection = activeAssignment?.block_id || canonicalBlockId || selectedBlockId || ''
  const lastRehydrateKeyRef = React.useRef('')
  const lastBaselineKeyRef = React.useRef('')
  React.useEffect(() => {
    if (typeof onAuditContextChange === 'function') {
      const aid = assignmentIdForSelection || ''
      const bid = blockIdForSelection || ''
      const gid = effectiveGroupId || groupId || ''
      const sid = subdivisionId || ''
      onAuditContextChange({ auditId: aid, blockId: bid, groupId: gid, subdivisionId: sid })
    }
  }, [assignmentIdForSelection, blockIdForSelection, effectiveGroupId, groupId, subdivisionId, onAuditContextChange])
  React.useEffect(() => {
    console.log('[ASSIGNMENT MATCH DEBUG]', {
      orgIdResolved,
      selectedBlockId,
      canonicalBlockId,
      effectiveGroupId,
      subdivisionId,
      assignmentIdForSelection
    })
  }, [
    orgIdResolved,
    selectedBlockId,
    canonicalBlockId,
    effectiveGroupId,
    subdivisionId,
    assignmentIdForSelection
  ])
  React.useEffect(() => {
    ;(async () => {
      try {
        const auditId = activeAssignment?.audit_id || activeAssignment?.id
        if (!auditId) return
        const data = await getAudit(auditId)
        setAuditInfo(data || {})
        const locked = String((data || {}).status || '').toUpperCase() === 'COMPLETED'
        if (locked) {
          try {
            window.__AUDIT_LOCK__ = true
            window.dispatchEvent(new CustomEvent('audit:status', { detail: { auditId, status: 'COMPLETED' } }))
          } catch { /* noop */ }
        }
      } catch { /* noop */ }
    })()
  }, [activeAssignment])
  async function handleSave() {
    try {
      if (!activeAssignment) {
        alert('No assignment found for this block. Please select a block with an active assignment.')
        return
      }
      const { audit_id, block_id, group, subdivision_id, org_id } = activeAssignment
      const payload = []
      for (const q of questions) {
        const val = statusMap[getKey(q.id)]
        const fieldVal = valueMap[getKey(q.id)] || ''
        if (!val && !fieldVal) continue
        const statusUpper = (val || '').toUpperCase().replace(' ', '_')
        payload.push({
          audit_id: String(audit_id),
          org_id: String(org_id || ''),
          block_id: String(block_id),
          group: String(group || ''),
          subdivision_id: String(subdivision_id || ''),
          question_id: String(q.id),
          status: statusUpper || null,
          value: fieldVal
        })
      }
      const token = await auth.currentUser.getIdToken()
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8011'
      // Persist ONLY via backend; org_responses is the single source of truth (v1)
      const resp = await fetch(`${BASE_URL}/org-responses/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', idToken: token },
        body: JSON.stringify(payload)
      })
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        console.error('[RecordAssessments] Save failed', data)
        alert(data?.detail || 'Save failed')
        return
      }
      try { console.log('[RecordAssessments] Save writes complete', { savedCount: payload.length, group: activeAssignment.group, block_id: activeAssignment.block_id }) } catch { void 0 }
      alert('Assessments saved successfully!')
    } catch (e) {
      console.error('[RecordAssessments] Save failed', e)
      alert('Save failed')
    }
  }

  const isCustomer = String(user?.role || '').toUpperCase() === 'CUSTOMER'

  // removed Print and Preview actions per strict scope

  // Resolve canonical block_id from selection, preferring assignment canonical id
  React.useEffect(() => {
    ;(async () => {
      try {
        if (!auth.currentUser) return
        const auditId = assignmentIdForSelection || ''
        const blockId = blockIdForSelection || ''
        if (!auditId || !blockId) return
        const key = `${auditId}::${blockId}::${subdivisionId || ''}`
        if (lastRehydrateKeyRef.current === key) return
        lastRehydrateKeyRef.current = key
        const token = await auth.currentUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8011'
        const params = new URLSearchParams({ audit_id: String(auditId), block_id: String(blockId) })
        const resp = await fetch(`${BASE_URL}/org-responses/list?${params.toString()}`, {
          method: 'GET',
          headers: { idToken: token }
        })
        if (!resp.ok) return
        const list = await resp.json()
        const nextStatus = {}
        const nextValue = {}
        ;(Array.isArray(list) ? list : []).forEach((d) => {
          const qid = d.question_id
          const org = d.org || {}
          nextStatus[getKey(qid)] = String(org.status || '').toLowerCase()
          nextValue[getKey(qid)] = org.value || ''
        })
        setStatusMap(nextStatus)
        setValueMap(nextValue)
        try { console.log('[RecordAssessments] Rehydrated from backend', { count: Object.keys(nextStatus).length, blockId }) } catch { void 0 }
      } catch { /* silent */ }
    })()
  }, [assignmentIdForSelection, blockIdForSelection, subdivisionId, getKey, setStatusMap, setValueMap])
  React.useEffect(() => {
    ;(async () => {
      try {
        if (!auth.currentUser) return
        const auditId = assignmentIdForSelection || ''
        if (!auditId) return
        const key = `${auditId}::baseline`
        if (lastBaselineKeyRef.current === key) return
        lastBaselineKeyRef.current = key
        const data = await getAuditBaseline(auditId)
        const baseline = (data && data.baseline) || {}
        const nextValue = {}
        ;(questions || []).forEach(q => {
          const qid = String(q.id)
          const k1 = qid
          const k2 = qid.toLowerCase()
          const val = baseline[k1] ?? baseline[k2] ?? ''
          if (val) nextValue[getKey(qid)] = String(val)
        })
        if (Object.keys(nextValue).length > 0) {
          setValueMap(prev => ({ ...nextValue, ...prev }))
        }
      } catch { /* noop */ }
    })()
  }, [assignmentIdForSelection, questions, getKey, setValueMap])

  // Source of truth: backend org_responses endpoints

  return (
    <div className="page-body">
      <div className="card">
        
        <div className="toolbar">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Record assessments</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Select occupancy group, subdivision and update the status for each requirement.
            </div>
          </div>
          <div className="toolbar-right">
            <button type="button" className="btn btn-outline" onClick={handleSave}>
              Save
            </button>
            {user?.role === 'Admin' && (
              <>
                <button type="button" className="btn btn-primary">
                  Build report
                </button>
              </>
            )}
          </div>
        </div>
        <div className="record-summary-row">
          <div className="badge-pill status-in-place">
            <span className="badge-label">In place</span>
            <span className="badge-value">{summary.in_place}</span>
          </div>
          <div className="badge-pill status-not-in-place">
            <span className="badge-label">Not in place</span>
            <span className="badge-value">{summary.not_in_place}</span>
          </div>
          <div className="badge-pill status-partial">
            <span className="badge-label">Partially in place</span>
            <span className="badge-value">{summary.partial}</span>
          </div>
          <div className="badge-pill status-not-relevant">
            <span className="badge-label">Not relevant</span>
            <span className="badge-value">{summary.not_relevant}</span>
          </div>
        </div>
        <div className="record-layout" style={{ marginTop: 16 }}>
          <div>
            {isCustomer ? null : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  Occupancy group
                </div>
                <div className="group-row" style={{ marginBottom: 10 }}>
                  {RECORD_GROUPS.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      className={`group-chip ${group.id === groupId ? 'active' : ''}`}
                      onClick={() => handleGroupChange(group.id)}
                    >
                      {group.id}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
              Block
            </div>
            <div className="group-row" style={{ marginBottom: 10 }}>
              {blocks.length === 0 ? (
                <span style={{ fontSize: 12, color: '#6b7280' }}>No blocks defined</span>
              ) : (
                blocks.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    className={`group-chip ${selectedBlockId === b.id ? 'active' : ''}`}
                    onClick={() => {
                      if (onChangeBlockId) onChangeBlockId(b.id)
                      else setSelectedBlockIdLocal(b.id)
                    }}
                  >
                    {b.name}
                  </button>
                ))
              )}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
              Subdivision for {activeGroup ? activeGroup.label : 'group'}
            </div>
            <ul className="category-list">
              {isCustomer ? (
                (allowedSubsByAssignment.length === 0 ? [] : allowedSubsByAssignment).map(subdivision => (
                  <li
                    key={subdivision.id}
                    className={`category-item ${subdivisionId === subdivision.id ? 'active' : ''}`}
                  >
                    <button
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        color: 'inherit',
                        fontFamily: 'inherit',
                        padding: 0,
                        border: 'none',
                        background: 'transparent'
                      }}
                      onClick={() => {
                        onChangeSubdivision(subdivision.id)
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="category-pill">{subdivision.id}</span>
                        <span style={{ fontSize: 13 }}>{subdivision.label}</span>
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.5px' }}>
                        Assigned
                      </span>
                    </button>
                  </li>
                ))
              ) : Array.isArray(effAllowedSubdivision) && effAllowedSubdivision.length > 0 ? (
                effAllowedSubdivision
                  .map(id => subdivisions.find(s => s.id === id))
                  .filter(Boolean)
                  .map(subdivision => (
                    <li
                      key={subdivision.id}
                      className={`category-item ${subdivisionId === subdivision.id ? 'active' : ''}`}
                    >
                      <div
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'default',
                          color: 'inherit',
                          fontFamily: 'inherit',
                          padding: 0,
                          border: 'none',
                          background: 'transparent'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="category-pill">{subdivision.id}</span>
                          <span style={{ fontSize: 13 }}>{subdivision.label}</span>
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.5px' }}>
                          Assigned
                        </span>
                      </div>
                    </li>
                  ))
              ) : (
                // Standard Selectable List
                subdivisions.map((subdivision) => (
                <li
                  key={subdivision.id}
                  className={`category-item ${
                    subdivisionId === subdivision.id ? 'active' : ''
                  }`}
                >
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      color: 'inherit',
                      fontFamily: 'inherit',
                    }}
                    onClick={() => onChangeSubdivision(subdivision.id)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="category-pill">{subdivision.id}</span>
                      <span style={{ fontSize: 13 }}>{subdivision.label}</span>
                    </span>
                  </button>
                </li>
              ))
              )}
            </ul>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Requirements for {subdivisionId || 'selected subdivision'}{selectedCategoryBlock ? ` — ${selectedCategoryBlock}` : ''}
            </div>
            {questions.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: '#6b7280',
                  padding: '10px 0',
                }}
              >
                No questions loaded for this subdivision yet.
              </div>
            ) : (
              <table className="section-table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>Sl. No.</th>
                    <th style={{ width: 160 }}>Category / subcategory</th>
                    <th>Question</th>
                    <th style={{ width: 150 }}>Value</th>
                    <th style={{ width: 160 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((question, index) => {
                    const catNorm = normalizeBlock(question.block)
                    const valueOnly = String(effectiveGroupId) === 'H' && String(subdivisionId) === 'H-GEN' && (catNorm === 'building materials' || catNorm === 'type of construction')
                    const isInputOnly = valueOnly || isInputOnlyBlock(question.block)
                    
                    return (
                    <tr key={question.id}>
                      <td>{index + 1}</td>
                      <td>{question.block || '-'}</td>
                      <td>{question.requirement}</td>
                      <td>
                        {isInputOnly ? (
                          <input
                            className="field-input"
                            type="text"
                            style={{ fontSize: 12, padding: '6px 8px' }}
                            value={valueMap[getKey(question.id)] || ''}
                            onChange={(event) =>
                              handleValueChange(question.id, event.target.value)
                            }
                            placeholder="Type value"
                          />
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td>
                        {!isInputOnly && !valueOnly && (
                        <select
                          className="status-select"
                          value={statusMap[getKey(question.id)] || ''}
                          onChange={(event) =>
                            handleStatusChange(question.id, event.target.value)
                          }
                          
                        >
                          <option value="">Select status</option>
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        )}
                        {(isInputOnly || valueOnly) && (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecordAssessments
