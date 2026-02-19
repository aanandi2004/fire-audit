import React, { useState, useEffect } from 'react'
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'
import { auth } from '../firebase'

function CloseObservationsPage({
  allowedGroup,
  allowedSubdivision,
  groupId,
  statusMap,
  user,
  assignments
}) {
  const effAllowedGroup = React.useMemo(() => {
    if (allowedGroup) return allowedGroup
    return null
  }, [allowedGroup])
  const effAllowedSubdivision = React.useMemo(() => {
    if (Array.isArray(allowedSubdivision) && allowedSubdivision.length > 0) return allowedSubdivision
    if (allowedSubdivision && typeof allowedSubdivision === 'string') return [allowedSubdivision]
    return []
  }, [allowedSubdivision])
  const blocks = React.useMemo(() => {
    const list = Array.isArray(assignments) ? assignments : []
    const orgId = user?.orgId || ''
    const scoped = list.filter(a => a.org_id === orgId || a.orgId === orgId)
    const ids = Array.from(new Set(scoped.map(a => a.block_name || a.block_id).filter(Boolean)))
    return ids.map(id => ({ id: String(id), name: String(id) }))
  }, [assignments, user])
  const [selectedBlockId, setSelectedBlockId] = useState(() => (Array.isArray(blocks) && blocks[0]?.id) || '')
  useEffect(() => {
    if (!selectedBlockId && blocks.length > 0) {
      setSelectedBlockId(blocks[0].id)
    }
  }, [blocks, selectedBlockId])
  const getKey = React.useCallback((qId) => (selectedBlockId ? `${selectedBlockId}::${qId}` : qId), [selectedBlockId])
  const [selectedGroupId, setSelectedGroupId] = useState(() => {
    if (effAllowedGroup && effAllowedGroup.id) return effAllowedGroup.id
    return groupId || 'A'
  })
  const isCustomer = user?.role === 'Customer'
  // Initialize with the first subdivision of the selected group
  const activeGroup = RECORD_GROUPS.find(g => g.id === selectedGroupId) || RECORD_GROUPS[0]
  
  // We need to handle the case where activeGroup might not have subdivisions or handle it gracefully
  const initialSubId = (() => {
    if (Array.isArray(effAllowedSubdivision) && effAllowedSubdivision.length > 0) return effAllowedSubdivision[0]
    if (effAllowedSubdivision && typeof effAllowedSubdivision === 'string') return effAllowedSubdivision
    return activeGroup && activeGroup.subdivisions.length > 0 ? activeGroup.subdivisions[0].id : ''
  })()
  const [selectedSubdivisionId, setSelectedSubdivisionId] = useState(initialSubId)
  const [selectedCategory, setSelectedCategory] = useState('')

  // Sync with parent groupId change
  useEffect(() => {
    if (effAllowedGroup && effAllowedGroup.id) setSelectedGroupId(effAllowedGroup.id)
  }, [groupId, effAllowedGroup])

  const [observations, setObservations] = useState([])
  useEffect(() => {
    try {
      const groupCanonical = selectedGroupId
      const subId = selectedSubdivisionId
      if (!groupCanonical || !subId) {
        setObservations([])
        return
      }
      const questions = getQuestions(groupCanonical, subId)
      const res = []
      for (const q of questions) {
        try { console.log('CustomerHydrateKey', String(selectedBlockId), String(q.id), getKey(q.id)) } catch { /* noop */ }
        const stLower = statusMap[getKey(q.id)] || ''
        const stUpper = (stLower || '').toUpperCase().replace(' ', '_')
        const isGap = stLower === 'partial' || stLower === 'not_in_place'
        const sec = q.block || 'General'
        const catMatch = !selectedCategory || String(sec) === String(selectedCategory)
        if (isGap && catMatch) {
          res.push({
            id: String(q.id),
            category: groupCanonical,
            subcategory: subId,
            section: sec,
            status: stUpper,
            requirement: q.requirement || ''
          })
        }
      }
      setObservations(res)
    } catch {
      setObservations([])
    }
  }, [selectedGroupId, selectedSubdivisionId, selectedCategory, statusMap, selectedBlockId, getKey])

  const [observationMetaMap] = useState({})
  const [auditorStatusMap2, setAuditorStatusMap2] = useState({});
  const [auditorObservationMap2, setAuditorObservationMap2] = useState({});
  const [closureDetailsMap, setClosureDetailsMap] = useState({});
  useEffect(() => {
  try {
    const orgId = user?.orgId || ''
    const list = Array.isArray(assignments) ? assignments : []
    const match = list.filter(x => (x.org_id === orgId || x.orgId === orgId) && (x.block_name === selectedBlockId || x.blockId === selectedBlockId))
    
      const auditId = match[0]?.id || match[0]?.assignment_id || ''
      const blockId = selectedBlockId || ''
      if (!auditId || !blockId) return;
      const aid = String(auditId).trim().toLowerCase();
      const bid = String(blockId).trim().toLowerCase();
      try { console.log('[CloseObs] Resolved AID/BID', { aid, bid }) } catch { /* noop */ }

    ;(async () => {
      const token = await auth.currentUser?.getIdToken?.()
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const resp = await fetch(`${BASE_URL}/audit/responses?assignment_id=${encodeURIComponent(aid)}`, {
        method: 'GET',
        headers: { Authorization: token ? `Bearer ${token}` : undefined }
      })
      if (!resp.ok) return
      const list = await resp.json().catch(() => [])
      const s = {};
      const c = {};
      const mergedStatus = {};

      ;(Array.isArray(list) ? list : []).forEach(item => {
        const d = item || {};
        const qid = String(d.question_id || item.id);
        
        // Use normalized keys to ensure UI sees them
        const key = getKey(qid);
        
        const statusRaw = (d.status ?? d.auditor_status ?? d.customer_status ?? '');
        const obsRaw = (d.observation ?? d.auditor_observation ?? d.customer_closure ?? '');
        s[qid] = String(statusRaw || '').toUpperCase();
        c[key] = obsRaw || '';
        
        const lower = String(statusRaw || '').toLowerCase()
        if (lower) mergedStatus[key] = lower
      });

      setAuditorStatusMap2(s);
      setAuditorObservationMap2(c);
    })()
  } catch (err) { console.error("Firestore Error:", err) }
}, [assignments, user, selectedBlockId, selectedGroupId, getKey]);
  // useEffect(() => {
  // useEffect(() => {
  //   try {
  //     const orgId = user?.orgId || ''
  //     const list = Array.isArray(assignments) ? assignments : []
  //     const match = list.filter(x => (x.org_id === orgId || x.orgId === orgId) && (x.block_id === selectedBlockId || x.blockId === selectedBlockId || x.block_name === selectedBlockId))
  //     const auditId = (match[0]?.id || match[0]?.assignment_id || '').trim()
  //     const blockId = (selectedBlockId || '').trim()
  //     if (!auditId || !blockId) return
 

  // const [auditorStatusMap2, setAuditorStatusMap2] = useState({})
  // const [auditorObservationMap2, setAuditorObservationMap2] = useState({})
  // useEffect(() => {
  //   try {
  //     const orgId = user?.orgId || ''
  //     const list = Array.isArray(assignments) ? assignments : []
  //     const match = list.filter(x => (x.org_id === orgId || x.orgId === orgId) && (x.block_id === selectedBlockId || x.blockId === selectedBlockId || x.block_name === selectedBlockId))
  //     const auditId = match[0]?.id || match[0]?.assignment_id || ''
  //     const blockId = selectedBlockId || ''
  //     if (!auditId || !blockId) return
 

  // (removed duplicate state) 
  const [sectionFrozen, setSectionFrozen] = useState(false)
  const CUSTOMER_LOCKED = sectionFrozen

  const activeSubdivision = activeGroup?.subdivisions.find(s => s.id === selectedSubdivisionId)

  // Compute allowed subdivisions strictly from assignments for selected block
  const allowedSubdivisionsFromAssignments = React.useMemo(() => {
    const orgId = user?.orgId || ''
    const list = Array.isArray(assignments) ? assignments : []
    const scoped = list.filter(x => {
      const sameOrg = (x.org_id === orgId || x.orgId === orgId)
      const sameBlock = (
        String(x.block_id) === String(selectedBlockId) ||
        String(x.block_name) === String(selectedBlockId) ||
        String(x.blockId) === String(selectedBlockId)
      )
      const sameGroup = String(x.group) === String(selectedGroupId)
      return sameOrg && sameBlock && sameGroup
    })
    const ids = Array.from(new Set(scoped.map(x => x.subdivision_id).filter(Boolean)))
    return ids
  }, [assignments, user, selectedBlockId, selectedGroupId])

  // Ensure selectedSubdivisionId is from canonical allowed list
  useEffect(() => {
    const allowed = Array.isArray(allowedSubdivisionsFromAssignments) ? allowedSubdivisionsFromAssignments : []
    if (allowed.length === 0) return
    if (!allowed.includes(selectedSubdivisionId)) {
      setSelectedSubdivisionId(allowed[0])
    }
  }, [allowedSubdivisionsFromAssignments, selectedSubdivisionId])

  // Calculate counts for subdivisions
  function getCounts(subId) {
    try {
      const subQuestions = getQuestions(selectedGroupId, subId) || []
      let closed = 0
      let gap = 0
      subQuestions.forEach(q => {
        const status = statusMap[getKey(q.id)]
        if (status === 'in_place' || status === 'not_relevant') {
          closed++
        } else if (status === 'not_in_place' || status === 'partial') {
          gap++
        }
      })
      return { closed, gap }
    } catch {
      return { closed: 0, gap: 0 }
    }
  }

  return (
    <div className="close-layout-container">
      {/* Left Sidebar */}
      <div className="close-sidebar-panel">
        <div className="close-sidebar-header">
            <div className="sidebar-instruction">
                Select a Block and a particular section to review Audit Observations and record their closure.
            </div>
            <div className="sidebar-field-group">
              <label>Block</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {blocks.length === 0 ? (
                  <span style={{ fontSize: 12, color: '#6b7280' }}>No blocks defined</span>
                ) : (
                  blocks.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      className={`group-chip ${selectedBlockId === b.id ? 'active' : ''}`}
                      onClick={() => setSelectedBlockId(b.id)}
                    >
                      {b.name}
                    </button>
                  ))
                )}
              </div>
            </div>
            <div className="sidebar-field-group">
              <label>Group</label>
              {effAllowedGroup || isCustomer ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" className="group-chip active" style={{ cursor: 'default' }}>
                    {selectedGroupId}
                  </button>
                  <div className="sidebar-select" style={{ display: 'flex', alignItems: 'center', height: 32, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '0 8px', color: '#334155' }}>
                    {((RECORD_GROUPS.find(g => g.id === selectedGroupId) || {}).label) || selectedGroupId}
                  </div>
                </div>
              ) : (
                <select
                    className="sidebar-select"
                    value={selectedGroupId}
                    onChange={(e) => {
                    const newGroupId = e.target.value
                    setSelectedGroupId(newGroupId)
                    const newGroup = RECORD_GROUPS.find(g => g.id === newGroupId)
                    if (newGroup && newGroup.subdivisions.length > 0) {
                        setSelectedSubdivisionId(newGroup.subdivisions[0].id)
                    }
                    }}
                >
                    {RECORD_GROUPS.map(g => (
                    <option key={g.id} value={g.id}>{g.label} ({g.id})</option>
                    ))}
                </select>
              )}
            </div>
        </div>

        <div className="sidebar-table-container">
            <table className="sidebar-table">
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left' }}>Section</th>
                        <th style={{ width: 50, textAlign: 'center' }}>Closed</th>
                        <th style={{ width: 50, textAlign: 'center' }}>Gap</th>
                    </tr>
                </thead>
                <tbody>
                    {(Array.isArray(allowedSubdivisionsFromAssignments) ? allowedSubdivisionsFromAssignments : [])
                      .map(id => (activeGroup && Array.isArray(activeGroup.subdivisions) ? activeGroup.subdivisions.find(s => s.id === id) : null))
                      .filter(Boolean)
                    .map((sub) => {
                        const { closed, gap } = getCounts(sub.id)
                        const isActive = selectedSubdivisionId === sub.id
                        const isAllowed = Array.isArray(allowedSubdivisionsFromAssignments) && allowedSubdivisionsFromAssignments.includes(sub.id)
                        const categorySummary = (() => {
                          try {
                            const list = getQuestions(selectedGroupId, sub.id) || []
                            const map = {}
                            for (const q of list) {
                              const cat = q.block || 'General'
                              const st = statusMap[getKey(q.id)] || ''
                              const isClosed = st === 'in_place' || st === 'not_relevant'
                              const isGap = st === 'partial' || st === 'not_in_place'
                              if (!map[cat]) map[cat] = { closed: 0, gap: 0 }
                              if (isClosed) map[cat].closed += 1
                              if (isGap) map[cat].gap += 1
                            }
                            return Object.entries(map)
                          } catch {
                            return []
                          }
                        })()

                        return (
                            <React.Fragment key={sub.id}>
                              <tr 
                                  className={`sidebar-row ${isActive ? 'active' : ''}`}
                                  style={!isAllowed ? { opacity: 0.5, pointerEvents: 'none', filter: 'grayscale(100%)' } : {}}
                                  onClick={() => { if (isAllowed) { setSelectedSubdivisionId(sub.id); setSelectedCategory('') } }}
                              >
                                  <td className="section-name">{sub.label}</td>
                                  <td className="text-center">{closed}</td>
                                  <td className="text-center">{gap}</td>
                              </tr>
                              {categorySummary.length > 0 && categorySummary.map(([cat, counts]) => (
                                <tr key={`${sub.id}::cat::${cat}`}>
                                  <td className="section-name" style={{ paddingLeft: 16, cursor: 'pointer' }} onClick={() => { setSelectedSubdivisionId(sub.id); setSelectedCategory(cat) }}>{cat}</td>
                                  <td className="text-center">{counts.closed}</td>
                                  <td className="text-center" style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => { setSelectedSubdivisionId(sub.id); setSelectedCategory(cat) }}>{counts.gap}</td>
                                </tr>
                              ))}
                            </React.Fragment>
                        )
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* Right Content */}
      <div className="close-main-panel">
        <div className="close-main-header">
            <h2 className="section-title">{activeSubdivision ? activeSubdivision.label : 'Selected Section'}</h2>
        </div>

        <div className="close-toolbar">
            <div className="toolbar-actions">
                <button className="btn-tool btn-save" disabled={CUSTOMER_LOCKED} onClick={async () => {
                    try {
                      if (CUSTOMER_LOCKED) {
                        alert('Customer system is locked')
                        return
                      }
                      const orgId = user?.orgId || ''
                      const list = Array.isArray(assignments) ? assignments : []
                      const match = list.filter(x => (x.org_id === orgId || x.orgId === orgId) && (x.block_id === selectedBlockId || x.blockId === selectedBlockId))
                      const auditId = (match[0]?.id || match[0]?.assignment_id || '').trim()
                      const blockId = (selectedBlockId || '').trim()
                      if (!auditId || !blockId) return
                      const token = await auth.currentUser.getIdToken()
                      for (const q of observations) {
                        const details = closureDetailsMap[getKey(q.id)] || ''
                        {
                          const BASE_URL_SAVE = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
                          await fetch(`${BASE_URL_SAVE}/audit/observations/customer/save`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', idToken: token },
                          body: JSON.stringify({
                            audit_id: auditId,
                            block_id: blockId,
                            group: selectedGroupId,
                            subgroup: selectedSubdivisionId,
                            section: q.section || '',
                            question_id: String(q.id),
                            customer_closure: details,
                            customer_status: q.status
                          })
                          })
                        }
                      }
                      alert('Changes saved')
                    } catch (e) { console.error('[CloseObservations] Save failed', e) }
                }}>
                    <span className="icon">💾</span> Save changes
                </button>
                <button className="btn-tool btn-submit" disabled={CUSTOMER_LOCKED} onClick={async () => {
                    try {
                      if (CUSTOMER_LOCKED) {
                        alert('Customer system is locked')
                        return
                      }
                      const orgId = user?.orgId || ''
                      const list = Array.isArray(assignments) ? assignments : []
                      const match = list.filter(x => (x.org_id === orgId || x.orgId === orgId) && (x.block_id === selectedBlockId || x.blockId === selectedBlockId))
                      const auditId = (match[0]?.id || match[0]?.assignment_id || '').trim()
                      const blockId = (selectedBlockId || '').trim()
                      if (!auditId || !blockId) return
                      const token = await auth.currentUser.getIdToken()
                      const BASE_URL_SUBMIT = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
                      const resp = await fetch(`${BASE_URL_SUBMIT}/audit/observations/customer/submit`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', idToken: token },
                        body: JSON.stringify({
                          audit_id: auditId,
                          block_id: blockId,
                          group: selectedGroupId,
                          subgroup: selectedSubdivisionId,
                          section: activeSubdivision ? activeSubdivision.label : ''
                        })
                      })
                      if (resp.ok) {
                        setSectionFrozen(true)
                        alert('Closure submitted. Section is now frozen.')
                        try {
                          const BASE_URL_READY = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
                          const markReady = await fetch(`${BASE_URL_READY}/audits/${auditId}/ready`, {
                            method: 'POST',
                            headers: { idToken: token }
                          })
                          if (!markReady.ok) {
                            console.error('[Finalize] Failed to mark audit READY')
                          }
                        } catch (e) {
                          console.error('[Finalize] Error marking audit READY', e)
                        }
                      }
                    } catch (e) { console.error('[CloseObservations] Submit failed', e) }
                }}>
                    <span className="icon">✔</span> Submit (final)
                </button>
            </div>
            <div className="toolbar-right">
                <button className="btn-tool btn-refresh">
                    <span className="icon">↻</span> Refresh
                </button>
            </div>
        </div>

        <div className="close-table-container">
            <table className="close-audit-table">
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left' }}>Question</th>
                        <th style={{ width: '20%' }}>Org Status</th>
                        <th style={{ width: '15%' }}>Auditor Status</th>
                        <th style={{ width: '15%' }}>Auditor Observation</th>
                        <th style={{ width: '25%' }}>Closure Details</th>
                        <th style={{ width: '20%' }}>Evidence</th>
                    </tr>
                </thead>
                <tbody>
                    {observations.length === 0 ? (
                        <tr>
                            <td colSpan="6" style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>
                                No open observations for this section.
                            </td>
                        </tr>
                    ) : (
                        observations.map((q) => {
                            const meta = observationMetaMap[String(q.id)] || {}
                            const orgStRaw = (statusMap[getKey(q.id)] || '').toUpperCase()
                            const orgSt = orgStRaw === 'IN_PLACE' ? 'In Place' : orgStRaw === 'PARTIAL' ? 'Partially in Place' : orgStRaw === 'NOT_RELEVANT' ? 'Not Relevant' : orgStRaw === 'NOT_IN_PLACE' ? 'Not in Place' : '-'
                            const auditorStRaw = String(auditorStatusMap2[getKey(q.id)] || '').toUpperCase()
                            const auditorSt = auditorStRaw === 'IN_PLACE' ? 'In Place' : auditorStRaw === 'PARTIAL' ? 'Partially in Place' : auditorStRaw === 'NOT_RELEVANT' ? 'Not Relevant' : auditorStRaw === 'NOT_IN_PLACE' ? 'Not in Place' : '-'
                            try { console.log('CustomerRenderKey', String(selectedBlockId), String(q.id), getKey(q.id), orgStRaw, auditorStRaw) } catch { /* noop */ }
                            const auditorObsText = (auditorObservationMap2[getKey(q.id)] || '').toString() || '-'
                            const uploads = Array.isArray(meta.customer_uploads) ? meta.customer_uploads : []

                            return (
                                <tr key={q.id}>
                                    <td className="cell-question">
                                        {q.requirement}
                                    </td>
                                    <td className="text-center">{orgSt}</td>
                                    <td className="text-center">{auditorSt}</td>
                                    <td className="text-center">{auditorObsText}</td>
                                    <td className="cell-closure">
                                        <div className="closure-inputs">
                                            <textarea
                                                className="closure-select"
                                                value={closureDetailsMap[getKey(q.id)] || ''}
                                                onChange={(e) => setClosureDetailsMap(prev => ({ ...prev, [getKey(q.id)]: e.target.value }))}
                                                placeholder="Describe closure actions taken..."
                                                disabled={sectionFrozen}
                                                rows={3}
                                            />
                                        </div>
                                    </td>
                                    <td className="cell-closure">
                                        <div style={{ marginBottom: 8 }}>
                                          {uploads.length === 0 ? <span style={{ color: '#94a3b8' }}>No evidence</span> : uploads.map((u, idx) => (
                                            <div key={`${q.id}::up::${idx}`}><a href={u} target="_blank" rel="noreferrer">Evidence {idx+1}</a></div>
                                          ))}
                                        </div>
                                        <input
                                          type="file"
                                          accept="image/*,application/pdf"
                                          disabled={sectionFrozen}
                                          onChange={async (e) => {
                                            try {
                                              const file = e.target.files?.[0]
                                              if (!file) return
                                              const orgId = user?.orgId || ''
                                              const list = Array.isArray(assignments) ? assignments : []
                                              const match = list.filter(x => (x.org_id === orgId || x.orgId === orgId) && (x.block_id === selectedBlockId || x.blockId === selectedBlockId))
                                              const auditId = (match[0]?.id || match[0]?.assignment_id || '').trim()
                                              const blockId = (selectedBlockId || '').trim()
                                              const token = await auth.currentUser.getIdToken()
                                              const form = new FormData()
                                              form.append('audit_id', auditId)
                                              form.append('block_id', blockId)
                                              form.append('question_id', String(q.id))
                                              form.append('file', file)
                                              {
                                                const BASE_URL_UPLOAD = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
                                                await fetch(`${BASE_URL_UPLOAD}/audit/observations/upload`, {
                                                method: 'POST',
                                                headers: { idToken: token },
                                                body: form
                                                })
                                              }
                                            } catch { /* silent */ }
                                          }}
                                        />
                                    </td>
                                   
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
        
        {/* Removed extra free-form observation section to maintain strict scope */}
      </div>
    </div>
  )
}

export default CloseObservationsPage
