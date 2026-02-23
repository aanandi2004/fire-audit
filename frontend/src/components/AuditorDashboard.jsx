import React from 'react'
import { RECORD_GROUPS } from '../config/groups'

function AuditorDashboard({ user, assignments, onStartAudit, orgs }) {
  // Filter assignments for the current auditor
  const myAssignments = assignments ? assignments.filter(a => (a.auditorId || a.auditor_id) === user?.id) : []

  const completedAssignments = myAssignments.filter(a => String(a.status || '').toUpperCase() === 'COMPLETED')
  const completedOrgIds = Array.from(new Set(completedAssignments.map(a => a.org_id || a.orgId).filter(Boolean)))
  const completedCount = completedOrgIds.length
  const completedOrgs = completedOrgIds.map(id => {
    const o = Array.isArray(orgs) ? orgs.find(x => x.id === id) : null
    return { id, name: o?.name || id }
  })
  const [showCompletedList, setShowCompletedList] = React.useState(false)

  // Map assignments to tasks
  const assignedTasks = myAssignments.map(a => {
    const groupId = a.group || a.groupId
    const subdivisionId = a.subdivision_id || a.subdivisionId
    const subId = (groupId === 'C' && subdivisionId === 'C-1') ? 'C-2' : subdivisionId
    const group = RECORD_GROUPS.find(g => g.id === groupId)
    const subdivision = group?.subdivisions.find(s => s.id === subId)
    const orgId = a.org_id || a.orgId
    const org = orgs ? orgs.find(o => o.id === orgId) : null

    return {
      groupId,
      subId,
      groupLabel: group?.label || groupId,
      subLabel: subdivision?.label || subId,
      orgId, // Keep track of org
      orgName: a.org_name || (org ? org.name : 'Unknown Org'),
      blockId: a.blockId || a.block_id, // Added blockId
      status: 'Active'
    }
  })

  return (
    <div className="page-body">
      <div className="card">
        <div style={{ padding: '24px 24px 0 24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>Auditor Dashboard</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            View and manage your assigned audit categories.
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setShowCompletedList(prev => !prev)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid #dbeafe', background: '#eff6ff', color: '#1e40af' }}
              title="Completed Organizations"
            >
              <span style={{ fontSize: 12, fontWeight: 700 }}>Completed Organizations</span>
              <span style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: 999, padding: '2px 8px', fontSize: 12, color: '#0f172a' }}>{completedCount}</span>
            </button>
          </div>
          {showCompletedList && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              {completedOrgs.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: 13 }}>No completed organizations</div>
              ) : (
                <div>
                  {completedOrgs.map(o => (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                      <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{o.name}</div>
                      <button type="button" className="btn btn-outline" title="View Archive">View Archive</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="table-container" style={{ padding: '0 24px 24px 24px' }}>
          {assignedTasks.length === 0 ? (
             <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
               No audits assigned to you yet.
             </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '13px', paddingBottom: '12px' }}>ORGANIZATION NAME</th>
                  <th style={{ textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '13px', paddingBottom: '12px' }}>BLOCK</th>
                  <th style={{ textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '13px', paddingBottom: '12px' }}>CATEGORY / SUBDIVISION</th>
                  <th style={{ textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '13px', paddingBottom: '12px' }}>AUDIT TYPE</th>
                  <th style={{ textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '13px', paddingBottom: '12px' }}>STATUS</th>
                  <th style={{ textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '13px', paddingBottom: '12px', width: '80px' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {assignedTasks.map((task, index) => (
                  <tr key={`${task.groupId}-${task.subId}-${index}`} style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '16px', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px', border: '1px solid #e2e8f0', borderRight: 'none', fontWeight: 600, color: '#1e293b' }}>
                      {task.orgName}
                    </td>
                    <td style={{ padding: '16px', border: '1px solid #e2e8f0', borderRight: 'none', borderLeft: 'none', color: '#1e293b' }}>
                      {task.blockId === '__ALL__' ? 'All Blocks' : (task.blockId || 'All Blocks')}
                    </td>
                    <td style={{ padding: '16px', border: '1px solid #e2e8f0', borderRight: 'none', borderLeft: 'none' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{task.groupLabel}</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{task.subLabel}</div>
                    </td>
                    <td style={{ padding: '16px', border: '1px solid #e2e8f0', borderRight: 'none', borderLeft: 'none', color: '#475569', fontSize: '14px' }}>
                      Fire Safety Audit
                    </td>
                    <td style={{ padding: '16px', border: '1px solid #e2e8f0', borderRight: 'none', borderLeft: 'none' }}>
                      <span style={{ 
                        background: '#eff6ff', 
                        color: '#3b82f6', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        fontWeight: 600,
                        border: '1px solid #dbeafe'
                      }}>
                        {task.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px', borderTopRightRadius: '8px', borderBottomRightRadius: '8px', border: '1px solid #e2e8f0', borderLeft: 'none', textAlign: 'center' }}>
                      <button
                        onClick={() => onStartAudit(task.groupId, task.subId, task.orgId, task.blockId)}
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          border: '1px solid #cbd5e1', 
                          background: 'white', 
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#10b981'
                        }}
                        title="Start Audit"
                      >
                        ✓
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuditorDashboard
