import React, { useState, useEffect } from 'react'
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'
import { auth } from '../firebase'

function CloseObservationsPage({
  allowedGroup,
  allowedSubdivision,
  groupId,
  user,
  assignments,
  selectedBlockId: controlledBlockId,
  onChangeBlockId,
  onAuditContextChange
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
    const ids = Array.from(new Set(scoped.map(a => a.block_id || a.block_name).filter(Boolean)))
    return ids.map(raw => {
      const s = String(raw || '')
      const m = /^Block\s*(\d+)/i.exec(s)
      const canonical = m ? `block_${parseInt(m[1], 10)}` : s.toLowerCase()
      const display = m ? `Block ${parseInt(m[1], 10)}` : (/^block_(\d+)$/i.test(s) ? `Block ${parseInt((/^block_(\d+)$/i.exec(s) || [])[1] || '1', 10)}` : s)
      return { id: canonical, name: display }
    })
  }, [assignments, user])
  const [selectedBlockIdLocal, setSelectedBlockIdLocal] = useState(() => (Array.isArray(blocks) && blocks[0]?.id) || '')
  const selectedBlockId = controlledBlockId || selectedBlockIdLocal
  useEffect(() => {
    const match = blocks.some(b => String(b.id || '').toLowerCase() === String(selectedBlockId || '').toLowerCase())
    if ((!selectedBlockId || !match) && blocks.length > 0) {
      const next = blocks[0].id
      if (next === selectedBlockId) return
      if (onChangeBlockId) onChangeBlockId(next)
      else setSelectedBlockIdLocal(next)
    }
  }, [blocks, selectedBlockId, onChangeBlockId])
  // Unified docs from backend; no composite keys
  const [unifiedDocs, setUnifiedDocs] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(() => {
    if (effAllowedGroup && effAllowedGroup.id) return effAllowedGroup.id
    return groupId || 'A'
  })
  const isCustomer = String(user?.role || '').toUpperCase() === 'CUSTOMER'
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

  const [observationMetaMap] = useState({})
  const [closureDetailsMap] = useState({})
  const [closedRows, setClosedRows] = useState([])
  const [gapRows, setGapRows] = useState([])
  const handleUpload = async (qid, file) => {
    try {
      if (!file) return
      const orgId = user?.orgId || ''
      const list = Array.isArray(assignments) ? assignments : []
      const match = list.filter(x => (x.org_id === orgId || x.orgId === orgId) && (x.block_name === selectedBlockId || x.blockId === selectedBlockId || x.block_id === selectedBlockId))
      const auditId = (match[0]?.audit_id || '').trim()
      const blockId = String(selectedBlockId || '').trim()
      if (!auditId || !blockId) return
      const token = await auth.currentUser?.getIdToken?.()
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const fd = new FormData()
      fd.append('audit_id', auditId)
      fd.append('block_id', blockId)
      fd.append('question_id', String(qid).trim())
      fd.append('file', file)
      const resp = await fetch(`${BASE_URL}/audit/observations/upload`, {
        method: 'POST',
        headers: { idToken: token },
        body: fd
      })
      const data = await resp.json().catch(() => ({}))
      const url = data && data.url ? data.url : ''
      const key = String(qid).trim().toUpperCase()
      const meta = observationMetaMap[key] || { customer_uploads: [], auditor_uploads: [] }
      const arr = Array.isArray(meta.customer_uploads) ? meta.customer_uploads : []
      if (url) arr.push({ url, name: file.name })
      observationMetaMap[key] = { ...meta, customer_uploads: arr }
    } catch { /* noop */ }
  }
  useEffect(() => {
    try {
      const groupCanonical = selectedGroupId
      const subId = selectedSubdivisionId
      if (!groupCanonical || !subId) {
        setClosedRows([])
        setGapRows([])
        return
      }
      const qs = getQuestions(groupCanonical, subId) || []
      const closed = []
      const gaps = []
      for (const q of qs) {
        const doc = (Array.isArray(unifiedDocs) ? unifiedDocs : []).find(d =>
          String(d.question_id).trim().toUpperCase() === String(q.id).trim().toUpperCase()
        )
        const orgStRaw = (doc?.org?.status || doc?.customer_status || doc?.status || '')
        const audStRaw = (doc?.auditor?.status || doc?.auditor_status || '')
        const orgSt = String(orgStRaw || '').toUpperCase().trim()
        const audSt = String(audStRaw || '').toUpperCase().trim()
        const sec = q.block || 'General'
        const row = {
            id: String(q.id),
            section: sec,
            requirement: q.requirement || '',
            org_status: (() => {
              const isInputOnly = /^(building details|type of construction)$/i.test(String(sec || ''))
              if (isInputOnly) {
                const v = doc?.org?.value ?? doc?.value ?? ''
                return String(v || '').trim() || '—'
              }
              return orgSt || '—'
            })(),
            auditor_status: audSt || '—',
            auditor_observation: String(doc?.auditor?.observation || doc?.auditor_observation || doc?.observation || ''),
            evidence_customer: (() => {
              const e1 = Array.isArray(doc?.org?.uploads) ? doc.org.uploads : []
              const e2 = Array.isArray(doc?.org?.evidence) ? doc.org.evidence : []
              return [...e1, ...e2]
            })(),
            evidence_auditor: Array.isArray(doc?.auditor?.uploads) ? doc.auditor.uploads : []
          }
        const isClosed = (orgSt !== '' && audSt !== '' && orgSt === audSt)
        if (isClosed) {
          closed.push(row)
        } else {
          gaps.push(row)
        }
      }
      setClosedRows(closed)
      setGapRows(gaps)
    } catch {
      setClosedRows([])
      setGapRows([])
    }
  }, [selectedGroupId, selectedSubdivisionId, unifiedDocs, selectedBlockId])

  useEffect(() => {
    try {
      const orgId = user?.orgId || ''
      const list = Array.isArray(assignments) ? assignments : []
      const match = list.filter(x => (x.org_id === orgId || x.orgId === orgId) && (x.block_name === selectedBlockId || x.blockId === selectedBlockId || x.block_id === selectedBlockId))
      const auditId = (match[0]?.audit_id || '').trim()
      const blockId = String(selectedBlockId || '').trim()
      if (!auditId || !blockId) return
      ;(async () => {
        const token = await auth.currentUser?.getIdToken?.()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const resp = await fetch(`${BASE_URL}/audit/responses?audit_id=${encodeURIComponent(auditId)}&block_id=${encodeURIComponent(blockId)}`, {
          method: 'GET',
          headers: { idToken: token }
        })
        if (!resp.ok) return
        const list = await resp.json().catch(() => [])
        setUnifiedDocs(Array.isArray(list) ? list : [])
        if (typeof onAuditContextChange === 'function') {
          onAuditContextChange({ auditId, blockId, groupId: selectedGroupId, subdivisionId: selectedSubdivisionId })
        }
      })()
    } catch (err) { console.error("Unified Fetch Error:", err) }
  }, [assignments, user, selectedBlockId, selectedGroupId, selectedSubdivisionId, onAuditContextChange])

  useEffect(() => {
    (async () => {
      try {
        const orgId = user?.orgId || ''
        const list = Array.isArray(assignments) ? assignments : []
        const match = list.filter(x => (x.org_id === orgId || x.orgId === orgId) && (x.block_name === selectedBlockId || x.blockId === selectedBlockId || x.block_id === selectedBlockId))
        const auditId = (match[0]?.audit_id || '').trim()
        const blockId = String(selectedBlockId || '').trim()
        if (!auditId || !blockId) return
        const token = await auth.currentUser?.getIdToken?.()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const params = new URLSearchParams({ audit_id: auditId, block_id: blockId })
        const resp = await fetch(`${BASE_URL}/audit/observations?${params.toString()}`, {
          headers: { idToken: token }
        })
        if (!resp.ok) return
        const rows = await resp.json().catch(() => [])
        rows.forEach(d => {
          const qid = String(d.question_id || d.id).trim().toUpperCase()
          const custUploads = Array.isArray(d.customer_uploads) ? d.customer_uploads : []
          const orgUploads = Array.isArray(d.org?.uploads) ? d.org.uploads : (Array.isArray(d.org?.evidence) ? d.org.evidence : [])
          const audUploads = Array.isArray(d.auditor_uploads) ? d.auditor_uploads : []
          const custClosure = typeof d.customer_closure === 'string' ? d.customer_closure : (d.org?.closure_details || '')
          observationMetaMap[qid] = { customer_uploads: [...custUploads, ...orgUploads], auditor_uploads: audUploads }
          if (custClosure) {
            closureDetailsMap[qid] = custClosure
          }
        })
      } catch { /* noop */ }
    })()
  }, [assignments, user, selectedBlockId, selectedGroupId, observationMetaMap])
  // useEffect(() => {
  // Removed separate org-responses hydration; unifiedDocs covers both org and auditor
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
  const [sectionFrozen] = useState(false)
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
        const doc = (Array.isArray(unifiedDocs) ? unifiedDocs : []).find(d =>
          String(d.question_id).trim().toUpperCase() === String(q.id).trim().toUpperCase()
        )
        const orgSt = String((doc?.org?.status || doc?.customer_status || doc?.status || '')).toUpperCase()
        const audSt = String((doc?.auditor?.status || doc?.auditor_status || '')).toUpperCase()
        if (orgSt !== '' && audSt !== '' && orgSt === audSt) {
          closed++
        } else {
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
                                  className={`group-chip ${String(selectedBlockId || '').toLowerCase() === String(b.id || '').toLowerCase() ? 'active' : ''}`}
                      onClick={() => { if (onChangeBlockId) onChangeBlockId(b.id); else setSelectedBlockIdLocal(b.id) }}
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
                              const doc = (Array.isArray(unifiedDocs) ? unifiedDocs : []).find(d =>
                                String(d.question_id).trim().toUpperCase() === String(q.id).trim().toUpperCase()
                              )
                              const orgSt = String((doc?.org?.status || doc?.customer_status || doc?.status || '')).toUpperCase()
                              const audSt = String((doc?.auditor?.status || doc?.auditor_status || '')).toUpperCase()
                              const isClosed = (orgSt !== '' && audSt !== '' && orgSt === audSt)
                              const isGap = !isClosed
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
      <div className="close-main-panel" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
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
                      const match = list.filter(x => (x.org_id === orgId || x.orgId === orgId) && (x.block_id === selectedBlockId || x.blockId === selectedBlockId || x.block_name === selectedBlockId))
                      const auditId = (match[0]?.audit_id || '').trim()
                      const blockId = (selectedBlockId || '').trim()
                      if (!auditId || !blockId) return
                      const token = await auth.currentUser.getIdToken()
                      for (const q of gapRows) {
                        const details = closureDetailsMap[String(q.id)] || ''
                        {
                          const BASE_URL_SAVE = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
                          const qs = new URLSearchParams({
                            audit_id: String(auditId).trim(),
                            block_id: String(blockId).trim(),
                            group: String(selectedGroupId || ''),
                            subgroup: String(selectedSubdivisionId || ''),
                            section: String(q.section || ''),
                            question_id: String(q.id).trim(),
                            customer_closure: String(details || ''),
                            customer_status: String(q.org_status || '').toUpperCase()
                          })
                          await fetch(`${BASE_URL_SAVE}/audit/observations/customer/save?${qs.toString()}`, {
                            method: 'POST',
                            headers: { idToken: token }
                          })
                        }
                      }
                      try {
                        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
                        const params = new URLSearchParams({ audit_id: auditId, block_id: blockId })
                        const resp = await fetch(`${BASE_URL}/audit/observations?${params.toString()}`, {
                          headers: { idToken: token }
                        })
                        if (resp.ok) {
                          const rows = await resp.json().catch(() => [])
                          rows.forEach(d => {
                            const qidKey = String(d.question_id || d.id).trim().toUpperCase()
                            const custUploads = Array.isArray(d.customer_uploads) ? d.customer_uploads : []
                            const orgUploads = Array.isArray(d.org?.uploads) ? d.org.uploads : (Array.isArray(d.org?.evidence) ? d.org.evidence : [])
                            const combinedUploads = [...custUploads, ...orgUploads]
                            const audUploads = Array.isArray(d.auditor_uploads) ? d.auditor_uploads : []
                            const custClosure = typeof d.customer_closure === 'string' ? d.customer_closure : (d.org?.closure_details || '')
                            observationMetaMap[qidKey] = { customer_uploads: combinedUploads, auditor_uploads: audUploads }
                            if (custClosure) {
                              closureDetailsMap[qidKey] = custClosure
                            }
                          })
                        }
                      } catch { /* noop */ }
                      alert('Changes saved and hydrated')
                    } catch (e) { console.error('[CloseObservations] Save failed', e) }
                }}>
                    <span className="icon">💾</span> Save changes
                </button>
                
            </div>
        </div>

        <div style={{ marginTop: 16, overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed', minWidth: '1400px' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ border: '1px solid #e2e8f0', padding: 12, width: 50 }}>Sr.</th>
                <th style={{ border: '1px solid #e2e8f0', padding: 12, textAlign: 'left', width: '28%' }}>Question</th>
                <th style={{ border: '1px solid #e2e8f0', padding: 12, width: 110 }}>Org Status</th>
                <th style={{ border: '1px solid #e2e8f0', padding: 12, width: 110 }}>Auditor Status</th>
                <th style={{ border: '1px solid #e2e8f0', padding: 12, width: '20%' }}>Auditor Observation</th>
                <th style={{ border: '1px solid #e2e8f0', padding: 12, width: '30%' }}>Closure Details</th>
                <th style={{ border: '1px solid #e2e8f0', padding: 12, width: '15%' }}>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(gapRows) ? (selectedCategory ? gapRows.filter(r => String(r.section) === String(selectedCategory)) : gapRows) : []).map((row, idx) => {
                const qid = String(row.id)
                const meta = observationMetaMap[String(qid).trim().toUpperCase()] || {}
                const custUp = Array.isArray(meta.customer_uploads) ? meta.customer_uploads : []
                const custUpFromRow = Array.isArray(row.evidence_customer) ? row.evidence_customer : []
                const custEvidence = (custUpFromRow.length > 0) ? custUpFromRow : custUp
                const renderUploads = (uploads) => {
                  const arr = Array.isArray(uploads) ? uploads : []
                  if (arr.length === 0) return <span style={{ color: '#6b7280' }}>—</span>
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, whiteSpace: 'nowrap', overflowX: 'auto', maxWidth: '100%' }}>
                      {arr.map((u, i) => {
                        const href = typeof u === 'string' ? u : (u.url || '')
                        const name = typeof u === 'string' ? `file_${i+1}` : (u.name || u.filename || `file_${i+1}`)
                        return href ? <a key={i} href={href} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{name}</a> : <span key={i}>{name}</span>
                      })}
                    </div>
                  )
                }
                const hasCustEvidence = Array.isArray(custEvidence) && custEvidence.length > 0
                return (
                  <tr key={qid}>
                    <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', textAlign: 'center' }}>{String.fromCharCode(97 + (idx % 26))}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', textAlign: 'left', width: '28%', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{row.requirement}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', color: '#334155', width: 110 }}>{row.org_status}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', color: '#334155', width: 110 }}>{row.auditor_status}</td>
                    <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', width: '20%', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{row.auditor_observation || '—'}</div>
                    </td>
                    <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', width: '30%', maxWidth: 0 }}>
                      <textarea
                        style={{ width: '100%', minWidth: '100%', minHeight: '100px', border: '1px solid #cbd5e1', borderRadius: 4, padding: 8, boxSizing: 'border-box', resize: 'vertical', display: 'block' }}
                        defaultValue={closureDetailsMap[String(qid).trim().toUpperCase()] || ''}
                        onChange={e => { closureDetailsMap[String(qid).trim().toUpperCase()] = e.target.value }}
                        placeholder="Enter detailed closure actions taken..."
                      />
                    </td>
                    <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', width: '15%', whiteSpace: 'nowrap', overflowX: 'auto', maxWidth: '100%' }}>
                      {hasCustEvidence && (
                        <div style={{ whiteSpace: 'nowrap', overflowX: 'auto', maxWidth: '100%' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Customer</div>
                          {renderUploads(custEvidence)}
                        </div>
                      )}
                      {isCustomer && !CUSTOMER_LOCKED && (
                        <div style={{ marginTop: 8, whiteSpace: 'nowrap', overflowX: 'auto', maxWidth: '100%' }}>
                          <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(qid, f) }} />
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {(selectedCategory ? gapRows.filter(r => String(r.section) === String(selectedCategory)).length === 0 : gapRows.length === 0) && (
                <tr>
                  <td colSpan={7} style={{ border: '1px solid #e2e8f0', padding: 12, color: '#6b7280', textAlign: 'center' }}>
                    No gaps or differences for the current selection
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 24, overflowX: 'auto', width: '100%', maxWidth: '100%', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8 }}>Closed (matches)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed', minWidth: '1400px' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={{ border: '1px solid #e2e8f0', padding: 12, width: 50 }}>Sr.</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: 12, textAlign: 'left', width: '28%' }}>Question</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: 12, width: 110 }}>Org Status</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: 12, width: 120 }}>Auditor Status</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: 12, width: '20%' }}>Auditor Observation</th>
                  <th style={{ border: '1px solid #e2e8f0', padding: 12, width: '15%' }}>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(closedRows) ? (selectedCategory ? closedRows.filter(r => String(r.section) === String(selectedCategory)) : closedRows) : []).map((row, idx) => {
                  const qid = String(row.id)
                  const meta = observationMetaMap[String(qid).trim().toUpperCase()] || {}
                  const custUp = Array.isArray(meta.customer_uploads) ? meta.customer_uploads : []
                  const custUpFromRow = Array.isArray(row.evidence_customer) ? row.evidence_customer : []
                  const custEvidence = (custUpFromRow.length > 0) ? custUpFromRow : custUp
                  const renderUploads = (uploads) => {
                    const arr = Array.isArray(uploads) ? uploads : []
                    if (arr.length === 0) return <span style={{ color: '#6b7280' }}>—</span>
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, whiteSpace: 'nowrap', overflowX: 'auto', maxWidth: '100%' }}>
                        {arr.map((u, i) => {
                          const href = typeof u === 'string' ? u : (u.url || '')
                          const name = typeof u === 'string' ? `file_${i+1}` : (u.name || u.filename || `file_${i+1}`)
                          return href ? <a key={i} href={href} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{name}</a> : <span key={i}>{name}</span>
                        })}
                      </div>
                    )
                  }
                  const hasCustEvidence = Array.isArray(custEvidence) && custEvidence.length > 0
                  return (
                    <tr key={qid}>
                      <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', textAlign: 'center' }}>{String.fromCharCode(97 + (idx % 26))}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', textAlign: 'left', width: '28%', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{row.requirement}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', color: '#334155', width: 110 }}>{row.org_status}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', color: '#334155', width: 120 }}>{row.auditor_status}</td>
                      <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', width: '20%', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        <div style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{row.auditor_observation || '—'}</div>
                      </td>
                      <td style={{ border: '1px solid #e2e8f0', padding: 12, verticalAlign: 'top', width: '15%', whiteSpace: 'nowrap', overflowX: 'auto', maxWidth: '100%' }}>
                        {hasCustEvidence && (
                          <div style={{ whiteSpace: 'nowrap', overflowX: 'auto', maxWidth: '100%' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Customer</div>
                            {renderUploads(custEvidence)}
                          </div>
                        )}
                        {isCustomer && !CUSTOMER_LOCKED && (
                          <div style={{ marginTop: 8, whiteSpace: 'nowrap', overflowX: 'auto', maxWidth: '100%' }}>
                            <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(qid, f) }} />
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {closedRows.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ border: '1px solid #e2e8f0', padding: 12, color: '#6b7280', textAlign: 'center' }}>
                      No closed items for the current selection
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}


export default CloseObservationsPage
