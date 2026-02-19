import React, { useState } from 'react'
// frontend-only: mocked persistence via localStorage
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'
import { auth } from '../firebase'

const normalizeBlock = (s) => (s || '').toLowerCase().trim()
const isInputOnlyBlock = (b) => {
  const x = normalizeBlock(b)
  return x === 'building details' || x === 'bulding details' || x === 'building materials' || x === 'type of construction'
}

function AdminUserManagement({ 
  auditors, 
  assignments,
  statusMap,
  commentMap,
  valueMap,
  setValueMap,
  auditorStatusMap,
  setAuditorStatusMap,
  auditorCommentMap,
  setAuditorCommentMap
}) {
  const [activeTab] = useState('auditors') // fixed to auditors
  const [showCreateAuditor, setShowCreateAuditor] = useState(false)
  const [viewAuditorId, setViewAuditorId] = useState(null)
  const isAdminLocked = String(((import.meta.env && import.meta.env.VITE_ADMIN_LOCK) || window.__ADMIN_LOCK__ || 'false')).toLowerCase() === 'true'
  
  // Edit State
  const [editState, setEditState] = useState({ id: null, field: null, value: '' })

  const startEdit = (id, field, currentValue) => {
    setEditState({ id, field, value: currentValue || '' })
  }

  const saveEdit = () => {
    const { id, field, value } = editState
    if (field === 'value') setValueMap(prev => ({ ...prev, [id]: value }))
    if (field === 'auditorStatus') setAuditorStatusMap(prev => ({ ...prev, [id]: value }))
    if (field === 'auditorComment') setAuditorCommentMap(prev => ({ ...prev, [id]: value }))
    setEditState({ id: null, field: null, value: '' })
  }

  const cancelEdit = () => {
    setEditState({ id: null, field: null, value: '' })
  }

  const [auditorForm, setAuditorForm] = useState({
    name: '',
    email: '',
    status: 'Active',
    password: ''
  })
  const [createdCredential, setCreatedCredential] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleDelete = () => {
    alert('User removed.')
  }

  const requestDeleteAuditor = (auditor) => {
    if (isAdminLocked) {
      alert('Admin UI is locked')
      return
    }
    if (!window.confirm('Are you sure you want to delete this auditor? This will remove the account from authentication and Firestore.')) return
    ;(async () => {
      try {
        const idToken = await auth.currentUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const res = await fetch(`${BASE_URL}/api/admin/users/${auditor.id}`, {
          method: 'DELETE',
          headers: { idToken }
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          alert(data?.detail || 'Failed to delete auditor')
          return
        }
        handleDelete(auditor.id)
        try { window.dispatchEvent(new Event('admin:auditors:refresh')) } catch { /* ignore */ }
      } catch {
        alert('Network error during deletion')
      }
    })()
  }

  // customer deletion handled via handleDelete when needed
  
  // disable/reset actions wired in table section below

  const handleCreateAuditor = (e) => {
    e.preventDefault()
    if (isAdminLocked) {
      alert('Admin UI is locked')
      return
    }
    
    const full = auditorForm.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '_')
    const password = (auditorForm.password && auditorForm.password.trim()) ? auditorForm.password.trim() : Math.random().toString(36).slice(-8)
    const rawEmail = (auditorForm.email || '').trim()
    const email = rawEmail ? (rawEmail.includes('@') ? rawEmail : `${rawEmail}@fireaudit.com`) : (full ? `aud_${full}@fireaudit.com` : '')
    
    ;(async () => {
      try {
        const idToken = await auth.currentUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const res = await fetch(`${BASE_URL}/api/admin/auditors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', idToken },
          body: JSON.stringify({
            name: auditorForm.name,
            email,
            password
          })
        })
        if (res.status === 409) {
          alert('Email already exists. Please use a different email.')
          return
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          alert(data?.detail || 'Failed to create auditor')
          return
        }
        await res.json()
        setCreatedCredential({ password, name: auditorForm.name })
        setShowCreateAuditor(false)
        setAuditorForm({ name: '', email: '', status: 'Active', password: '' })
        try { 
          window.dispatchEvent(new Event('admin:auditors:refresh')) 
          window.dispatchEvent(new Event('admin:users:refresh')) 
        } catch { /* ignore */ }
      } catch {
        alert('Network error during auditor creation')
      }
    })()
  }

 

  if (viewAuditorId) {
    const auditor = auditors.find(a => a.id === viewAuditorId)
    const assigned = Array.isArray(assignments) ? assignments.filter(a => a.auditor_id === viewAuditorId) : []
    // Calculate stats based on global map (simulating this auditor's work)
    const answers = Object.keys(auditorStatusMap || {}).length
    const completed = Object.values(auditorStatusMap || {}).filter(s => s === 'In Place').length
    const gaps = Object.values(auditorStatusMap || {}).filter(s => s === 'Not In Place').length

    return (
      <div className="page-body">
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <button onClick={() => setViewAuditorId(null)} className="btn btn-outline">← Back</button>
             <div>
               <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{auditor?.name} - Audit Work</h2>
               <div style={{ fontSize: '12px', color: '#64748b' }}>Generated on: {new Date().toLocaleDateString()}</div>
             </div>
          </div>
        </div>
        
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Assigned Work</h3>
          {assigned.length === 0 ? (
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
              No assignments found for this auditor.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '24px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Organization</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Block</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Group</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Subdivision</th>
                </tr>
              </thead>
              <tbody>
                {assigned.map(asg => (
                  <tr key={asg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>{asg.org_name || '-'}</td>
                    <td style={{ padding: '12px' }}>{asg.block_name || '-'}</td>
                    <td style={{ padding: '12px' }}>{asg.occupancy_group || '-'}</td>
                    <td style={{ padding: '12px' }}>{Array.isArray(asg.subdivision) ? asg.subdivision.join(', ') : (asg.subdivision || '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Total Audited</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{answers}</div>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
               <div style={{ fontSize: '12px', color: '#64748b' }}>Gaps Identified</div>
               <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{gaps}</div>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
               <div style={{ fontSize: '12px', color: '#64748b' }}>Closed / In Place</div>
               <div style={{ fontSize: '24px', fontWeight: 700, color: '#166534' }}>{completed}</div>
            </div>
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Detailed Audit Responses</h3>
          {answers === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
              No audit data recorded yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Group / Sub</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Question</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Customer Input</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Auditor Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Auditor Comment</th>
                </tr>
              </thead>
              <tbody>
                {RECORD_GROUPS.map(group => (
                  group.subdivisions.map(sub => {
                    const questions = getQuestions(group.id, sub.id)
                    // Filter questions that have an answer (either customer or auditor)
                    const relevantQuestions = questions.filter(q => 
                      (auditorStatusMap && auditorStatusMap[q.id]) || 
                      (statusMap && statusMap[q.id]) ||
                      (valueMap && valueMap[q.id])
                    )
                    
                    if (relevantQuestions.length === 0) return null

                    return relevantQuestions.map(q => {
                      const isInputOnly = isInputOnlyBlock(q.block)
                      const isEditingValue = editState.id === q.id && editState.field === 'value'
                      const isEditingAuditorStatus = editState.id === q.id && editState.field === 'auditorStatus'
                      const isEditingAuditorComment = editState.id === q.id && editState.field === 'auditorComment'

                      return (
                        <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                           <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: 500 }}>{group.title}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{sub.title}</div>
                           </td>
                           <td style={{ padding: '12px' }}>
                             <div style={{ marginBottom: '4px' }}>{q.requirement}</div>
                             {q.block && <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#64748b' }}>{q.block}</span>}
                           </td>
                           
                           {/* Customer Input Column */}
                           <td style={{ padding: '12px' }}>
                             {isInputOnly ? (
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 {isEditingValue ? (
                                   <>
                                     <input 
                                       value={editState.value} 
                                       onChange={e => setEditState({...editState, value: e.target.value})}
                                       style={{ padding: '4px', borderRadius: '4px', border: '1px solid #3b82f6', width: '100px' }}
                                     />
                                     <button onClick={saveEdit} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✅</button>
                                     <button onClick={cancelEdit} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>❌</button>
                                   </>
                                 ) : (
                                   <>
                                     <input 
                                       disabled 
                                       value={valueMap && valueMap[q.id] ? valueMap[q.id] : ''} 
                                       style={{ 
                                         padding: '4px', 
                                         borderRadius: '4px', 
                                         border: '1px solid #cbd5e1', 
                                         background: '#f1f5f9', 
                                         color: '#94a3b8',
                                         width: '100px',
                                         cursor: 'not-allowed'
                                       }} 
                                     />
                                     <button 
                                       onClick={() => startEdit(q.id, 'value', valueMap[q.id])} 
                                       style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}
                                       title="Edit Customer Value"
                                     >
                                       ✏️
                                     </button>
                                   </>
                                 )}
                               </div>
                             ) : (
                               <div>
                                 {statusMap && statusMap[q.id] && (
                                   <span style={{ 
                                      padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
                                      background: statusMap[q.id] === 'in_place' ? '#dcfce7' : '#fee2e2',
                                      color: statusMap[q.id] === 'in_place' ? '#166534' : '#991b1b',
                                      display: 'inline-block', marginBottom: '4px'
                                   }}>
                                     {statusMap[q.id] === 'in_place' ? 'In Place' : statusMap[q.id]}
                                   </span>
                                 )}
                                 {commentMap && commentMap[q.id] && (
                                   <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                                     "{commentMap[q.id]}"
                                   </div>
                                 )}
                                 {(!statusMap?.[q.id] && !commentMap?.[q.id]) && <span style={{ color: '#cbd5e1' }}>-</span>}
                               </div>
                             )}
                           </td>

                           {/* Auditor Status Column */}
                           <td style={{ padding: '12px' }}>
                              {isInputOnly ? (
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>N/A (User Input)</span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                   {isEditingAuditorStatus ? (
                                      <>
                                        <select 
                                          value={editState.value} 
                                          onChange={e => setEditState({...editState, value: e.target.value})}
                                          style={{ padding: '4px', borderRadius: '4px', border: '1px solid #3b82f6' }}
                                        >
                                          <option value="">Select...</option>
                                          <option value="In Place">In Place</option>
                                          <option value="Not In Place">Not In Place</option>
                                          <option value="Partially In Place">Partially In Place</option>
                                          <option value="Not Applicable">Not Applicable</option>
                                        </select>
                                        <button onClick={saveEdit} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✅</button>
                                        <button onClick={cancelEdit} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>❌</button>
                                      </>
                                   ) : (
                                      <>
                                        <span style={{ 
                                          padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
                                          background: auditorStatusMap[q.id] === 'In Place' ? '#dcfce7' : (auditorStatusMap[q.id] ? '#fee2e2' : '#f1f5f9'),
                                          color: auditorStatusMap[q.id] === 'In Place' ? '#166534' : (auditorStatusMap[q.id] ? '#991b1b' : '#64748b')
                                        }}>
                                          {auditorStatusMap[q.id] || '-'}
                                        </span>
                                        <button 
                                          onClick={() => startEdit(q.id, 'auditorStatus', auditorStatusMap[q.id])}
                                          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', marginLeft: 'auto' }}
                                        >
                                          ✏️
                                        </button>
                                      </>
                                   )}
                                </div>
                              )}
                           </td>

                           {/* Auditor Comment Column */}
                           <td style={{ padding: '12px', color: '#64748b' }}>
                              {isInputOnly ? (
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>-</span>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                   {isEditingAuditorComment ? (
                                      <>
                                        <input 
                                          value={editState.value} 
                                          onChange={e => setEditState({...editState, value: e.target.value})}
                                          style={{ padding: '4px', borderRadius: '4px', border: '1px solid #3b82f6', width: '100%' }}
                                        />
                                        <button onClick={saveEdit} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✅</button>
                                        <button onClick={cancelEdit} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>❌</button>
                                      </>
                                   ) : (
                                      <>
                                        <span style={{ fontStyle: 'italic', fontSize: '12px' }}>
                                          {auditorCommentMap && auditorCommentMap[q.id] ? auditorCommentMap[q.id] : '-'}
                                        </span>
                                        <button 
                                          onClick={() => startEdit(q.id, 'auditorComment', auditorCommentMap[q.id])}
                                          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', marginLeft: 'auto' }}
                                        >
                                          ✏️
                                        </button>
                                      </>
                                   )}
                                </div>
                              )}
                           </td>
                        </tr>
                      )
                    })
                  })
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>Auditor Management</h2>
        {activeTab === 'auditors' && (
          <button className="btn btn-primary" onClick={() => !isAdminLocked && setShowCreateAuditor(true)} disabled={isAdminLocked}>+ Create Auditor</button>
        )}
      </div>

      <div style={{ marginBottom: '16px' }} />

      {createdCredential && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <h4 style={{ color: '#047857', fontWeight: 700, marginBottom: '8px' }}>Auditor Created!</h4>
          <p style={{ fontSize: '14px', marginBottom: '4px' }}>Name: <strong>{createdCredential.name}</strong></p>
          <button onClick={() => setCreatedCredential(null)} style={{ marginTop: '12px', fontSize: '12px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#047857' }}>Dismiss</button>
        </div>
      )}

      {showCreateAuditor && activeTab === 'auditors' && (
        <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>New Auditor</h3>
          <form onSubmit={handleCreateAuditor} style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label className="field-label">Full Name</label>
              <input 
                className="field-input" 
                required 
                value={auditorForm.name} 
                onChange={e => {
                  const nameVal = e.target.value
                  setAuditorForm({ ...auditorForm, name: nameVal })
                }} 
              />
            </div>
            <div>
              <label className="field-label">Email / Employee Code</label>
              <input className="field-input" required value={auditorForm.email} onChange={e => setAuditorForm({...auditorForm, email: e.target.value})} disabled={isAdminLocked} />
            </div>
            <div>
              <label className="field-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  className="field-input" 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  value={auditorForm.password} 
                  onChange={e => setAuditorForm({ ...auditorForm, password: e.target.value })}
                  placeholder="Set initial password"
                  style={{ paddingRight: '40px' }}
                  disabled={isAdminLocked}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  style={{ position: 'absolute', right: 8, top: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '12px' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="field-input" value={auditorForm.status} onChange={e => setAuditorForm({...auditorForm, status: e.target.value})} disabled={isAdminLocked}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={isAdminLocked}>Create Auditor</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowCreateAuditor(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Role</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Email</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Organization</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Created On</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {auditors.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{u.name}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    fontSize: '12px', 
                    background: u.role === 'Customer' ? '#e0f2fe' : '#f3e8ff',
                    color: u.role === 'Customer' ? '#0369a1' : '#7e22ce'
                  }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>{u.organizationName || '-'}</td>
                <td style={{ padding: '12px 16px', color: '#64748b' }}>
                  {u.createdOn ? new Date(u.createdOn).toLocaleString() : '2024-01-20 10:00 AM'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {u.status === 'Inactive' ? (
                     <span style={{ color: '#ef4444' }}>Inactive</span>
                  ) : (
                     <span style={{ color: '#166534' }}>Active</span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => setViewAuditorId(u.id)}
                    >
                      View Data
                    </button>
                    <button 
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', fontSize: '12px', borderColor: '#ef4444', color: '#ef4444' }}
                      onClick={() => requestDeleteAuditor(u)}
                      disabled={isAdminLocked}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Organization table removed from User Management */}
    </div>
  )
}

export default AdminUserManagement
