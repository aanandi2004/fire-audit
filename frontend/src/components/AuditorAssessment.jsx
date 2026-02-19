import React, { useState } from 'react'
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'
import { auth } from '../firebase'
import { getAudit } from '../services/apiService'
import FinalizeAuditModal from './FinalizeAuditModal'
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
  
  const getKey = React.useCallback((qId) => {
    return String(qId || '').toLowerCase().trim()
  }, [])

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
  const keyProofRef = React.useRef({ hydration: null, render: null })
  
  const fallbackSections = ['Building details']
  try {
    console.log('RENDER CHECK:', { auditId, blockId, selectedSection, visibleSectionsCount: visibleSections.length })
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
        audit_id: String(auditId).trim().toLowerCase(),
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
      audit_id: String(auditId).trim().toLowerCase(),
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
  const [auditInfo, setAuditInfo] = useState({})
  const [showFinalize, setShowFinalize] = useState(false)
  async function finalizeAudit() {
    try {
      if (!auditId) return
      const user = auth.currentUser
      if (!user) throw new Error('No authenticated user')
      const token = await user.getIdToken(true)
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const resp = await fetch(`${BASE_URL}/audits/${encodeURIComponent(String(auditId).trim())}/complete`, {
        method: 'POST',
        headers: { idToken: token }
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        console.error('Finalize failed', resp.status, err)
        alert('Finalize failed. Check console.')
        return
      }
      alert('Audit finalized successfully.')
      try {
        const data = await getAudit(auditId)
        setAuditInfo(data || {})
      } catch { /* noop */ }
    } catch (e) {
      console.error('Finalize error', e)
      alert('Finalize error. Check console.')
    }
  }
  React.useEffect(() => {
    ;(async () => {
      try {
        if (!auditId) return
        const data = await getAudit(auditId)
        setAuditInfo(data || {})
      } catch { /* noop */ }
    })()
  }, [auditId])
  const isFirstSubcategory = React.useMemo(() => {
    try {
      const grp = RECORD_GROUPS.find(g => g.id === selectedCategory)
      const idx = grp?.subdivisions?.findIndex(s => s.id === selectedSubcategory)
      return (idx === 0)
    } catch { return false }
  }, [selectedCategory, selectedSubcategory])
  const isAuditorLocked = String(auditInfo?.status || '').toUpperCase() === 'COMPLETED'
  const statusToScore = (s) => {
    const v = String(s || '').toUpperCase()
    if (v === 'IN_PLACE') return 5
    if (v === 'PARTIAL') return 3
    if (v === 'NOT_IN_PLACE' || v === 'NOT_RELEVANT') return 0
    return null
  }
  const lockRef = React.useRef({ auditId: null, locked: false })
  const ensureRegistered = React.useCallback(async () => {
    try {
      const token = await auth.currentUser.getIdToken(true)
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const resp = await fetch(`${BASE_URL}/auth/session`, { headers: { idToken: token } })
      if (resp.ok) return
      const up = await fetch(`${BASE_URL}/users/self-upsert`, { method: 'POST', headers: { idToken: token } })
      if (!up.ok) {
        try { console.error('Self-upsert failed', up.status) } catch { /* noop */ }
      }
    } catch (e) {
      try { console.error('ensureRegistered error', e) } catch { /* noop */ }
    }
  }, [])
  const ensureAuditLock = React.useCallback(async () => {
    if (!auditId) return
    if (lockRef.current.auditId === auditId && lockRef.current.locked) return
    try {
      await ensureRegistered()
      const user = auth.currentUser
      if (!user) throw new Error('No authenticated user')
      const token = await user.getIdToken(true)
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const resp = await fetch(`${BASE_URL}/audits/${encodeURIComponent(String(auditId).trim())}/lock`, {
        method: 'POST',
        headers: { idToken: token }
      })
      if (resp.ok) {
        lockRef.current = { auditId, locked: true }
        try { console.log('Audit lock confirmed.') } catch { /* noop */ }
        return
      }
      if (resp.status === 409) {
        const auditResp = await fetch(`${BASE_URL}/audits/${encodeURIComponent(String(auditId).trim())}`, {
          method: 'GET',
          headers: { idToken: token }
        })
        if (auditResp.ok) {
          const data = await auditResp.json().catch(() => ({}))
          if (String(data.locked_by || '') === String(user.uid)) {
            lockRef.current = { auditId, locked: true }
            try { console.log('Audit already locked by this user; proceeding.') } catch { /* noop */ }
            return
          }
        }
        console.error('Audit locked by another user; cannot proceed.')
        throw new Error('Audit locked by another user')
      }
      {
        console.error('Failed to acquire lock:', resp.status)
        throw new Error('Could not lock audit')
      }
    } catch (err) {
      console.error('Lock error:', err)
      throw err
    }
  }, [auditId, ensureRegistered])
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
          s[key] = String(d.status || '').toLowerCase()
          v[key] = d.value || ''
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
          audit_id: String(auditId).trim().toLowerCase(),
          block_id: String(blockId).trim().toLowerCase()
        })
        const resp = await fetch(`${BASE_URL}/audit/responses?${params.toString()}`, { headers: { idToken: token }, signal: controller.signal })
        if (!resp.ok) return
        const rows = await resp.json().catch(() => [])
        const s = {}
        const c = {}
        ;(Array.isArray(rows) ? rows : []).forEach(d => {
          const bid = String(d.block_id || '').trim()
          if (bid && bid.toLowerCase() !== String(blockId).toLowerCase().trim()) return
          const rawId = d.question_id || ''
          const normalizedId = String(rawId).toLowerCase().trim()
          if (!normalizedId) return
          const key = getKey(normalizedId)
          const statusVal = String(d.status || d.auditor_status || '').toLowerCase().trim().replace(/\s+/g, '_')
          const obsVal = d.observation || d.auditor_observation || ''
          const sv = statusVal
          try {
            console.log('HYDRATION SAVING:', {
              originalId: rawId,
              generatedKey: key,
              status: sv
            })
          } catch { /* noop */ }
          if (sv && sv !== 'undefined' && sv !== 'null') s[key] = sv
          if (obsVal && obsVal !== 'undefined' && obsVal !== 'null') c[key] = obsVal
        })
        try {
          Object.keys(s).forEach(k => {
            console.log('AuditorSelect postHydration Key:', k, 'Status:', s[k])
          })
            console.log(`FETCHED FROM SUBCOLLECTION: ${Object.keys(s).length} items found for ${String(blockId).trim()}`)
          if (!keyProofRef.current.hydration && Object.keys(s).length > 0) {
            keyProofRef.current.hydration = Object.keys(s)[0]
            console.log('HYDRATION FIRST KEY:', keyProofRef.current.hydration)
          }
        } catch { /* noop */ }
        setAuditorStatusMap(prev => ({ ...prev, ...s }))
        if (Object.keys(c).length > 0) {
          try { console.log('AuditorCommentMap write: API responses', { count: Object.keys(c).length }) } catch { /* noop */ }
          setAuditorCommentMap(prev => ({ ...prev, ...c }))
        }
      } catch (e) {
        if (!(e && e.name === 'AbortError')) {
          console.error('Auditor responses fetch failed', e)
        }
      }
    })()
    return () => { try { controller.abort() } catch (e) { void e } }
  }, [auditId, blockId, getKey, setAuditorStatusMap, setAuditorCommentMap])
  // Removed Firestore snapshot subscription; hydration handled via backend fetch above
  React.useEffect(() => {
    try {
      if (!auditId || !blockId) return
      const expected = `audit_responses/${String(auditId).trim()}/blocks/${String(blockId).trim()}/questions`
      const actual = expected
      console.log('Expected Firestore Path', expected)
      console.log('Actual Subscribed Path', actual)
    } catch { /* noop */ }
  }, [auditId, blockId])
  const fetchingRef = React.useRef(false)
  const controllerRef = React.useRef(null)
  const debounceTimerRef = React.useRef(null)
  const currentKeyRef = React.useRef('')
  const fetchObservations = React.useCallback(async () => {
    if (!auditId || !blockId || !selectedSection) return
    const key = [String(auditId).trim(), String(blockId).trim(), String(selectedSection).trim()].join('|')
    if (fetchingRef.current && currentKeyRef.current === key) return
    console.count('FETCH_TRIGGERED')
    if (controllerRef.current) { try { controllerRef.current.abort() } catch (e) { void e } }
    fetchingRef.current = true
    currentKeyRef.current = key
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const token = await auth.currentUser.getIdToken()
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const params = new URLSearchParams({
        audit_id: String(auditId).trim().toLowerCase(),
        block_id: String(blockId).trim().toLowerCase(),
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

  const initialLogRef = React.useRef(false)
  React.useEffect(() => {
    if (!initialLogRef.current) {
      try {
        visibleQuestions.forEach((q) => {
          const obMatch =
            filteredObservations.find(x => String(x.question_id || '').trim() === String(q.id || '').trim()) ||
            filteredObservations.find(x => String(x.question_text || '').trim() === String(q.requirement || '').trim())
          const status = auditorStatusMap[getKey(q.id)] || String((obMatch && obMatch.auditor_status) || '').toLowerCase()
          console.log('AuditorSelect initial', String(q.id), status)
        })
      } catch (e) { void e }
      initialLogRef.current = true
    }
  }, [visibleQuestions, filteredObservations, auditorStatusMap, getKey])
  React.useEffect(() => {
    try {
      visibleQuestions.forEach((q) => {
        const qid = String(q.id || '').toLowerCase().trim()
        const key = getKey(qid)
        const obMatch =
          filteredObservations.find(x => String(x.question_id || '').toLowerCase().trim() === qid) ||
          filteredObservations.find(x => String(x.question_text || '').trim() === String(q.requirement || '').trim())
        const status = auditorStatusMap[key] || String((obMatch && obMatch.auditor_status) || '').toLowerCase().trim().replace(/\s+/g, '_')
        console.log('AuditorSelect postHydration Key:', key, 'Status:', status, 'Exists:', key in auditorStatusMap)
      })
    } catch (e) { void e }
  }, [auditorStatusMap, filteredObservations, visibleQuestions, getKey])

  async function handleVerify(ob, status, remark) {
    try {
      if (!auditId || !blockId) return
      setVerifying(true)
      const token = await auth.currentUser.getIdToken()
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const body = {
        audit_id: String(auditId),
        block_id: String(blockId),
        group: String(ob.group || selectedCategory || ''),
        subgroup: String(ob.subgroup || selectedSubcategory || ''),
        section: String(ob.section || effectiveSelectedSection || ''),
        question_id: String(ob.question_id),
        auditor_closure_status: status,
        auditor_remark: remark || ''
      }
      const resp = await fetch(`${BASE_URL}/audit/observations/auditor/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', idToken: token },
        body: JSON.stringify(body)
      })
      if (resp.ok) {
        const updated = observations.map(x => {
          if (x.question_id === ob.question_id) {
            return {
              ...x,
              auditor_closure_status: status,
              auditor_remark: remark,
              closure_status: status === 'CLOSED' ? 'CLOSED' : (x.closure_status || 'SUBMITTED')
            }
          }
          return x
        })
        setObservations(updated)
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
          Read-Only: Audit Locked
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
            <button title="Complete Audit" onClick={finalizeAudit} disabled={isAuditorLocked} style={{ padding: '8px 16px', borderRadius: '6px', background: isAuditorLocked ? '#cbd5e1' : '#ef4444', color: 'white', border: 'none', cursor: isAuditorLocked ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 700 }}>
               Complete Audit
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
              disabled={!!groupId}
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
              disabled={!selectedCategory || !!subdivisionId}
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
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9'
                }}
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
  if (!keyProofRef.current.render) {
    keyProofRef.current.render = key
    console.log('RENDER FIRST KEY:', keyProofRef.current.render)
    if (keyProofRef.current.hydration) {
      console.log('KEY MATCH CHECK:', {
        hydration: keyProofRef.current.hydration,
        render: keyProofRef.current.render,
        equal: keyProofRef.current.hydration === keyProofRef.current.render
      })
    }
  }
  // DEBUG LOG - Keep this to verify the "In Map" status
  console.log(`UI Key: "${key}" | In Map: ${key in auditorStatusMap} | Final Status: "${currentStatus}"`);
  if (qid === 'd-gen-86') {
    try { console.log('DEBUG RENDER:', { key, existsInMap: key in auditorStatusMap, mapValue: auditorStatusMap[key] }) } catch { /* noop */ }
  }

 
  {/* // 1. GENERATE THE STABLE KEY
              const qid = String(q.id).toLowerCase().trim();
              const key = getKey(qid);
              // Force the UI to look at the map from props first
              const status = auditorStatusMap[key] || "";
              const comment = auditorCommentMap[key] || "";

  // Only if the map is empty, try the obMatch fallback
              const finalStatus = status || (obMatch?.auditor_status?.toLowerCase().replace(/\s+/g, '_')) || "";
              console.log(`UI Key: "${key}" | In Map: ${key in auditorStatusMap} | Value:`, auditorStatusMap[key]);
  // 2. FIND OBSERVATION FALLBACK
              const obMatch =
              filteredObservations.find(x => String(x.question_id || '').toLowerCase().trim() === qid) ||
              filteredObservations.find(x => String(x.question_text || '').trim() === String(q.requirement || '').trim());

  // 3. PRIORITY BINDING: State Map > Observation > Empty
              const statusMapVal = auditorStatusMap[key] || ''
              const commentMapVal = auditorCommentMap[key] || ''
              const finalStatus = statusMapVal || (obMatch && obMatch.auditor_status ? String(obMatch.auditor_status).toLowerCase().trim().replace(/\s+/g, '_') : '')
              const finalComment = commentMapVal || (obMatch && obMatch.auditor_observation ? String(obMatch.auditor_observation) : '')

              const isInputOnly = isInputOnlyBlock(q.block);
              const customerValue = orgValueMap[key] || 'No input provided'; */}

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
                         {(() => {
                           const selectValue = currentStatus || ''
                           const optionValues = STATUS_OPTIONS.map(opt => opt.value)
                           const matches = optionValues.some(v => v === selectValue)
                           try {
                             console.log('AuditorSelect value prop', String(q.id), JSON.stringify(selectValue), (selectValue || '').length)
                             console.log('AuditorSelect option values', String(q.id), JSON.stringify(optionValues))
                             console.log('AuditorSelect exact match', String(q.id), matches)
                           } catch { /* noop */ }
                         })()}
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

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
              Observation Verification
            </div>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b' }}>Question</th>
                    <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b' }}>Auditor Observation</th>
                    {!isFirstSubcategory && (
                      <>
                        <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b' }}>Closure Details</th>
                        <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b' }}>Evidence</th>
                        <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b' }}>Closure Status</th>
                        <th style={{ textAlign: 'left', padding: '10px', fontSize: '12px', color: '#64748b' }}>Auditor Remark</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visibleQuestions.map((q) => {
                    const found = observations.find(x => String(x.question_id) === String(q.id) && (x.section || '') === (effectiveSelectedSection || '')) || {}
                    const frozen = (found.closure_status || '') === 'CLOSED'
                    const currentStatus = found.auditor_closure_status || ''
                    const currentRemark = found.auditor_remark || ''
                    const ob = {
                      id: found.id || String(getKey(q.id)),
                      question_id: String(q.id),
                      question_text: found.question_text || q.requirement,
                      group: found.group || selectedCategory || groupId || '',
                      subgroup: found.subgroup || selectedSubcategory || subdivisionId || '',
                      section: found.section || effectiveSelectedSection || '',
                      auditor_observation: found.auditor_observation || (auditorCommentMap[getKey(q.id)] || ''),
                      customer_closure: found.customer_closure || '',
                      customer_uploads: found.customer_uploads || [],
                      closure_status: found.closure_status || ''
                    }
                    return (
                      <tr key={ob.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', verticalAlign: 'top' }}>
                          <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>{ob.question_text}</div>
                        </td>
                        <td style={{ padding: '10px', verticalAlign: 'top' }}>
                          <div style={{ fontSize: '13px', color: '#1f2937' }}>{ob.auditor_observation || '-'}</div>
                        </td>
                        {!isFirstSubcategory && (
                          <>
                            <td style={{ padding: '10px', verticalAlign: 'top' }}>
                              <div style={{ fontSize: '13px', color: '#1f2937' }}>{ob.customer_closure || '-'}</div>
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'top' }}>
                              {(Array.isArray(ob.customer_uploads) ? ob.customer_uploads : []).length === 0 ? (
                                <span style={{ color: '#94a3b8' }}>No evidence</span>
                              ) : (
                                (ob.customer_uploads || []).map((u, idx) => (
                                  <a key={idx} href={u} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginRight: 8, fontSize: 12, color: '#3b82f6' }}>
                                    View {idx + 1}
                                  </a>
                                ))
                              )}
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'top', width: 180 }}>
                          <select
                                value={currentStatus}
                                onChange={(e) => handleVerify(ob, e.target.value, currentRemark)}
                            disabled={isAuditorLocked || frozen || verifying}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: frozen ? '#f1f5f9' : 'white' }}
                              >
                                <option value="">Select...</option>
                                {VERIFICATION_STATUSES.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '10px', verticalAlign: 'top' }}>
                          <textarea
                                defaultValue={currentRemark}
                                onBlur={(e) => handleVerify(ob, currentStatus || '', e.target.value)}
                            disabled={isAuditorLocked || frozen || verifying}
                                placeholder="Enter verification remark..."
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: frozen ? '#f1f5f9' : 'white', minHeight: 60 }}
                              />
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {showFinalize && (
        <FinalizeAuditModal
          auditId={auditId}
          onClose={() => setShowFinalize(false)}
          onCompleted={async () => {
            try {
              const data = await getAudit(auditId)
              setAuditInfo(data || {})
            } catch { /* noop */ }
          }}
        />
      )}
    </div>
  )
}

export default AuditorAssessment
