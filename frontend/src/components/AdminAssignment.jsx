import React, { useState, useRef, useEffect } from 'react'
import { RECORD_GROUPS } from '../config/groups'
import { auth } from '../firebase'

function AdminAssignment({ orgs, auditors, assignments, setAssignments }) {
  const [formData, setFormData] = useState({
    orgId: '',
    groupId: '',
    subdivisionId: '',
    auditorId: '',
    blockId: '' // Added blockId
  })
  const isAdminLocked = String(((import.meta.env && import.meta.env.VITE_ADMIN_LOCK) || window.__ADMIN_LOCK__ || 'false')).toLowerCase() === 'true'
  const [lineItems, setLineItems] = useState([])
  const nextLineItemIdRef = useRef(1)
  const [loading, setLoading] = useState(false)
 
  const DRAFT_KEY = 'adminAssignmentDraft'
  const persistDraft = (next) => {
    const draft = {
      orgId: next.orgId || '',
      groupId: next.groupId || '',
      subdivisionId: next.subdivisionId || '',
      auditorId: next.auditorId || '',
      blockId: next.blockId || ''
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch { void 0 }
  }
  const updateForm = (patch) => {
    setFormData(prev => {
      const next = { ...prev, ...patch }
      persistDraft(next)
      return next
    })
  }
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        setFormData({
          orgId: d?.orgId || '',
          groupId: d?.groupId || '',
          subdivisionId: d?.subdivisionId || '',
          auditorId: d?.auditorId || '',
          blockId: d?.blockId || ''
        })
      }
    } catch { void 0 }
  }, [])
 
  const selectedGroup = RECORD_GROUPS.find(g => g.id === formData.groupId)
  const selectedOrg = orgs.find(o => o.id === formData.orgId)
  
  // Calculate stats for selected Org
  const orgAssignments = assignments.filter(a => a.org_name?.toLowerCase() === (selectedOrg?.name || '').toLowerCase())
  const uniqueAuditors = new Set(orgAssignments.map(a => a.auditor_name))
  const currentAuditorCount = uniqueAuditors.size
  
  // Generate block options based on selected org's block count
  const blockOptions = selectedOrg 
    ? [
        { id: '__ALL__', label: 'All' },
        ...Array.from({ length: selectedOrg.blockCount }, (_, i) => ({ 
          id: `Block ${i + 1}`, 
          label: (selectedOrg.blockNames && selectedOrg.blockNames[i]) 
            ? selectedOrg.blockNames[i] 
            : `Block ${i + 1}` 
        }))
      ]
    : [{ id: '__ALL__', label: 'All' }]

  const fetchAssignments = async () => {
    setLoading(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const res = await fetch(`${BASE_URL}/assignments`, {
        method: 'GET',
        headers: { idToken }
      })
      if (!res.ok) {
        await res.json().catch(() => ({}))
        setLoading(false)
        return
      }
      const list = await res.json()
      setAssignments(list)
    } catch {
      void 0
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isAdminLocked) {
      alert('Admin UI is locked')
      return
    }
    
    if (selectedOrg && selectedOrg.blockCount > 2) {
      const isNewAuditor = !uniqueAuditors.has(auditors.find(a => a.id === formData.auditorId)?.name)
      const projectedCount = isNewAuditor ? currentAuditorCount + 1 : currentAuditorCount
      
      if (projectedCount <= 2 && !isNewAuditor) {
        const confirmAssign = window.confirm(
          `Warning: This organization has ${selectedOrg.blockCount} blocks, but only ${currentAuditorCount} unique auditor(s) assigned so far.\n\nIt is recommended to have more than 2 auditors for organizations with more than 2 blocks.\n\nDo you want to proceed with assigning this existing auditor anyway?`
        )
        if (!confirmAssign) return
      }
    }

    const pairs = []
    if (formData.groupId && formData.subdivisionId) {
      pairs.push({ groupId: formData.groupId, subdivisionId: formData.subdivisionId, blockId: formData.blockId })
    }
    lineItems.forEach(li => {
      if (li.groupId && li.subdivisionId) {
        const bId = li.blockId || formData.blockId
        pairs.push({ groupId: li.groupId, subdivisionId: li.subdivisionId, blockId: bId })
      }
    })
    if (pairs.length === 0) {
      alert("Select at least one group and subdivision.")
      return
    }
    try {
      const idToken = await auth.currentUser.getIdToken()
      await Promise.all(pairs.map(async ({ groupId, subdivisionId, blockId }) => {
        const auditorObj = auditors.find(a => a.id === formData.auditorId)
        const blockIndex = (() => {
          if (blockId === '__ALL__') return 0
          const m = /^Block\s+(\d+)/.exec(blockId || '')
          return m ? parseInt(m[1], 10) : 0
        })()
        const blockName = (() => {
          if (!selectedOrg) return 'All'
          if (blockId === '__ALL__') return 'All'
          return (selectedOrg.blockNames && selectedOrg.blockNames[blockIndex - 1]) ? selectedOrg.blockNames[blockIndex - 1] : `Block ${blockIndex}`
        })()
        const payload = {
          org_id: selectedOrg.id,
          org_name: selectedOrg.name,
          block_id: blockId === '__ALL__' ? 'block_all' : `block_${blockIndex}`,
          block_name: blockName,
          occupancy_group: RECORD_GROUPS.find(g => g.id === groupId)?.label || groupId,
          subdivision: (RECORD_GROUPS.find(g => g.id === groupId)?.subdivisions.find(s => s.id === subdivisionId)?.label) || subdivisionId,
          auditor_id: auditorObj?.id || formData.auditorId,
          auditor_name: auditorObj?.name || ''
        }
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const res = await fetch(`${BASE_URL}/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', idToken },
          body: JSON.stringify(payload)
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.detail || 'Failed to create assignment')
        }
      }))
      await fetchAssignments()
      try { localStorage.removeItem(DRAFT_KEY) } catch { void 0 }
    } catch (err) {
      alert(err.message || 'Network error during assignment creation')
    }
    setFormData({ orgId: '', groupId: '', subdivisionId: '', auditorId: '', blockId: '' })
    setLineItems([])
  }

  const handleDelete = (id) => {
    if (isAdminLocked) {
      alert('Admin UI is locked')
      return
    }
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      ;(async () => {
        try {
          const idToken = await auth.currentUser.getIdToken()
          const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
          const res = await fetch(`${BASE_URL}/assignments/${id}`, {
            method: 'DELETE',
            headers: { idToken }
          })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            alert(data?.detail || 'Failed to delete assignment')
            return
          }
          await fetchAssignments()
        } catch {
          alert('Network error deleting assignment')
        }
      })()
    }
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { id: `li_${nextLineItemIdRef.current++}`, groupId: '', subdivisionId: '', blockId: '' }])
  }
  const updateLineItem = (id, patch) => {
    setLineItems(lineItems.map(li => li.id === id ? { ...li, ...patch } : li))
  }
  const removeLineItem = (id) => {
    setLineItems(lineItems.filter(li => li.id !== id))
  }

  return (
    <div className="page-body">
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: '#1e293b' }}>Auditor Assignments</h2>

      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Assign Audit</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label className="field-label">Organization</label>
            <select 
              className="field-input" 
              required 
              value={formData.orgId} 
              onChange={e => updateForm({ orgId: e.target.value, blockId: '' })}
              disabled={isAdminLocked}
            >
              <option value="">Select Organization...</option>
              {orgs.filter(o => o.status === 'Active').map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            {selectedOrg && selectedOrg.blockCount > 2 && (
               <div style={{ fontSize: '12px', marginTop: '4px', color: currentAuditorCount > 2 ? '#10b981' : '#f59e0b', fontWeight: 500 }}>
                 Blocks: {selectedOrg.blockCount} | Unique Auditors: {currentAuditorCount} {currentAuditorCount <= 2 ? '(Need > 2)' : '(OK)'}
               </div>
            )}
          </div>

          <div>
            <label className="field-label">Target Block</label>
            <select 
              className="field-input" 
              required 
              value={formData.blockId} 
              onChange={e => updateForm({ blockId: e.target.value })}
              disabled={!formData.orgId || isAdminLocked}
            >
              <option value="">Select Block...</option>
              {blockOptions.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Auditor</label>
            <select 
              className="field-input" 
              required 
              value={formData.auditorId} 
              onChange={e => updateForm({ auditorId: e.target.value })}
              disabled={isAdminLocked}
            >
              <option value="">Select Auditor...</option>
              {auditors.filter(a => a.status !== 'Inactive').map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.username})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Occupancy Group</label>
            <select 
              className="field-input" 
              required 
              value={formData.groupId} 
              onChange={e => updateForm({ groupId: e.target.value, subdivisionId: '' })}
              disabled={isAdminLocked}
            >
              <option value="">Select Group...</option>
              {RECORD_GROUPS.map(g => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Subdivision</label>
            <select 
              className="field-input" 
              required 
              value={formData.subdivisionId} 
              onChange={e => updateForm({ subdivisionId: e.target.value })}
              disabled={!formData.groupId || isAdminLocked}
            >
              <option value="">Select Subdivision...</option>
              {selectedGroup?.subdivisions.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Add More Occupancy Groups and Subdivisions</div>
              <button
                type="button"
                onClick={addLineItem}
                style={{ background: '#e2e8f0', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontWeight: 600 }}
                disabled={isAdminLocked}
                title="Add more"
              >
                +
              </button>
            </div>
            {lineItems.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', marginTop: '12px' }}>
                {lineItems.map(li => {
                  const g = RECORD_GROUPS.find(x => x.id === li.groupId)
                  return (
                    <React.Fragment key={li.id}>
                      <select
                        className="field-input"
                        value={li.groupId}
                        onChange={e => updateLineItem(li.id, { groupId: e.target.value, subdivisionId: '' })}
                        disabled={isAdminLocked}
                      >
                        <option value="">Select Group...</option>
                        {RECORD_GROUPS.map(x => (
                          <option key={x.id} value={x.id}>{x.label}</option>
                        ))}
                      </select>
                      <select
                        className="field-input"
                        value={li.subdivisionId}
                        onChange={e => updateLineItem(li.id, { subdivisionId: e.target.value })}
                        disabled={!li.groupId || isAdminLocked}
                      >
                        <option value="">Select Subdivision...</option>
                        {g?.subdivisions.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                      <select
                        className="field-input"
                        value={li.blockId || ''}
                        onChange={e => updateLineItem(li.id, { blockId: e.target.value })}
                        disabled={!formData.orgId || isAdminLocked}
                      >
                        <option value="">Select Block...</option>
                        {blockOptions.map(b => (
                          <option key={b.id} value={b.id}>{b.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeLineItem(li.id)}
                        style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#ef4444', fontWeight: 600 }}
                        title="Remove"
                        disabled={isAdminLocked}
                      >
                        Remove
                      </button>
                    </React.Fragment>
                  )
                })}
              </div>
            )}
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" disabled={isAdminLocked}>Assign Auditor</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Organization</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Block</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Occupancy Group</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Subdivision</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Assigned Auditor</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
            ) : assignments.length === 0 ? (
               <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No active assignments</td></tr>
            ) : (
              assignments.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{a.org_name || 'Unknown'}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{a.block_name || 'All'}</td>
                    <td style={{ padding: '12px 16px' }}>{a.occupancy_group}</td>
                    <td style={{ padding: '12px 16px' }}>{a.subdivision}</td>
                    <td style={{ padding: '12px 16px', color: '#8b5cf6', fontWeight: 500 }}>{a.auditor_name || 'Unknown'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDelete(a.id)}
                        style={{ 
                          background: '#fee2e2', 
                          border: 'none', 
                          borderRadius: '4px',
                          padding: '6px 12px',
                          cursor: 'pointer', 
                          color: '#ef4444', 
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                        title="Remove Assignment"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminAssignment
