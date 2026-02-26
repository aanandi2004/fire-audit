// import React, { useState } from 'react'
// import { RECORD_GROUPS } from '../config/groups'
// import { getQuestions } from '../config/questionBanks'
// import * as api from '../services/apiService';
// // frontend-only admin; mocked persistence

// const normalizeBlock = (s) => (s || '').toLowerCase().trim()
// const isInputOnlyBlock = (b) => {
//   const x = normalizeBlock(b)
//   return x === 'building details' || x === 'bulding details' || x === 'building materials' || x === 'type of construction'
// }

// function AdminOrgManagement({  
//   orgs, 
//   setOrgs, 
//   customers, 
//   setCustomers,
//   valueMap,
//   setValueMap,
// }) {
//   const [showCreate, setShowCreate] = useState(false)
//   const [viewOrgId, setViewOrgId] = useState(null) // For Detail View
//   const [editOrgId, setEditOrgId] = useState(null) // For Edit Mode
//   const [printMenuOpen, setPrintMenuOpen] = useState(null) // Org ID for which print menu is open
//   const [formData, setFormData] = useState({
//     name: '',
//     type: 'Group A – Residential',
//     subdivision: ['A-1'],
//     address: '',
//     contactPerson: '',
//     contactEmail: '',
//     blockCount: 1,
//     blockNames: ['Block 1'],
//     status: 'Active',
//     userUsername: '',
//     userPassword: '',
//     userEmail: '',
//     userRole: 'Customer'
//   })
//   const [userShowPassword, setUserShowPassword] = useState(false)

//   const deriveEmailFromUsername = (u) => {
//     const clean = String(u || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
//     return clean ? `${clean}@fireaudit.com` : ''
//   }
//   const [createdCredential, setCreatedCredential] = useState(null)
  
//   // Preview State
//   const [previewModalOpen, setPreviewModalOpen] = useState(false)
//   const [previewData, setPreviewData] = useState(null)
//   const [renderPDF, setRenderPDF] = useState(false)

//   React.useEffect(() => {
//     if (previewModalOpen && previewData) {
//       const timer = setTimeout(() => setRenderPDF(true), 500)
//       return () => clearTimeout(timer)
//     } else {
//       setRenderPDF(false)
//     }
//   }, [previewModalOpen, previewData])
  
//   const [adminResponses, setAdminResponses] = useState([])
//   const scoreToLabel = (score) => {
//     const s = Number(score)
//     if (Number.isNaN(s)) return null
//     if (s === 5) return 'In Place'
//     if (s === 3) return 'Partial'
//     if (s === 0) return 'Not In Place'
//     return null
//   }
//   // Deprecated frontend Firestore logic removed; backend API used instead
//   // 
//   // This is the clean, backend-only version
// React.useEffect(() => {
//   const fetchAuditData = async () => {
//     if (!viewOrgId) {
//       setAdminResponses([]);
//       return;
//     }

//     try {
//       // 1. Get the Audit ID from the backend
//       const auditId = await api.getLatestAuditId(viewOrgId);
      
//       if (!auditId) {
//         setAdminResponses([]);
//         return;
//       }

//       // 2. Get the responses using your existing apiService function
//       const items = await api.listAuditResponsesByAssignment(auditId);
//       setAdminResponses(Array.isArray(items) ? items : []);
//     } catch (err) {
//       console.error("Failed to hydrate admin view:", err);
//       setAdminResponses([]);
//     }
//   };
// })
// //   fetchAuditData();
// // }, [viewOrgId]);
// //         const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8001'
// //         const res = await fetch(`${BASE_URL}/audit/responses?assignment_id=${encodeURIComponent(auditId)}`, {
// //           method: 'GET',
// //           headers: { idToken }
// //         })
// //         if (!res.ok) {
// //           setAdminResponses([])
// //           return
// //         }
// //         const items = await res.json().catch(() => [])
// //         setAdminResponses(Array.isArray(items) ? items : [])
// //       } catch {
// //         setAdminResponses([])
// //       }
// //     })()
// //   }, [viewOrgId, orgs])
  
//   // Password modal not used in this phase

//   const [editingCell, setEditingCell] = useState(null)

//   const [activeTab, setActiveTab] = useState('organizations')

//   const formatDate = (d) => {
//     if (!d) return '-'
//     try {
//       if (typeof d === 'string') return d
//       if (typeof d === 'number') return new Date(d).toLocaleString()
//       if (d instanceof Date) return d.toLocaleString()
//       if (typeof d === 'object') {
//         if (typeof d.toDate === 'function') return d.toDate().toLocaleString()
//         if ('seconds' in d) return new Date(d.seconds * 1000).toLocaleString()
//       }
//     } catch { /* ignore */ }
//     return '-'
//   }

//   // no extra customer queries; rely on backend join

//   const handleSaveValue = (questionId, value) => {
//     const newValueMap = { ...valueMap, [questionId]: value }
//     setValueMap(newValueMap)
//     setEditingCell(null)
//   }

import React, { useState, useEffect } from 'react'
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'
import { auth } from '../firebase' // Keep for Auth only
import * as api from '../services/apiService'

const normalizeBlock = (s) => (s || '').toLowerCase().trim()
const isInputOnlyBlock = (b) => {
  const x = normalizeBlock(b)
  return x === 'building details' || x === 'bulding details' || x === 'building materials' || x === 'type of construction'
}

