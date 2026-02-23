import React, { useState } from 'react'
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'
import { auth } from '../firebase'
 
 
// PDF generation handled by backend

const normalizeBlock = (s) => (s || '').toLowerCase().trim()
const isInputOnlyBlock = (b) => {
  const x = normalizeBlock(b)
  return x === 'building details' || x === 'bulding details' || x === 'building materials' || x === 'type of construction'
}
const allowAuditorComment = (b) => {
  const x = normalizeBlock(b)
  return x === 'building details' || x === 'type of construction'
}

const STATUS_OPTIONS = [
  { value: 'in_place', label: 'In place' },
  { value: 'not_in_place', label: 'Not in place' },
  { value: 'partial', label: 'Partially in place' },
  { value: 'not_relevant', label: 'Not relevant' },
]

function AuditorAssessment({
  groupId,
  subdivisionId,
  blockId, // Added blockId prop
  onBack,
  auditorStatusMap,
  setAuditorStatusMap,
  auditorCommentMap,
  setAuditorCommentMap,
  orgName,
  auditId
}) {
  const activeGroup = RECORD_GROUPS.find((group) => group.id === groupId)
  const activeSubdivision = activeGroup?.subdivisions.find(s => s.id === subdivisionId)
  
  // Unified docs fetch handled below; render without composite keys
  const getKey = React.useCallback((qId) => String(qId || '').toLowerCase().trim(), [])

  // Category/Subcategory state
  const [localSelectedCategory, setLocalSelectedCategory] = useState(groupId || '')
  const [localSelectedSubcategory, setLocalSelectedSubcategory] = useState(subdivisionId || '')
  const selectedCategory = groupId || localSelectedCategory
  const selectedSubcategory = subdivisionId || localSelectedSubcategory

  // Fetch questions based on current selection
  const allQuestions = getQuestions(selectedCategory, selectedSubcategory)
  
  // Extract unique sections (blocks) from questions
  // We use a Set to get unique values, then convert back to array
  const allSections = [...new Set(allQuestions.map(q => q.block || 'General'))]

  // Determine available sections based on selection
  const visibleSections = allSections

  const [selectedSection, setSelectedSection] = useState('')

  const effectiveSelectedSection = visibleSections.length > 0
    ? (visibleSections.includes(selectedSection) ? selectedSection : visibleSections[0])
    : ''

  const visibleQuestions = allQuestions.filter(q => (q.block || 'General') === effectiveSelectedSection)
  /* removed proof ref */
  
  const fallbackSections = ['Building details']
  try {
    /* noop */
  } catch (e) { void e }
 
// Save progress (Backend only)
async function handleSave() {
  try {
    if (isAuditorLocked) return alert('Auditor system is locked')
    if (!auditId || !blockId) return alert('Missing audit or block')
    const user = auth.currentUser
    if (!user) throw new Error('No authenticated user')
    const token = await user.getIdToken(true)
    const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || 'http://localhost:8010'
    const savePromises = visibleQuestions.map(async (q) => {
      const qid = String(q.id).toLowerCase().trim()
      const status = auditorStatusMap[getKey(qid)] || ''
      const observation = auditorCommentMap[getKey(qid)] || ''
      if (!status && !observation) return
      const body = {
        audit_id: String(auditId).trim(),
        block_id: String(blockId).trim().toLowerCase(),
        question_id: qid,
        status: (status || '').toUpperCase().replace(' ', '_'),
        observation
      }
      const resp = await fetch(`${BASE_URL}/audit/auditor-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', idToken: token },
        body: JSON.stringify(body)
      })
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}))
        console.error('Save failed with status:', resp.status, errorData)
        if (resp.status === 403) alert('Permission Denied: Ensure you are the assigned auditor.')
      }
    })
    await Promise.all(savePromises)
    alert('Progress saved successfully!')
  } catch (error) {
    console.error('Save Error:', error)
    alert('Failed to save progress. Check console.')
  }
}

// 2. UPDATED STATUS CHANGE (Real-time updates)
async function handleStatusChange(questionId, value) {
  if (isAuditorLocked) return
  const qid = String(questionId).toLowerCase().trim()
  const key = getKey(qid)
  setAuditorStatusMap((prev) => ({ ...prev, [key]: value }))
  try {
    if (!auditId || !blockId) return
    const user = auth.currentUser
    if (!user) throw new Error('No authenticated user')
    const token = await user.getIdToken(true)
    const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || 'http://localhost:8010'
    const body = {
      audit_id: String(auditId).trim(),
      block_id: String(blockId).trim().toLowerCase(),
      question_id: qid,
      status: (value || '').toUpperCase().replace(' ', '_'),
      auditor_score: statusToScore(value)
    }
    const resp = await fetch(`${BASE_URL}/audit/auditor-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', idToken: token },
      body: JSON.stringify(body)
    })
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}))
      console.error('Save failed with status:', resp.status, errorData)
      if (resp.status === 403) alert('Permission Denied: Ensure you are the assigned auditor.')
    }
  } catch (e) {
    console.error('Auto-save status failed', e)
  }
}
  // function handleSave() {
  //   ;(async () => {
  //     try {
  //       if (isAuditorLocked) {
  //         alert('Auditor system is locked')
  //         return
  //       }
  //       if (!auditId || !blockId) return alert('Missing audit or block')
  //       const token = await auth.currentUser.getIdToken()
  //       const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8001'
  //       const payloads = []
  //       visibleQuestions.forEach((q) => {
  //         const qid = String(q.id)
  //         const status = auditorStatusMap[getKey(qid)] || ''
  //         const observation = auditorCommentMap[getKey(qid)] || ''
  //         if (status) {
  //           payloads.push({
  //             audit_id: String(auditId),
  //             block_id: String(blockId).trim(),
  //             question_id: qid,
  //             status: (status || '').toUpperCase().replace(' ', '_'),
  //             auditor_score: statusToScore(status)
  //           })
  //         }
  //         if (observation) {
  //           payloads.push({
  //             audit_id: String(auditId),
  //             block_id: String(blockId).trim(),
  //             question_id: qid,
  //             observation
  //           })
  //         }
  //       })
  //       await Promise.all(payloads.map(body =>
  //         fetch(`${BASE_URL}/audit/auditor-response`, {
  //           method: 'POST',
  //           headers: { 'Content-Type': 'application/json', idToken: token },
  //           body: JSON.stringify(body)
  //         })
  //       ))
  //       alert('Auditor progress saved successfully!')
  //     } catch {
  //       alert('Failed to save progress')
  //     }
  //   })()
  // }

  const [observations, setObservations] = useState([])
  const filteredObservations = React.useMemo(
    () => observations.filter(o => String(o.section || '').trim() === String(effectiveSelectedSection || '').trim()),
    [observations, effectiveSelectedSection]
  )
  const [orgStatusMap, setOrgStatusMap] = useState({})
  const [orgValueMap, setOrgValueMap] = useState({})
  const [verifying, setVerifying] = useState(false)
  /* audit info fetch removed */
  const isFirstSubcategory = React.useMemo(() => {
    try {
      const grp = RECORD_GROUPS.find(g => g.id === selectedCategory)
      const idx = grp?.subdivisions?.findIndex(s => s.id === selectedSubcategory)
      return (idx === 0)
    } catch { return false }
  }, [selectedCategory, selectedSubcategory])
  const [isAuditorLocked, setIsAuditorLocked] = useState(false)
  React.useEffect(() => {
    ;(async () => {
      try {
        if (!auditId) return
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const token = await auth.currentUser.getIdToken()
        const resp = await fetch(`${BASE_URL}/audits/${encodeURIComponent(String(auditId))}`, { headers: { idToken: token } })
        if (!resp.ok) return
        const info = await resp.json().catch(() => ({}))
        const locked = String(info?.status || '').toUpperCase() === 'COMPLETED'
        setIsAuditorLocked(locked)
        if (locked) window.__AUDIT_LOCK__ = true
      } catch { /* noop */ }
    })()
  }, [auditId])
  React.useEffect(() => {
    try {
      const initLocked = String((window.__AUDIT_LOCK__ || '')).toLowerCase() === 'true'
      if (initLocked) setIsAuditorLocked(true)
    } catch { /* noop */ }
    function onAuditStatus(ev) {
      try {
        const d = (ev && ev.detail) || {}
        if (String(d.auditId || '') === String(auditId || '')) {
          const locked = String(d.status || '').toUpperCase() === 'COMPLETED'
          setIsAuditorLocked(locked)
        }
      } catch { /* noop */ }
    }
    window.addEventListener('audit:status', onAuditStatus)
    return () => { window.removeEventListener('audit:status', onAuditStatus) }
  }, [auditId])
  const statusToScore = (s) => {
    const v = String(s || '').toUpperCase()
    if (v === 'IN_PLACE') return 5
    if (v === 'PARTIAL') return 3
    if (v === 'NOT_IN_PLACE' || v === 'NOT_RELEVANT') return 0
    return null
  }
  async function handleVerificationTableSave() {
    try {
      if (!auditId || !blockId) return
      const token = await auth.currentUser.getIdToken()
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const tasks = visibleQuestions.map(async (q) => {
        const found = observations.find(x => String(x.question_id) === String(q.id) && (x.section || '') === (effectiveSelectedSection || '')) || {}
        const qid = String(q.id).trim().toUpperCase()
        const closure_status = String((found?.auditor?.closure_status || found.auditor_closure_status || '')).toUpperCase()
        const auditor_remark = String((found?.auditor?.remark || found.auditor_remark || '')).trim()
        if (!closure_status && !auditor_remark) return
        const url = `${BASE_URL}/audit-responses/${encodeURIComponent(String(auditId).trim())}/${encodeURIComponent(String(blockId).trim().toLowerCase())}/${encodeURIComponent(qid)}`
        const resp = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', idToken: token },
          body: JSON.stringify({ closure_status, auditor_remark, auditor: { closure_status, remark: auditor_remark } })
        })
        if (!resp.ok) {
          console.error('Verification save failed', resp.status)
        }
      })
      await Promise.all(tasks)
      alert('Verification saved')
    } catch (e) {
      console.error('Verification save error', e)
      alert('Save failed')
    }
  }
  /* audit lock removed */
  React.useEffect(() => {
    if (!auditId || !blockId) return
    const controller = new AbortController()
    ;(async () => {
      try {
        const token = await auth.currentUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const params = new URLSearchParams({ audit_id: String(auditId).trim(), block_id: String(blockId).trim() })
        const resp = await fetch(`${BASE_URL}/org-responses/list?${params.toString()}`, { method: 'GET', headers: { idToken: token }, signal: controller.signal })
        if (!resp.ok) {
          console.error('Org responses fetch failed', resp.status)
          return
        }
        const rows = await resp.json()
        const s = {}
        const v = {}
        ;(Array.isArray(rows) ? rows : []).forEach(d => {
          const key = getKey(d.question_id)
          const org = d.org || {}
          s[key] = String(org.status || '').toLowerCase()
          v[key] = org.value || ''
        })
        setOrgStatusMap(s)
        setOrgValueMap(v)
      } catch (e) {
        if (!(e && e.name === 'AbortError')) {
          console.error('Org responses fetch failed', e)
        }
      }
    })()
    return () => {
      try { controller.abort() } catch (e) { void e }
    }
  }, [auditId, blockId, getKey])
  React.useEffect(() => {
    if (!auditId || !blockId) return
    const controller = new AbortController()
    ;(async () => {
      try {
        const token = await auth.currentUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const params = new URLSearchParams({
          audit_id: String(auditId).trim(),
          block_id: String(blockId).trim()
        })
        const resp = await fetch(`${BASE_URL}/audit/responses?${params.toString()}`, { headers: { idToken: token }, signal: controller.signal })
        if (!resp.ok) return
        const rows = await resp.json().catch(() => [])
        const s = {}
        const c = {}
        ;(Array.isArray(rows) ? rows : []).forEach(d => {
          const key = getKey(d.question_id || d.id)
          const astatus = String(d.auditor_status || d.auditor?.status || '').toLowerCase()
          const aobs = String(d.auditor_observation || d.auditor?.observation || '')
          if (astatus) s[key] = astatus
          if (aobs) c[key] = aobs
        })
        if (Object.keys(s).length > 0) setAuditorStatusMap(prev => ({ ...prev, ...s }))
        if (Object.keys(c).length > 0) setAuditorCommentMap(prev => ({ ...prev, ...c }))
      } catch (e) {
        if (!(e && e.name === 'AbortError')) {
          console.error('Auditor responses fetch failed', e)
        }
      }
    })()
    return () => { try { controller.abort() } catch (e) { void e } }
  }, [auditId, blockId])
  // Removed Firestore snapshot subscription; hydration handled via backend fetch above
  /* removed debug path logs */
  const fetchingRef = React.useRef(false)
  const controllerRef = React.useRef(null)
  const debounceTimerRef = React.useRef(null)
  const currentKeyRef = React.useRef('')
  const fetchObservations = React.useCallback(async () => {
    if (!auditId || !blockId || !selectedSection) return
    const key = [String(auditId).trim(), String(blockId).trim(), String(selectedSection).trim()].join('|')
    if (fetchingRef.current && currentKeyRef.current === key) return
    /* noop */
    if (controllerRef.current) { try { controllerRef.current.abort() } catch (e) { void e } }
    fetchingRef.current = true
    currentKeyRef.current = key
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const token = await auth.currentUser.getIdToken()
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const params = new URLSearchParams({
        audit_id: String(auditId).trim(),
        block_id: String(blockId).trim(),
        section: String(selectedSection).trim()
      })
      const resp = await fetch(`${BASE_URL}/audit/observations?${params.toString()}`, { headers: { idToken: token }, signal: controller.signal })
      if (!resp.ok) {
        console.error('Observations fetch failed', resp.status)
        return
      }
      const list = await resp.json()
      setObservations(Array.isArray(list) ? list : [])
    } catch (err) {
      if (!(err && err.name === 'AbortError')) {
        console.error('Observations fetch failed', err)
      }
    } finally {
      fetchingRef.current = false
    }
  }, [auditId, blockId, selectedSection])
  React.useEffect(() => {
    if (!auditId || !blockId || !selectedSection) return
    if (debounceTimerRef.current) { try { clearTimeout(debounceTimerRef.current) } catch (e) { void e } }
    debounceTimerRef.current = setTimeout(() => { fetchObservations() }, 100)
    return () => {
      try { clearTimeout(debounceTimerRef.current) } catch (e) { void e }
      debounceTimerRef.current = null
      if (controllerRef.current) { try { controllerRef.current.abort() } catch (e) { void e } }
      fetchingRef.current = false
    }
  }, [auditId, blockId, selectedSection, fetchObservations])

  /* removed hydration debug logs */

  async function handleVerify(ob, status, remark) {
    try {
      if (!auditId || !blockId) return
      setVerifying(true)
      const token = await auth.currentUser.getIdToken()
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const qid = String(ob.question_id).trim().toUpperCase()
      const resp = await fetch(`${BASE_URL}/audit-responses/${encodeURIComponent(String(auditId).trim())}/${encodeURIComponent(String(blockId).trim().toLowerCase())}/${encodeURIComponent(qid)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', idToken: token },
        body: JSON.stringify({ closure_status: String(status || '').trim().toUpperCase(), auditor_remark: String(remark || '').trim(), auditor: { closure_status: String(status || '').trim().toUpperCase(), remark: String(remark || '').trim() } })
      })
      if (resp.ok) {
        setObservations(prev => prev.map(x => {
          if (String(x.question_id) === String(ob.question_id)) {
            return {
              ...x,
              auditor_closure_status: status,
              auditor_remark: remark,
              closure_status: status === 'CLOSED' ? 'CLOSED' : (x.closure_status || 'SUBMITTED'),
              auditor: {
                ...(x.auditor || {}),
                closure_status: status,
                remark: remark
              }
            }
          }
          return x
        }))
      } else {
        try { console.error('Verify save failed', resp.status) } catch { void 0 }
      }
    } catch (e) { void e }
    finally {
      setVerifying(false)
    }
  }

  const VERIFICATION_STATUSES = [
    { value: 'CLOSED', label: 'Closed' },
    { value: 'NOT_CLOSED', label: 'Not Closed' },
    { value: 'STILL_OPEN', label: 'Still Open' },
    { value: 'NOT_RELEVANT', label: 'Not Relevant' }
  ]

  // function handleStatusChange(questionId, value) {
  //   if (isAuditorLocked) return
  //   setAuditorStatusMap((previous) => ({
  //     ...previous,
  //     [getKey(questionId)]: value,
  //   }))
  //   ;(async () => {
  //     try {
  //       if (!auditId || !blockId) return
  //       const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8001'
  //       const q = visibleQuestions.find(x => String(x.id) === String(questionId))
  //       const body = {
  //         audit_id: String(auditId).trim(),
  //         block_id: String(blockId).trim(),
  //         question_id: String(questionId),
  //         status: (value || '').toUpperCase().replace(' ', '_'),
  //         auditor_score: statusToScore(value)
  //       }
  //       await fetch(`${BASE_URL}/audit/auditor-response`, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json', idToken: await auth.currentUser.getIdToken() },
  //         body: JSON.stringify(body)
  //       })
  //       const body2 = {
  //         audit_id: String(auditId).trim(),
  //         block_id: String(blockId).trim(),
  //         group: String(selectedCategory || groupId || ''),
  //         subgroup: String(selectedSubcategory || subdivisionId || ''),
  //         section: String(effectiveSelectedSection || ''),
  //         question_id: String(questionId),
  //         question_text: q ? q.requirement : String(questionId),
  //         auditor_status: (value || '').toUpperCase().replace(' ', '_')
  //       }
  //       await fetch(`${BASE_URL}/audit/observations/auditor`, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json', idToken: await auth.currentUser.getIdToken() },
  //         body: JSON.stringify(body2)
  //       })
  //     } catch { void 0 }
  //   })()
  // }

  function handleCommentChange(questionId, value) {
    if (isAuditorLocked) return
    const qid = String(questionId).toLowerCase().trim()
    const key = getKey(qid)
    setAuditorCommentMap((previous) => ({
      ...previous,
      [key]: value,
    }))
    ;(async () => {
      try {
        if (!auditId || !blockId) return
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const body = {
          audit_id: String(auditId).trim().toLowerCase(),
          block_id: String(blockId).trim().toLowerCase(),
          question_id: qid,
          observation: value || ''
        }
        await fetch(`${BASE_URL}/audit/auditor-response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', idToken: await auth.currentUser.getIdToken() },
          body: JSON.stringify(body)
        })
      } catch { void 0 }
    })()
  }

 

 

 

  return (
    <div className="page-body" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      {isAuditorLocked && (
        <div style={{ background: '#fde68a', color: '#78350f', padding: '10px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13, fontWeight: 600 }}>
          READ-ONLY: AUDIT COMPLETED
        </div>
      )}
      
      {/* Top Header Area */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={onBack}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#64748b' }}
            >
              ←
            </button>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                {activeGroup?.label} - {activeSubdivision?.label} {blockId ? `(${blockId})` : ''}
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                Auditor Assessment Mode {orgName ? `| ${orgName}` : ''}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button title="Save Progress" onClick={handleSave} disabled={isAuditorLocked} style={{ padding: '8px 16px', borderRadius: '6px', background: isAuditorLocked ? '#cbd5e1' : '#3b82f6', color: 'white', border: 'none', cursor: isAuditorLocked ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600 }}>
               Save Progress
            </button>
          </div>
          
        </div>

        {/* Selection Area */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          
          {/* Category Selection */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
              Category
            </label>
            <select 
              value={selectedCategory}
              onChange={(e) => {
                const newCategory = e.target.value
                setLocalSelectedCategory(newCategory)
                const group = RECORD_GROUPS.find(g => g.id === newCategory)
                if (group?.subdivisions?.length > 0) {
                  setLocalSelectedSubcategory(group.subdivisions[0].id)
                } else {
                  setLocalSelectedSubcategory('')
                }
              }}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              disabled={!!groupId || isAuditorLocked}
            >
              <option value="">Select Category...</option>
              {RECORD_GROUPS.map(group => (
                <option key={group.id} value={group.id}>{group.label}</option>
              ))}
            </select>
          </div>

          {/* Subcategory Selection */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
              Subcategory
            </label>
            <select 
              value={selectedSubcategory}
              onChange={(e) => setLocalSelectedSubcategory(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              disabled={!selectedCategory || !!subdivisionId || isAuditorLocked}
            >
              <option value="">Select Subcategory...</option>
              {RECORD_GROUPS.find(g => g.id === selectedCategory)?.subdivisions.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.label}</option>
              ))}
            </select>
          </div>

           {/* Empty spacer or additional info */}
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
             Select Category & Subcategory to view Sections
           </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Left Sidebar - Sections */}
        <div style={{ width: '280px', flexShrink: 0, background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#475569', fontSize: '13px', textTransform: 'uppercase' }}>
            Sections
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(visibleSections.length > 0 ? visibleSections : fallbackSections).map(section => (
              <button
                key={section}
                onClick={() => setSelectedSection(section)}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: selectedSection === section ? '#eff6ff' : 'white',
                  border: 'none',
                  borderLeft: selectedSection === section ? '3px solid #3b82f6' : '3px solid transparent',
                  color: selectedSection === section ? '#1e293b' : '#64748b',
                  fontWeight: selectedSection === section ? 600 : 400,
                  fontSize: '14px',
                  cursor: isAuditorLocked ? 'not-allowed' : 'pointer',
                  borderBottom: '1px solid #f1f5f9'
                }}
                disabled={isAuditorLocked}
              >
                {section}
              </button>
            ))}
          </div>
        </div>

        {/* Right Content - Questions */}
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
            {effectiveSelectedSection}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {visibleQuestions.map((q) => {
  // 1. GENERATE THE STABLE KEY
  const qid = String(q.id).toLowerCase().trim();
  const key = getKey(qid);

  // 2. FIND OBSERVATION FALLBACK (Do this BEFORE using it)
  const obMatch = filteredObservations.find(x => 
    String(x.question_id || '').toLowerCase().trim() === qid
  ) || filteredObservations.find(x => 
    String(x.question_text || '').trim() === String(q.requirement || '').trim()
  );

  // 3. PRIORITY BINDING: State Map > Observation > Empty String
  // This ensures that if you've typed something, it shows; 
  // otherwise, it shows what's in the DB.
  const currentStatus = auditorStatusMap[key] || "";
  
  const currentComment = auditorCommentMap[key] || 
    (obMatch?.auditor_observation ? String(obMatch.auditor_observation) : "");

  const isInputOnly = isInputOnlyBlock(q.block);
  const customerValue = orgValueMap[key] || 'No input provided';

  // PROOF LOGS
  /* removed render debug logs */

 
  

  // ... rest of your JSX return
               return (
                 <div key={q.id} style={{ 
                   padding: '24px', 
                   border: '1px solid #e2e8f0', 
                   borderRadius: '8px', 
                   background: 'white',
                   boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                 }}>
                   <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                     <div style={{ 
                       marginTop: '4px',
                       width: '8px', 
                       height: '8px', 
                       background: isInputOnly ? '#64748b' : '#3b82f6', 
                       borderRadius: '50%',
                       flexShrink: 0
                     }} />
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b', lineHeight: '1.5' }}>
                          {q.requirement}
                        </div>
                        {q.clause && (
                          <div style={{ marginTop: '8px' }}>
                             <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                               Clause: {q.clause}
                             </span>
                          </div>
                        )}
                        {isInputOnly && (
                           <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                             <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                               Customer Input
                             </div>
                             <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>
                               {customerValue}
                             </div>
                          </div>
                        )}
                     </div>
                   </div>

                   {(!isInputOnly || allowAuditorComment(q.block)) && (
                   <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', paddingLeft: '20px', marginTop: '20px' }}>
                     {(!isInputOnly) && (
                       <div style={{ width: '200px', flexShrink: 0 }}>
                         <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#ef4444', marginBottom: '6px', textTransform: 'uppercase' }}>
                           Auditor Status *
                         </label>
                         
                         <select
                           value={currentStatus || ''}
                           onChange={(e) => handleStatusChange(q.id, e.target.value)}
                           style={{ 
                             width: '100%', 
                             padding: '10px', 
                             borderRadius: '6px', 
                             border: '1px solid #cbd5e1', 
                             background: 'white',
                             fontSize: '14px',
                             color: '#1e293b'
                           }}
                           disabled={isAuditorLocked}
                         >
                           <option value="">Select status...</option>
                           {STATUS_OPTIONS.map(opt => (
                             <option key={opt.value} value={opt.value}>{opt.label}</option>
                           ))}
                         </select>
                       </div>
                     )}

                     {!isInputOnly && (
                       <div style={{ width: '180px', flexShrink: 0 }}>
                         <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                           Customer Status
                         </label>
                         <div style={{ 
                           padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc',
                           fontSize: '14px', color: '#334155'
                         }}>
                          {(() => {
                            const qid2 = String(q.id).toLowerCase().trim()
                            const raw = String(orgStatusMap[getKey(qid2)] || '').toLowerCase()
                            return raw === 'in_place'
                              ? 'In place'
                              : raw === 'partial'
                              ? 'Partially in place'
                              : raw === 'not_in_place'
                              ? 'Not in place'
                              : raw === 'not_relevant'
                              ? 'Not relevant'
                              : '-'
                          })()}
                         </div>
                       </div>
                     )}

                     {/* Comment Input */}
                     <div style={{ flex: 1 }}>
                       <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
                         Auditor Findings / Comments
                       </label>
                       <textarea
                         value={currentComment || ''}
                         onChange={(e) => handleCommentChange(q.id, e.target.value)}
                         placeholder="Enter your observations here..."
                         style={{ 
                           width: '100%', 
                           padding: '10px', 
                           borderRadius: '6px', 
                           border: '1px solid #cbd5e1', 
                           background: 'white',
                           fontSize: '14px',
                           color: '#1e293b',
                           minHeight: '80px',
                           fontFamily: 'inherit'
                        }}
                        disabled={isAuditorLocked}
                       />
                     </div>
                   </div>
                   )}
                 </div>
               )
            })
            }
          </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', marginLeft: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                Observation Verification
              </div>
              <button
                onClick={handleVerificationTableSave}
                disabled={isAuditorLocked || verifying}
                style={{ padding: '8px 12px', background: '#3b82f6', color: '#fff', border: '1px solid #2563eb', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Save
              </button>
            </div>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', margin: 0, overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 1.2fr 0.8fr 1.2fr 4fr', gap: '16px', alignItems: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, padding: '8px 0', textAlign: 'left' }}>Question</div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, padding: '8px 0', textAlign: 'left' }}>Auditor Observation</div>
                {!isFirstSubcategory && (
                  <>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, padding: '8px 0', textAlign: 'left' }}>Closure Details</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, padding: '8px 0', textAlign: 'left' }}>Evidence</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, padding: '8px 0', textAlign: 'left' }}>Closure Status</div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, padding: '8px 0', textAlign: 'left' }}>Auditor Remark</div>
                  </>
                )}
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9' }} />
              <div>
                {visibleQuestions.map((q) => {
                    const found = observations.find(x => String(x.question_id) === String(q.id)) || {}
                    const currentStatus = found.auditor_closure_status || (found?.auditor && found.auditor.closure_status) || ''
                    const currentRemark = found.auditor_remark || (found?.auditor && found.auditor.remark) || ''
                    const ob = { question_id: String(q.id) }
                    return (
                      <div key={q.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 1.2fr 0.8fr 1.2fr 4fr', gap: '16px', alignItems: 'start', padding: '16px 0', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'keep-all', textAlign: 'left' }}>{q.requirement}</div>
                        <div style={{ fontSize: '13px', color: '#1f2937' }}>{found.auditor_observation || '-'}</div>
                        {!isFirstSubcategory ? (
                          <>
                            <div style={{ fontSize: '13px', color: '#1f2937' }}>{found.customer_closure || '-'}</div>
                            <div>
                              {(Array.isArray(found.customer_uploads) ? found.customer_uploads : []).length === 0 ? (
                                <span style={{ color: '#94a3b8' }}>No evidence</span>
                              ) : (
                                (found.customer_uploads || []).map((u, idx) => (
                                  <a key={idx} href={typeof u === 'string' ? u : (u?.url || '')} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginRight: 8, fontSize: 12, color: '#3b82f6' }}>
                                    View {idx + 1}
                                  </a>
                                ))
                              )}
                            </div>
                            <div>
                              <select
                                value={currentStatus}
                                onChange={(e) => handleVerify(ob, e.target.value, currentRemark)}
                                disabled={isAuditorLocked || verifying}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white' }}
                              >
                                <option value="">Select...</option>
                                {VERIFICATION_STATUSES.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <textarea
                                rows={2}
                                value={currentRemark}
                                onChange={(e) => {
                                  const next = e.target.value
                                  setObservations(prev => prev.map(x => (
                                    String(x.question_id) === String(q.id)
                                    ? { ...x, auditor_remark: next, auditor: { ...(x.auditor || {}), remark: next } }
                                    : x
                                  )))
                                }}
                                onBlur={(e) => handleVerify(ob, currentStatus || '', e.target.value)}
                                disabled={isAuditorLocked || verifying}
                                placeholder="Enter verification remark..."
                                style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px', padding: 8, background: 'white' }}
                              />
                            </div>
                          </>
                        ) : (
                          <div style={{ gridColumn: '2 / -1' }} />
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  )
}

export default AuditorAssessment
