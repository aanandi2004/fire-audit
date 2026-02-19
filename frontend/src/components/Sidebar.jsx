import React from 'react'

const navItems = Object.freeze([
  Object.freeze({ id: 'home', label: 'Home', initial: 'H', roles: Object.freeze(['CUSTOMER', 'AUDITOR', 'ADMIN']) }),
  Object.freeze({ id: 'fireSafetyAudits', label: 'Fire Safety Audits', initial: 'F', roles: Object.freeze(['CUSTOMER']) }),
  Object.freeze({ id: 'recordAssessments', label: 'Record Assessments', initial: 'R', roles: Object.freeze(['CUSTOMER']) }),
  Object.freeze({ id: 'closeAuditObservations', label: 'Close Audit Observations', initial: 'C', roles: Object.freeze(['CUSTOMER']) }),
  Object.freeze({ id: 'orgManagement', label: 'Organization Mgmt', initial: 'O', roles: Object.freeze(['ADMIN']) }),
  Object.freeze({ id: 'userManagement', label: 'Auditor Management', initial: 'A', roles: Object.freeze(['ADMIN']) }),
  Object.freeze({ id: 'assignments', label: 'Assignments', initial: 'A', roles: Object.freeze(['ADMIN']) }),
  Object.freeze({ id: 'auditRegistry', label: 'Audit Data Registry', initial: 'D', roles: Object.freeze(['ADMIN']) }),
])

function Sidebar({ active, onChange, role }) {
  const currentRole = role

  const items = navItems.filter(item => {
    return item.roles.includes(currentRole)
  })

  return (
    <aside className="sidebar">
      <ul className="nav-list">
        {items.map((item) => (
          <li key={item.id} className="nav-item">
            <button
              type="button"
              className={`nav-button ${active === item.id ? 'active' : ''}`}
              onClick={() => onChange(item.id)}
            >
              <div className="nav-icon-box" style={{ 
                background: active === item.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                borderRadius: '4px'
              }}>
                {item.initial}
              </div>
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default Sidebar