const deriveEmailFromUsername = (u) => {
  const clean = String(u || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return clean ? `${clean}@fireaudit.com` : ''
}

const formatDate = (d) => {
  if (!d) return '-'
  try {
    if (typeof d === 'string') return d
    if (typeof d === 'number') return new Date(d).toLocaleString()
    if (d instanceof Date) return d.toLocaleString()
    if (typeof d === 'object') {
      if ('seconds' in d) return new Date(d.seconds * 1000).toLocaleString()
    }
  } catch { /* ignore */ }
  return '-'
}

function AdminOrgManagement({  
  orgs, 
  setOrgs, 
  customers, 
  setCustomers,
  assignments,
  valueMap,
  setValueMap,
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [viewOrgId, setViewOrgId] = useState(null)
  const [editOrgId, setEditOrgId] = useState(null)
  const [printMenuOpen, setPrintMenuOpen] = useState(null)
  const [userShowPassword, setUserShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'Group A – Residential',
    subdivision: ['A-1'],
    address: '',
    contactPerson: '',
    contactEmail: '',
    blockCount: 1,
    blockNames: ['Block 1'],
    status: 'Active',
    userEmail: '',
    userPassword: ''
  })

  const [createdCredential, setCreatedCredential] = useState(null)
  const [adminResponses, setAdminResponses] = useState([])
  const [activeTab, setActiveTab] = useState('organizations')
  const [editingCell, setEditingCell] = useState(null)

  const scoreToLabel = (score) => {
    const s = Number(score)
    if (Number.isNaN(s)) return null
    if (s === 5) return 'In Place'
    if (s === 3) return 'Partial'
    if (s === 0) return 'Not In Place'
    return null
  }

  // FIXED: Pure Backend Hydration Effect
  useEffect(() => {
    const fetchAuditData = async () => {
      if (!viewOrgId) {
        setAdminResponses([])
        return
      }

      try {
        // 1. Get the Audit ID from the backend using the new api function
        const auditId = await api.getLatestAuditId(viewOrgId)
        
        if (!auditId) {
          setAdminResponses([])
          return
        }

        // 2. Get the responses using your existing apiService function
        const items = await api.listAuditResponsesByAssignment(auditId)
        setAdminResponses(Array.isArray(items) ? items : [])
      } catch (err) {
        console.error("Failed to hydrate admin view:", err)
        setAdminResponses([])
      }
    }

    fetchAuditData()
  }, [viewOrgId]) // Dependency on viewOrgId triggers refetch when opening an org

  const handleSaveValue = (questionId, value) => {
    const newValueMap = { ...valueMap, [questionId]: value }
    setValueMap(newValueMap)
    setEditingCell(null)
  }

  const handleDeleteOrg = async (orgId, orgName) => {
    if (window.confirm(`Delete organization "${orgName}"?`)) {
      try {
        const idToken = await auth.currentUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8011'
        const res = await fetch(`${BASE_URL}/api/organizations/${orgId}`, {
          method: 'DELETE',
          headers: { idToken }
        })
        if (res.ok) {
          setOrgs(orgs.filter(o => o.id !== orgId))
        }
      } catch {
        window.alert('Deletion failed')
      }
    }
  }

  // Simplified PDF Previews handled by previewSelfAssessment/previewInitialReport/previewFinalReport


  const openHtmlInNewWindow = React.useCallback((html) => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }, [])

  const previewSelfAssessment = React.useCallback((org) => {
    ;(async () => {
      try {
        const idToken = await auth.currentUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8011'
        const res = await fetch(`${BASE_URL}/api/pdf/self-assessment/html`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', idToken },
          body: JSON.stringify({ org_id: org.id })
        })
        if (!res.ok) return
        const html = await res.text()
        openHtmlInNewWindow(html)
      } catch { /* noop */ }
    })()
  }, [openHtmlInNewWindow])

  const previewInitialReport = React.useCallback((org) => {
    ;(async () => {
      try {
        const idToken = await auth.currentUser.getIdToken()
        const auditId = await api.getLatestAuditId(org.id)
        if (!auditId) {
          window.alert('Latest audit not found for organization')
          return
        }
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8011'
        const res = await fetch(`${BASE_URL}/reports/preview/initial/${auditId}`, {
          method: 'GET',
          headers: { idToken }
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          window.alert(data?.detail || 'Failed to render Initial Report preview')
          return
        }
        const html = await res.text()
        openHtmlInNewWindow(html)
      } catch {
        window.alert('Network error during Initial Report preview')
      }
    })()
  }, [openHtmlInNewWindow])

  const previewFinalReport = React.useCallback((org) => {
    ;(async () => {
      try {
        const idToken = await auth.currentUser.getIdToken()
        const auditId = await api.getLatestAuditId(org.id)
        if (!auditId) {
          window.alert('Latest audit not found for organization')
          return
        }
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8011'
        const res = await fetch(`${BASE_URL}/reports/preview/final/${auditId}`, {
          method: 'GET',
          headers: { idToken }
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          window.alert(data?.detail || 'Failed to render Final Report preview')
          return
        }
        const html = await res.text()
        openHtmlInNewWindow(html)
      } catch {
        window.alert('Network error during Final Report preview')
      }
    })()
  }, [openHtmlInNewWindow])


  // const handleDeleteOrg = (orgId, orgName) => {
  //   if (window.confirm(`Are you sure you want to delete organization "${orgName}"? This will also delete the associated customer account.`)) {
  //     ;(async () => {
  //       try {
  //         const idToken = await auth.currentUser.getIdToken()
  //         const res = await fetch(`http://localhost:8001/api/organizations/${orgId}`, {
  //           method: 'DELETE',
  //           headers: { idToken }
  //         })
  //         if (!res.ok) {
  //           const data = await res.json().catch(() => ({}))
  //           window.alert(data?.detail || 'Failed to delete organization')
  //           return
  //         }
  //         const org = orgs.find(o => o.id === orgId)
  //         if (org) {
  //           setOrgs(orgs.filter(o => o.id !== orgId))
  //           setCustomers(customers.filter(c => c.id !== org.customerId))
  //         }
  //       } catch {
  //         window.alert('Network error during deletion')
  //       }
  //     })()
  //   }
  // }

  // Passwords are never editable in Admin UI (frontend-only contract)

  // edit disabled in this phase

  const handleCreate = async (e) => {
    e.preventDefault()
    
    if (editOrgId) {
      // Update existing
      setOrgs(orgs.map(o => o.id === editOrgId ? { ...o, ...formData } : o))
      
      // Update linked customer's credentials to mirror organization name
      const org = orgs.find(o => o.id === editOrgId)
      if (org) {
        const newUsername = formData.name
        const newEmail = deriveEmailFromUsername(formData.name)
        setCustomers(customers.map(c => 
          c.orgId === editOrgId 
            ? { 
                ...c, 
                username: newUsername, 
                email: newEmail, 
                name: formData.name, 
                organizationName: formData.name 
              } 
            : c
        ))
      }
      
      setShowCreate(false)
      setEditOrgId(null)
      setFormData({ name: '', type: 'Group A – Residential', subdivision: ['A-1'], address: '', blockCount: 1, blockNames: ['Block 1'], status: 'Active', userPassword: '', userEmail: '', userRole: 'Customer' })
      return
    }
    
    if (!formData.userEmail?.trim() || !isValidPassword(formData.userPassword)) {
      window.alert('Please enter a valid email and password (8+ with upper+lower)')
      return
    }
    
    // Proceed with backend creation
    try {
      const idToken = await auth.currentUser.getIdToken()
      const selectedGroupLabel = formData.type
      const payload = {
        org_name: formData.name,
        org_type: selectedGroupLabel,
        subdivision: Array.isArray(formData.subdivision) ? formData.subdivision : (formData.subdivision ? [formData.subdivision] : []),
        address: formData.address || '',
        block_count: formData.blockCount || 1,
        block_names: Array.isArray(formData.blockNames) ? formData.blockNames : Array.from({ length: formData.blockCount || 1 }, (_, i) => `Block ${i + 1}`),
        status: formData.status || 'Active',
        user_email: formData.userEmail,
        user_password: formData.userPassword
      }
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const res = await fetch(`${BASE_URL}/api/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', idToken },
        body: JSON.stringify(payload)
      })
      if (res.status === 409) {
        window.alert('Email already in use. Please choose a different email.')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        window.alert(data?.detail || 'Failed to create organization')
        return
      }
      const created = await res.json().catch(() => ({}))
      const orgId = created?.org_id
      const newOrg = {
        id: orgId,
        name: formData.name,
        type: selectedGroupLabel,
        subdivision: Array.isArray(formData.subdivision) ? formData.subdivision : (formData.subdivision ? [formData.subdivision] : []),
        address: formData.address || '',
        blockCount: formData.blockCount || 1,
        blockNames: Array.isArray(formData.blockNames) ? formData.blockNames : Array.from({ length: formData.blockCount || 1 }, (_, i) => `Block ${i + 1}`),
        status: formData.status || 'Active',
        createdOn: new Date().toISOString()
      }
      setOrgs(prev => Array.isArray(prev) ? [...prev, newOrg] : [newOrg])
      setCreatedCredential({
        orgName: formData.name,
        email: formData.userEmail,
        role: 'CUSTOMER',
        password: formData.userPassword
      })
      setShowCreate(false)
      setFormData({ name: '', type: 'Group A – Residential', subdivision: ['A-1'], address: '', contactPerson: '', contactEmail: '', blockCount: 1, blockNames: ['Block 1'], status: 'Active', userUsername: '', userPassword: '', userEmail: '', userRole: 'Customer' })
      try { window.dispatchEvent(new Event('admin:orgs:refresh')) } catch { /* ignore */ }
    } catch {
      window.alert('Network error during creation')
    }
  }

  const isValidPassword = (p) => {
    if (!p || p.length < 8) return false
    if (!/[A-Z]/.test(p)) return false
    if (!/[a-z]/.test(p)) return false
    return true
  }

  // users section removed

  if (viewOrgId) {
    const org = orgs.find(o => o.id === viewOrgId)

    if (!org) {
        return (
            <div className="page-body">
                <div style={{ padding: '24px', textAlign: 'center' }}>
                    <h3>Organization Not Found</h3>
                    <button onClick={() => setViewOrgId(null)} className="btn btn-primary">Back to List</button>
                </div>
            </div>
        )
    }

    // Safe calculation for total questions
    const group = RECORD_GROUPS.find(g => g.label === org.type)
    const totalQuestions = group 
        ? group.subdivisions.reduce((acc, sub) => acc + getQuestions(group.id, sub.id).length, 0)
        : 0
    
    // Build local maps from backend responses
    const respMap = (() => {
      const m = {}
      for (const r of (adminResponses || [])) {
        m[String(r.question_id)] = r
      }
      return m
    })()

    return (
      <div className="page-body">
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <button onClick={() => setViewOrgId(null)} className="btn btn-outline">← Back</button>
             <div>
               <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{org?.name} - Audit Data</h2>
               <div style={{ fontSize: '12px', color: '#64748b' }}>Generated on: {new Date().toLocaleDateString()}</div>
             </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
             <button 
               className="btn btn-primary" 
               onClick={() => previewSelfAssessment(org)}
               title="Preview and Print Self Assessment Report"
             >
               Preview Self Assessment
             </button>
             <button 
               className="btn btn-outline" 
               onClick={() => previewInitialReport(org)}
             >
               Preview Initial Report
             </button>
             <button 
               className="btn btn-outline" 
               onClick={() => previewFinalReport(org)}
             >
               Preview Final Report
             </button>
          </div>
        </div>
        
        {/* Organization Details Section */}
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Organization Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Name</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{org.name}</div>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Type (Group)</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{org.type}</div>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Subdivision</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                      {Array.isArray(org.subdivision) ? org.subdivision.join(', ') : (org.subdivision || '—')}
                    </div>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Address</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>{org.address}</div>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Blocks</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                        {org.blockCount}
                        {org.blockNames && org.blockNames.length > 0 && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                {org.blockNames.map((name, i) => (
                                    <div key={i}>• {name}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Status</label>
                    <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        fontWeight: 600,
                        background: org.status === 'Active' ? '#dcfce7' : '#f1f5f9',
                        color: org.status === 'Active' ? '#166534' : '#64748b'
                    }}>
                        {org.status}
                    </span>
                </div>
            </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Gap Status</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>
                {Object.values(respMap).filter(r => scoreToLabel(r?.final_score) === 'Not In Place').length}
              </div>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
               <div style={{ fontSize: '12px', color: '#64748b' }}>In Place</div>
               <div style={{ fontSize: '24px', fontWeight: 700, color: '#166534' }}>
                 {Object.values(respMap).filter(r => scoreToLabel(r?.final_score) === 'In Place').length}
               </div>
            </div>
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
               <div style={{ fontSize: '12px', color: '#64748b' }}>Pending</div>
               <div style={{ fontSize: '24px', fontWeight: 700, color: '#eab308' }}>
                 {totalQuestions - Object.values(respMap).filter(r => scoreToLabel(r?.final_score)).length}
               </div>
            </div>
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Detailed Responses ({org.type})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Question</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Customer</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Auditor</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {RECORD_GROUPS.filter(g => g.label === org.type).flatMap(g => g.subdivisions.flatMap(s => getQuestions(g.id, s.id))).map(q => {
                const isInputOnly = isInputOnlyBlock(q.block)
                const custValue = valueMap && valueMap[q.id]
                const r = respMap[String(q.id)]
                const custStatus = scoreToLabel(r?.user_score)
                const audStatus = scoreToLabel(r?.final_score)
                
                return (
                <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px' }}>{q.requirement}</td>
                  <td style={{ padding: '12px' }}>
                    {isInputOnly ? (
                      editingCell && editingCell.id === q.id ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                                autoFocus
                                style={{ padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', width: '100%' }}
                                value={editingCell.value}
                                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveValue(q.id, editingCell.value)
                                    if (e.key === 'Escape') setEditingCell(null)
                                }}
                            />
                            <button onClick={() => handleSaveValue(q.id, editingCell.value)} style={{ color: '#166534', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✓</button>
                            <button onClick={() => setEditingCell(null)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                        </div>
                      ) : (
                        <div 
                            onClick={() => setEditingCell({ id: q.id, value: custValue || '' })}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '20px' }}
                            title="Click to edit"
                        >
                            <span style={{ color: '#0f172a', fontWeight: 500 }}>{custValue || '-'}</span>
                            <span style={{ fontSize: '12px', color: '#cbd5e1', marginLeft: '8px' }}>✎</span>
                        </div>
                      )
                    ) : (
                      <span style={{ 
                        padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
                        background: custStatus === 'In Place' ? '#dcfce7' : (custStatus ? '#fee2e2' : '#f1f5f9'),
                        color: custStatus === 'In Place' ? '#166534' : (custStatus ? '#991b1b' : '#64748b')
                      }}>
                        {custStatus || '-'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {isInputOnly ? (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Read-only</span>
                    ) : (
                      <span style={{ 
                        padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
                        background: audStatus === 'In Place' ? '#dcfce7' : (audStatus ? '#fee2e2' : '#f1f5f9'),
                        color: audStatus === 'In Place' ? '#166534' : (audStatus ? '#991b1b' : '#64748b')
                      }}>
                        {audStatus || '-'}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {isInputOnly ? (
                      <span style={{ color: '#94a3b8' }}>-</span>
                    ) : (
                      audStatus === 'In Place' ? 'Closed' : (audStatus ? 'Open Gap' : 'Pending')
                    )}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>Organization Management</h2>
      </div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
        <button 
          onClick={() => setActiveTab('organizations')}
          style={{ 
            padding: '10px 20px', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'organizations' ? '2px solid #3b82f6' : 'none',
            color: activeTab === 'organizations' ? '#3b82f6' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Organizations
        </button>
      </div>
      {activeTab === 'organizations' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Organization</button>
        </div>
      )}

 

      {createdCredential && (
        <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <h4 style={{ color: '#047857', fontWeight: 700, marginBottom: '8px' }}>Organization & Customer Created!</h4>
          <p style={{ fontSize: '14px', marginBottom: '4px' }}>Organization: <strong>{createdCredential.orgName}</strong></p>
          <p style={{ fontSize: '14px', marginBottom: '4px' }}>Email: <strong>{createdCredential.email}</strong></p>
          <p style={{ fontSize: '14px', marginBottom: '4px' }}>Role: <strong>{createdCredential.role}</strong></p>
          <p style={{ fontSize: '14px', marginBottom: '0' }}>Password: <strong>{createdCredential.password}</strong> <span style={{fontSize:'12px', color:'#6b7280'}}>(Copy this now, it won't be shown again)</span></p>
          <button onClick={() => setCreatedCredential(null)} style={{ marginTop: '12px', fontSize: '12px', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: '#047857' }}>Dismiss</button>
        </div>
      )}

      {activeTab === 'organizations' && showCreate && (
        <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>{editOrgId ? 'Edit Organization' : 'New Organization'}</h3>
          <form onSubmit={handleCreate} style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label className="field-label">Organization Name</label>
              <input 
                className="field-input" 
                required 
                value={formData.name} 
                onChange={e => {
                  const val = e.target.value
                  setFormData({ 
                    ...formData, 
                    name: val, 
                    userUsername: val,
                    userEmail: deriveEmailFromUsername(val)
                  })
                }} 
              />
            </div>
            <div>
              <label className="field-label">Type</label>
              <select className="field-input" value={formData.type} onChange={e => {
                const newType = e.target.value;
                const group = RECORD_GROUPS.find(g => g.label === newType);
                setFormData({
                  ...formData, 
                  type: newType,
                  subdivision: group && group.subdivisions.length > 0 ? [group.subdivisions[0].id] : []
                })
              }}>
                {RECORD_GROUPS.map(group => (
                  <option key={group.id} value={group.label}>{group.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Subcategory</label>
              <select 
                className="field-input" 
                value={Array.isArray(formData.subdivision) ? (formData.subdivision[0] || '') : (formData.subdivision || '')}
                onChange={e => {
                  const val = e.target.value
                  setFormData({ ...formData, subdivision: val ? [val] : [] })
                }}
              >
                {RECORD_GROUPS.find(g => g.label === formData.type)?.subdivisions.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.label}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="field-label">Address</label>
              <input className="field-input" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div>
              <label className="field-label">Contact Person</label>
              <input className="field-input" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
            </div>
            <div>
              <label className="field-label">Contact Email</label>
              <input className="field-input" type="email" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} />
            </div>
            <div>
              <label className="field-label">Blocks Count</label>
              <input 
                type="number" 
                min="1" 
                className="field-input" 
                required 
                value={formData.blockCount} 
                onChange={e => {
                  const count = parseInt(e.target.value) || 1
                  const currentNames = formData.blockNames || []
                  const newNames = [...currentNames]
                  
                  if (count > newNames.length) {
                    for (let i = newNames.length; i < count; i++) {
                      newNames.push(`Block ${i + 1}`)
                    }
                  } else if (count < newNames.length) {
                    newNames.splice(count)
                  }
                  
                  setFormData({...formData, blockCount: count, blockNames: newNames})
                }} 
              />
            </div>
            
            {/* Block Names Inputs */}
            {formData.blockNames && formData.blockNames.length > 0 && (
              <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
                <label className="field-label" style={{ marginBottom: '12px', display: 'block' }}>Block Names / Descriptions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {formData.blockNames.map((name, idx) => (
                    <div key={idx}>
                      <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', display: 'block' }}>Block {idx + 1}</label>
                      <input 
                        className="field-input" 
                        value={name} 
                        onChange={e => {
                          const newNames = [...formData.blockNames]
                          newNames[idx] = e.target.value
                          setFormData({...formData, blockNames: newNames})
                        }}
                        placeholder={`Name for Block ${idx + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="field-label">Status</label>
              <select className="field-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            
            {/* User Creation (frontend-only) */}
            <div>
              <label className="field-label">User Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  className="field-input" 
                  type={userShowPassword ? 'text' : 'password'} 
                  required 
                  value={formData.userPassword} 
                  onChange={e => setFormData({...formData, userPassword: e.target.value})} 
                  placeholder="Enter password" 
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setUserShowPassword(!userShowPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#64748b'
                  }}
                  aria-label="Toggle password visibility"
                >
                  {userShowPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {!(formData.userPassword.length >= 8 && /[A-Z]/.test(formData.userPassword) && /[a-z]/.test(formData.userPassword)) && (
                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                  Minimum 8 characters, include a capital and small letter
                </div>
              )}
            </div>
            <div>
              <label className="field-label">User Email</label>
              <input 
                className="field-input" 
                type="email" 
                required 
                value={formData.userEmail}
                readOnly
                placeholder="username@fireaudit.com" 
              />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary">{editOrgId ? 'Update Organization' : 'Create Organization'}</button>
              <button type="button" className="btn btn-outline" onClick={() => {
                setShowCreate(false)
                setEditOrgId(null)
                setFormData({ name: '', type: 'Group A – Residential', subdivision: ['A-1'], address: '', contactPerson: '', contactEmail: '', blockCount: 1, blockNames: ['Block 1'], status: 'Active', userUsername: '', userPassword: '', userEmail: '', userRole: 'Customer' })
              }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'organizations' && (
      <div className="card" style={{ padding: '0', overflow: 'visible' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Subcategory</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Customer Email</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Customer Role</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Blocks</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Created On</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(orgs) ? orgs : []).map(org => {
              const name = org.name || org.org_name || '-'
              const type = org.type || org.org_type || (org.model?.org_type) || '-'
              const subcats = Array.isArray(org.subdivision)
                ? org.subdivision.join(', ')
                : (Array.isArray(org.assigned_structure)
                    ? org.assigned_structure.map(s => s.category_id ? `${s.category_id}${Array.isArray(s.subcategories) && s.subcategories.length ? ` (${s.subcategories.join(', ')})` : ''}` : '').filter(Boolean).join(', ')
                    : (org.subdivision || '-'))
              const custEmail = org.customer_email
              const custRole = org.customer_role
              const blocks = org.blockCount || (org.model?.org_profile?.establishment?.total_blocks) || '-'
              const createdOn = org.createdOn || org.created_at || org.createdAt || org.model?.created_at || null
              const createdOnText = formatDate(createdOn)
              return (
                <tr key={org.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{name}</td>
                  <td style={{ padding: '12px 16px' }}>{type}</td>
                  <td style={{ padding: '12px 16px' }}>{subcats || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{custEmail}</td>
                  <td style={{ padding: '12px 16px' }}>{custRole}</td>
                  <td style={{ padding: '12px 16px' }}>{blocks}</td>
                  <td style={{ padding: '12px 16px' }}>{createdOnText}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => {
                        const scoped = (Array.isArray(assignments) ? assignments : []).filter(a => (a.org_id === org.id || a.orgId === org.id))
                        const auditId = scoped.length ? (scoped[0].audit_id || scoped[0].id) : null
                        const blocks = scoped.map(a => ({
                          id: a.block_id || a.blockId,
                          name: a.block_name || a.blockName || a.block_id || a.blockId,
                          auditId: a.audit_id || a.id || auditId
                        })).filter(b => b.id)
                        const orgName = org.name || org.org_name || '-'
                        const orgId = org.id
                        try { console.log('[AdminOrgManagement] Navigating with auditId:', auditId, 'blocks:', blocks) } catch { /* noop */ }
                        const state = { auditId, blocks, orgName, orgId }
                        try { window.history.pushState(state, '', '/admin/view') } catch { /* noop */ }
                        try { window.dispatchEvent(new CustomEvent('admin:viewdata', { detail: state })) } catch { /* noop */ }
                      }}
                    >
                      View Data
                    </button>
                    <button 
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', fontSize: '12px', borderColor: '#ef4444', color: '#ef4444' }}
                      onClick={() => handleDeleteOrg(org.id, name)}
                    >
                      Delete
                    </button>
                    <div style={{ position: 'relative' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => setPrintMenuOpen(printMenuOpen === org.id ? null : org.id)}
                      >
                        Print ▼
                      </button>
                      {printMenuOpen === org.id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          zIndex: 10,
                          minWidth: '160px',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <button 
                            style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                            onClick={() => {
                              previewSelfAssessment(org)
                              try {
                                const rawReports = localStorage.getItem('admin_reports')
                                const listReports = rawReports ? JSON.parse(rawReports) : []
                                const report = { id: `rep_${Date.now()}`, organisationId: org.id, type: 'SELF_ASSESSMENT', createdAt: new Date().toISOString() }
                                localStorage.setItem('admin_reports', JSON.stringify([...listReports, report]))
                              } catch { /* ignore */ }
                              setPrintMenuOpen(null)
                            }}
                          >
                            Self Assessment Report
                          </button>
                          <button 
                            style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                            onClick={() => {
                              previewInitialReport(org)
                              setPrintMenuOpen(null)
                            }}
                          >
                            Initial Report
                          </button>
                          <button 
                            style={{ padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                            onClick={() => {
                              previewFinalReport(org)
                              setPrintMenuOpen(null)
                            }}
                          >
                            Final Report
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      
    </div>
  )
}

export default AdminOrgManagement
