import React, { useState } from 'react'
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'

const normalizeBlock = (s) => (s || '').toLowerCase().trim()
const isInputOnlyBlock = (b) => {
  const x = normalizeBlock(b)
  return x === 'building details' || x === 'bulding details' || x === 'building materials' || x === 'type of construction'
}

function AdminAuditDataRegistry({ 
  orgs, 
  statusMap, 
  valueMap,
  auditorStatusMap
}) {
  const [filterOrg, setFilterOrg] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Flatten all data into a printable list
  const allRows = []

  // Iterate over each organization to generate their specific audit registry
  orgs.forEach(org => {
    // Find the assigned Group and Subdivision for this organization
    const assignedGroup = RECORD_GROUPS.find(g => g.label === org.type)
    // org.subdivision usually stores the ID (e.g., 'A-1'), but let's check both ID and Label match to be safe
    // In AdminOrgManagement, value stores ID.
    const assignedSub = assignedGroup?.subdivisions.find(s => s.id === org.subdivision)

    if (assignedGroup && assignedSub) {
      const questions = getQuestions(assignedGroup.id, assignedSub.id)
      const blockCount = org.blockCount || 1
      
      // Iterate over each block
      for (let i = 1; i <= blockCount; i++) {
        const blockName = `Block ${i}`
        
        questions.forEach(q => {
          const qId = q.id
          
          // Construct composite key for this block
          const blockKey = `${blockName}::${qId}`
          
          // Check data: Look for specific block data first, then fallback to general (legacy)
          // Note: Customer data (statusMap) might not be block-scoped yet? 
          // Assuming customer data is still flat or we need to update customer side too.
          // For now, let's assume customer data is flat (shared) or use same logic if we updated customer.
          // Since we didn't update RecordAssessments.jsx to use blocks, customer data is at qId.
          const custStatus = statusMap[qId] 
          const custValue = valueMap && valueMap[qId]
          
          // Auditor data is block-scoped
          const audStatus = auditorStatusMap[blockKey] || (i === 1 ? auditorStatusMap[qId] : undefined) // Fallback only for Block 1 if legacy data exists?
          
          const isInputOnly = isInputOnlyBlock(q.block)

          // Only add row if it's the first block OR if there is block-specific auditor data
          // To avoid duplicating "Customer Data" rows for every block if customer hasn't done block-specific entry.
          // But if we want to show "Auditor hasn't checked Block 2 yet", we should show the row.
          // Let's show all blocks.
          
          allRows.push({
            id: qId,
            org: org.name,
            block: blockName, 
            group: assignedGroup.label,
            subgroup: assignedSub.label,
            question: q.requirement,
            customerAnswer: isInputOnly ? (custValue || '-') : (custStatus || '-'),
            auditorAnswer: audStatus || '-',
            status: isInputOnly ? 'Frozen' : (audStatus === 'In Place' ? 'In Place' : (audStatus ? 'Not In Place' : (custStatus || 'Pending'))),
            isInputOnly: isInputOnly
          })
        })
      }
    }
  })

  const filteredRows = allRows.filter(row => {
    if (filterOrg && !row.org.toLowerCase().includes(filterOrg.toLowerCase())) return false
    if (filterStatus && row.status !== filterStatus) return false
    return true
  })

  return (
    <div className="page-body">
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
           <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>Audit Data Registry</h2>
           <p style={{ color: '#64748b' }}>Master view of all audit records.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }} />
      </div>

      <div className="filters" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          placeholder="Filter by Organization..." 
          className="field-input"
          style={{ maxWidth: '200px' }}
          value={filterOrg}
          onChange={e => setFilterOrg(e.target.value)}
        />
        <select 
          className="field-input" 
          style={{ maxWidth: '200px' }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="In Place">In Place</option>
          <option value="Not In Place">Not In Place</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Organization</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Category</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Subcategory</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#64748b', width: '30%' }}>Question</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Customer</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Auditor</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#64748b' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? filteredRows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px' }}>{row.org}</td>
                <td style={{ padding: '12px', fontWeight: 500 }}>{row.group}</td>
                <td style={{ padding: '12px', color: '#64748b', fontSize: '12px' }}>{row.subgroup}</td>
                <td style={{ padding: '12px' }}>{row.question}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
                    background: row.isInputOnly ? '#f1f5f9' : (row.customerAnswer === 'In Place' ? '#dcfce7' : (row.customerAnswer === '-' ? '#f1f5f9' : '#fee2e2')),
                    color: row.isInputOnly ? '#334155' : (row.customerAnswer === 'In Place' ? '#166534' : (row.customerAnswer === '-' ? '#64748b' : '#991b1b'))
                  }}>
                    {row.customerAnswer}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '2px 6px', borderRadius: '4px', fontSize: '11px',
                    background: row.auditorAnswer === 'In Place' ? '#dcfce7' : (row.auditorAnswer === '-' ? '#f1f5f9' : '#fee2e2'),
                    color: row.auditorAnswer === 'In Place' ? '#166534' : (row.auditorAnswer === '-' ? '#64748b' : '#991b1b')
                  }}>
                    {row.auditorAnswer}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{row.status}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No audit data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminAuditDataRegistry
