import React from 'react'
import { auth } from '../firebase'
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'
import { SECTION_FIELDS, ORG_FIELD_LABELS } from '../config/orgDetailsConfig'
// import * as api from '../services/apiService'

function AdminAuditDetailView({ initialState, onBack }) {
  const [loading, setLoading] = React.useState(true)
  const [fullAuditData, setFullAuditData] = React.useState({ building: {}, assessments: [], observations: [], orgRows: [], blocks: [], orgId: null, auditId: null, groupId: null, subdivisionId: null })
  const [activeBlock, setActiveBlock] = React.useState('')
  const [blockAuditMap, setBlockAuditMap] = React.useState({})
  const [blockMetaMap, setBlockMetaMap] = React.useState({})
  const [currentAuditId, setCurrentAuditId] = React.useState(null)
  const [auditStatus, setAuditStatus] = React.useState('ACTIVE')
  const PRIMARY_ORDER = ['bldg_name', 'bldg_address', 'bldg_phone', 'bldg_email', 'bldg_website']

  React.useEffect(() => {
    const state = initialState || (window.history && window.history.state) || null
    const auditId = state?.auditId
    const rawBlocks = Array.isArray(state?.blocks) ? state.blocks : []
    const blocks = rawBlocks.map(b => (typeof b === 'string' ? { id: b, name: b, auditId } : { id: b?.id || b?.name, name: b?.name || b?.id, auditId: b?.auditId || auditId })).filter(b => b.id)
    const orgName = state?.orgName || ''
    const orgId = state?.orgId || null
    try { console.log('[AdminAuditDetailView] state before fetch:', state) } catch { /* noop */ }
    if (!auditId) {
      try { window.history.pushState({}, '', '/admin') } catch { /* noop */ }
      try { onBack && onBack() } catch { /* noop */ }
      return
    }
    setFullAuditData(prev => ({ ...prev, blocks, orgName, orgId, auditId }))
    setActiveBlock(blocks && blocks.length ? String(blocks[0].id || '') : '')
    ;(async () => {
      try {
        const idToken = await auth.currentUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || (typeof window !== 'undefined' ? window.__BACKEND_URL__ : undefined) || 'http://localhost:8010'
        const asgRes = await fetch(`${BASE_URL}/assignments`, { headers: { idToken } })
        const asgList = await (asgRes.ok ? asgRes.json().catch(() => []) : Promise.resolve([]))
        const scoped = (Array.isArray(asgList) ? asgList : []).filter(a => String(a.org_id || a.orgId) === String(orgId))
        const map = {}
        const meta = {}
        for (const a of scoped) {
          const bid = String(a.block_id || a.blockId || '').trim()
          if (!bid) continue
          map[bid] = a.audit_id || a.id
          meta[bid] = { 
            auditId: a.audit_id || a.id, 
            group: a.group || null, 
            subdivision_id: a.subdivision_id || null,
            auditor_id: a.auditor_id || a.auditorId || null,
            auditor_name: a.auditor_name || a.auditor || a.auditor_email || null
          }
        }
        for (const b of blocks) {
          const bid = String(b.id)
          if (!map[bid]) {
            map[bid] = b.auditId || auditId
            meta[bid] = { auditId: b.auditId || auditId, group: null, subdivision_id: null, auditor_id: null, auditor_name: null }
          }
        }
        setBlockAuditMap(map)
        setBlockMetaMap(meta)
        const _initialBlockId = blocks && blocks.length ? String(blocks[0].id || '') : ''
        const initialAudit = (_initialBlockId && map[_initialBlockId]) || (blocks[0]?.auditId) || auditId
        setCurrentAuditId(initialAudit || null)
        try { console.log('[Switching Block] New Context:', { auditId: initialAudit || auditId, blockId: _initialBlockId }) } catch { /* noop */ }
      } catch {
        const initialAudit = blocks[0]?.auditId || auditId
        setCurrentAuditId(initialAudit || null)
      }
    })()
  }, [initialState, onBack])

  React.useEffect(() => {
    const blockId = activeBlock
    const auditId = currentAuditId
    try { console.log('[AdminAuditDetailView] fetching for block:', blockId, 'auditId:', auditId) } catch { /* noop */ }
    if (!blockId || !auditId) return
    let timeout = setTimeout(() => setLoading(true), 0)
    ;(async () => {
      try {
        const idToken = await auth.currentUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || (typeof window !== 'undefined' ? window.__BACKEND_URL__ : undefined) || 'http://localhost:8010'
        const assessUrl = `${BASE_URL}/audit/responses?${new URLSearchParams({ audit_id: String(auditId), block_id: String(blockId) }).toString()}`
        const buildingUrl = `${BASE_URL}/org-responses/building-details/list?${new URLSearchParams({ audit_id: String(auditId), block_id: String(blockId) }).toString()}`
        const obsUrl = `${BASE_URL}/audit/observations?${new URLSearchParams({ audit_id: String(auditId), block_id: String(blockId) }).toString()}`
        const orgUrl = `${BASE_URL}/org-responses/list?${new URLSearchParams({ audit_id: String(auditId), block_id: String(blockId) }).toString()}`
        const auditInfoUrl = `${BASE_URL}/audits/${encodeURIComponent(String(auditId || ''))}`
        const [assessRes, buildingRes, obsRes, orgRes, auditInfoRes] = await Promise.all([
          fetch(assessUrl, { headers: { idToken } }),
          fetch(buildingUrl, { headers: { idToken } }),
          fetch(obsUrl, { headers: { idToken } }),
          fetch(orgUrl, { headers: { idToken } }),
          fetch(auditInfoUrl, { headers: { idToken } })
        ])
        const assessments = await (assessRes.ok ? assessRes.json().catch(() => []) : Promise.resolve([]))
        const building = await (buildingRes.ok ? buildingRes.json().catch(() => ({ sections: [], fields: {} })) : Promise.resolve({ sections: [], fields: {} }))
        const observations = await (obsRes.ok ? obsRes.json().catch(() => []) : Promise.resolve([]))
        const orgRows = await (orgRes.ok ? orgRes.json().catch(() => []) : Promise.resolve([]))
        const info = await (auditInfoRes.ok ? auditInfoRes.json().catch(() => ({})) : Promise.resolve({}))
        const meta = blockMetaMap[blockId] || {}
        setFullAuditData(prev => ({ ...prev, assessments, building, observations, orgRows, auditId, groupId: meta.group || prev.groupId, subdivisionId: meta.subdivision_id || prev.subdivisionId }))
        setAuditStatus(String(info?.status || '').toUpperCase() || 'ACTIVE')
        try { console.log('Hydrating Block:', { auditId, blockId, data: { assessments, building, observations, orgRows } }) } catch { /* noop */ }
      } catch {
        setFullAuditData(prev => ({ ...prev, assessments: [], building: { sections: [], fields: {} }, observations: [], orgRows: [] }))
      } finally {
        try { clearTimeout(timeout) } catch { /* noop */ }
        setLoading(false)
      }
    })()
    return () => { try { clearTimeout(timeout) } catch { /* noop */ } }
  }, [activeBlock, currentAuditId, blockMetaMap])

  return (
    <div className="page-body">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-outline" onClick={onBack}>← Back</button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{fullAuditData.orgName || 'Organization'}</h2>
            <div style={{ fontSize: 12, color: '#64748b' }}>Admin View</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 12, color: '#64748b' }}>Status</label>
            <select
              value={auditStatus}
              onChange={async (e) => {
                const next = String(e.target.value || 'ACTIVE').toUpperCase()
                setAuditStatus(next)
                if (next === 'COMPLETED') {
                  try {
                    const idToken = await auth.currentUser.getIdToken()
                    const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || (typeof window !== 'undefined' ? window.__BACKEND_URL__ : undefined) || 'http://localhost:8010'
                    const resp = await fetch(`${BASE_URL}/api/admin/audits/complete`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', idToken },
                      body: JSON.stringify({ audit_id: currentAuditId })
                    })
                    if (!resp.ok) {
                      const data = await resp.json().catch(() => ({}))
                      alert(data?.detail || 'Failed to mark audit completed')
                      setAuditStatus('ACTIVE')
                      return
                    }
                    const data = await resp.json().catch(() => ({}))
                    console.log('[AdminAuditDetailView] Audit marked completed', data)
                    try {
                      window.__AUDIT_LOCK__ = true
                      window.dispatchEvent(new CustomEvent('audit:status', { detail: { auditId: currentAuditId, status: 'COMPLETED' } }))
                    } catch { /* noop */ }
                  } catch {
                    alert('Network error while completing audit')
                    setAuditStatus('ACTIVE')
                  }
                } else {
                  try {
                    window.__AUDIT_LOCK__ = false
                    window.dispatchEvent(new CustomEvent('audit:status', { detail: { auditId: currentAuditId, status: next } }))
                  } catch { /* noop */ }
                }
              }}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: 'white', fontSize: 12 }}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REOPEN">REOPEN</option>
            </select>
          </div>
          <button className="btn btn-outline" onClick={() => {
            ;(async () => {
              const idToken = await auth.currentUser.getIdToken()
              const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || (typeof window !== 'undefined' ? window.__BACKEND_URL__ : undefined) || 'http://localhost:8010'
              const currentAuditId = (fullAuditData.blocks || []).find(b => String(b.id) === String(activeBlock))?.auditId || fullAuditData.auditId
              const orgId = fullAuditData.orgId
              if (!currentAuditId) {
                alert('Data not fully loaded')
                return
              }
              console.log('[PDF] Fetching from unified backend hydration service.... Audit ID:', currentAuditId)
              try {
                const res1 = await fetch(`${BASE_URL}/api/pdf/self-assessment`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', idToken },
                  body: JSON.stringify({ org_id: orgId, audit_id: currentAuditId })
                })
                if (res1.ok) {
                  const blob = await res1.blob()
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `Self_Assessment_${currentAuditId}.pdf`
                  a.click()
                  return
                } else {
                  throw new Error('sa2 preview failed')
                }
              } catch {
                const data = { detail: 'Failed to generate PDF' }
                alert(data.detail)
              }
            })()
          }} style={{ background: '#dbeafe', borderColor: '#93c5fd' }}>Self Assessment</button>
          <button className="btn btn-outline" onClick={() => {
            ;(async () => {
              try {
                const idToken = await auth.currentUser.getIdToken()
                const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || (typeof window !== 'undefined' ? window.__BACKEND_URL__ : undefined) || 'http://localhost:8010'
                const currentAuditId = (fullAuditData.blocks || []).find(b => String(b.id) === String(activeBlock))?.auditId || fullAuditData.auditId
                const activeBlockId = String(activeBlock || '')
                if (!currentAuditId || !activeBlockId) {
                  alert('Data not fully loaded')
                  return
                }
                const res = await fetch(`${BASE_URL}/reports/preview/initial/${currentAuditId}`, {
                  method: 'GET',
                  headers: { idToken }
                })
                if (!res.ok) return
                const html = await res.text()
                const blob = new Blob([html], { type: 'text/html' })
                const url = URL.createObjectURL(blob)
                window.open(url, '_blank')
              } catch { /* noop */ }
            })()
          }} style={{ background: '#dcfce7', borderColor: '#86efac' }}>Initial Report</button>
          <button className="btn btn-outline" onClick={() => {
            ;(async () => {
              try {
                const idToken = await auth.currentUser.getIdToken()
                const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || (typeof window !== 'undefined' ? window.__BACKEND_URL__ : undefined) || 'http://localhost:8010'
                const currentAuditId = (fullAuditData.blocks || []).find(b => String(b.id) === String(activeBlock))?.auditId || fullAuditData.auditId
                const activeBlockId = String(activeBlock || '')
                if (!currentAuditId || !activeBlockId) {
                  alert('Data not fully loaded')
                  return
                }
                const res = await fetch(`${BASE_URL}/reports/preview/final/${currentAuditId}`, {
                  method: 'GET',
                  headers: { idToken }
                })
                if (!res.ok) return
                const html = await res.text()
                const blob = new Blob([html], { type: 'text/html' })
                const url = URL.createObjectURL(blob)
                window.open(url, '_blank')
              } catch { /* noop */ }
            })()
          }} style={{ background: '#dbeafe', borderColor: '#93c5fd' }}>Final Report</button>
        </div>
      </div>
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div className="spinner" />
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Loading data...</div>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Organization Overview</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>Total Blocks</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{(Array.isArray(fullAuditData.blocks) ? fullAuditData.blocks.length : 0)}</div>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: 8, textAlign: 'left' }}>Block</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Category</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Subcategory</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Assigned Auditor</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(fullAuditData.blocks) ? fullAuditData.blocks : []).map((b) => {
                  const meta = blockMetaMap[String(b.id)] || {}
                  const g = RECORD_GROUPS.find(x => x.id === meta.group)
                  const gTitle = g?.title || meta.group || '-'
                  const sTitle = (g?.subdivisions || []).find(s => s.id === meta.subdivision_id)?.title || meta.subdivision_id || '-'
                  const auditorText = meta.auditor_name || meta.auditor_id || '-'
                  return (
                    <tr key={String(b.id)} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 8 }}>{String(b.name || b.id)}</td>
                      <td style={{ padding: 8 }}>{gTitle}</td>
                      <td style={{ padding: 8 }}>{sTitle}</td>
                      <td style={{ padding: 8 }}>{auditorText}</td>
                    </tr>
                  )
                })}
                {(!Array.isArray(fullAuditData.blocks) || fullAuditData.blocks.length === 0) && (
                  <tr>
                    <td style={{ padding: 8, color: '#64748b' }} colSpan={4}>No blocks assigned</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(Array.isArray(fullAuditData.blocks) ? fullAuditData.blocks : []).map(b => {
                const active = String(b.id) === String(activeBlock)
                return (
                  <button
                    key={String(b.id)}
                    className="btn btn-outline"
                    onClick={() => {
                      const bid = String(b.id)
                      const aid = blockAuditMap[bid] || b.auditId || fullAuditData.auditId
                      console.log('[Switching Block] New Context:', { auditId: aid, blockId: bid })
                      setFullAuditData(prev => ({ ...prev, assessments: [], building: { sections: [], fields: {} }, observations: [] }))
                      setActiveBlock(bid)
                      setCurrentAuditId(aid)
                    }}
                    style={{ background: active ? '#dbeafe' : 'white', borderColor: active ? '#93c5fd' : '#cbd5e1', color: active ? '#1e3a8a' : '#0f172a' }}
                  >
                    {String(b.name)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>Building Details</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {[...PRIMARY_ORDER, ...Object.keys(fullAuditData.building?.fields || {}).filter(k => !PRIMARY_ORDER.includes(k))].map(k => {
                const val = (fullAuditData.building?.fields || {})[k]
                if (val === undefined || val === null || String(val).trim() === '') return null
                return (
                  <div key={k} style={{ width: 'calc(50% - 6px)', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#ffffff' }}>
                    <div style={{ flex: '0 0 48%', fontWeight: 600, color: '#334155' }}>{ORG_FIELD_LABELS[k] || String(k).replace(/_/g, ' ')}</div>
                    <div style={{ flex: '1 1 auto', color: '#0f172a' }}>{String(val)}</div>
                  </div>
                )
              })}
              {Object.keys(fullAuditData.building?.fields || {}).length === 0 && (
                <div style={{ width: '100%', padding: 8, color: '#64748b' }}>No building details for this block</div>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Assessment (Read-only)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: 8, textAlign: 'left' }}>Requirement</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Customer Value</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Auditor Status</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Auditor Comment</th>
                </tr>
              </thead>
              <tbody>
                {(getQuestions(fullAuditData.groupId, fullAuditData.subdivisionId) || []).map((q) => {
                  const qid = String(q.id || q.question_id || '').toUpperCase()
                  const a = (Array.isArray(fullAuditData.assessments) ? fullAuditData.assessments : []).find(x => String(x.question_id || '').toUpperCase() === qid) || {}
                  const customerValue = ((a.org || {}).value || (a.org || {}).status || (a.org || {}).remark || (a.org || {}).closure_details || a.customer_input || a.customer_closure || '')
                  const auditorStatus = a.auditor_status || ((a.auditor || {}).status) || ''
                  const auditorComment = a.auditor_comment || ((a.auditor || {}).comment) || ''
                  const statusUpper = String(auditorStatus || '').toUpperCase()
                  const chipColor = statusUpper === 'IN_PLACE' ? '#10b981' : statusUpper === 'NOT_IN_PLACE' ? '#ef4444' : statusUpper === 'PARTIAL' ? '#f59e0b' : statusUpper === 'NOT_RELEVANT' ? '#6b7280' : '#94a3b8'
                  return (
                    <tr key={qid} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 8 }}>{q.requirement || q.text || qid}</td>
                      <td style={{ padding: 8 }}>{customerValue || '-'}</td>
                      <td style={{ padding: 8 }}>
                        <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 999, background: chipColor, color: 'white' }}>
                          {auditorStatus || '-'}
                        </span>
                      </td>
                      <td style={{ padding: 8 }}>{auditorComment || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: 16, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Observation Verification</h3>
            </div>
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', overflowX: 'auto' }}>
              {(() => {
                const group = RECORD_GROUPS.find(g => g.id === fullAuditData.groupId)
                const subIdx = group?.subdivisions?.findIndex(s => s.id === fullAuditData.subdivisionId)
                const isFirstSubcategory = (subIdx === 0)
                const questions = getQuestions(fullAuditData.groupId, fullAuditData.subdivisionId) || []
                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 1.2fr 0.8fr 1.2fr 4fr', gap: 16, alignItems: 'center', padding: '12px 0' }}>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textAlign: 'left' }}>Question</div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textAlign: 'left' }}>Auditor Observation</div>
                      {!isFirstSubcategory && (
                        <>
                          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textAlign: 'left' }}>Closure Details</div>
                          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textAlign: 'left' }}>Evidence</div>
                          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textAlign: 'left' }}>Closure Status</div>
                          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textAlign: 'left' }}>Auditor Remark</div>
                        </>
                      )}
                    </div>
                    <div style={{ borderTop: '1px solid #f1f5f9' }} />
                    <div>
                      {questions.map((q) => {
                        const qid = String(q.id || '').toUpperCase()
                        const found = (Array.isArray(fullAuditData.observations) ? fullAuditData.observations : []).find(x => String(x.question_id || '').toUpperCase() === qid) || {}
                        const foundAssess = (Array.isArray(fullAuditData.assessments) ? fullAuditData.assessments : []).find(x => String(x.question_id || '').toUpperCase() === qid) || {}
                        const orgRow = (Array.isArray(fullAuditData.orgRows) ? fullAuditData.orgRows : []).find(x => String(x.question_id || '').toUpperCase() === qid) || {}
                        const aObs = found.auditor_observation || foundAssess.auditor_observation || (foundAssess.auditor && foundAssess.auditor.observation) || ''
                        const closure = found.customer_closure || (orgRow.org && orgRow.org.closure_details) || ''
                        const uploads = found.customer_uploads || (orgRow.org && (orgRow.org.evidence || orgRow.org.uploads)) || []
                        const closureStatus = found.auditor_closure_status || (found.auditor && found.auditor.closure_status) || (found.closure_status || '')
                        const aRemark = found.auditor_remark || foundAssess.auditor_comment || (foundAssess.auditor && foundAssess.auditor.comment) || ''
                        return (
                          <div key={qid} style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 1.2fr 0.8fr 1.2fr 4fr', gap: 16, alignItems: 'start', padding: '16px 0', borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'keep-all', textAlign: 'left' }}>{q.requirement || q.text || qid}</div>
                            <div style={{ fontSize: 13, color: '#1f2937' }}>{aObs || '-'}</div>
                            {!isFirstSubcategory ? (
                              <>
                                <div style={{ fontSize: 13, color: '#1f2937' }}>{closure || '-'}</div>
                                <div>
                                  {(Array.isArray(uploads) ? uploads : []).length === 0 ? (
                                    <span style={{ color: '#94a3b8' }}>No evidence</span>
                                  ) : (
                                    (uploads || []).map((u, idx) => (
                                      <a key={idx} href={typeof u === 'string' ? u : (u?.url || '')} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginRight: 8, fontSize: 12, color: '#3b82f6' }}>
                                        View {idx + 1}
                                      </a>
                                    ))
                                  )}
                                </div>
                                <div style={{ fontSize: 13, color: '#1f2937' }}>{closureStatus || '-'}</div>
                                <div style={{ fontSize: 13, color: '#1f2937' }}>{aRemark || '-'}</div>
                              </>
                            ) : (
                              <div style={{ gridColumn: '2 / -1' }} />
                            )}
                          </div>
                        )
                      })}
                      {(!(Array.isArray(fullAuditData.observations) && fullAuditData.observations.length)) && (
                        <div style={{ padding: 8, color: '#64748b' }}>No observations for this block</div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminAuditDetailView
