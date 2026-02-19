import React from 'react'

function HomePage({ user }) {
  return (
    <div className="home-container">
      <div className="welcome-banner">
        <div className="welcome-title">
          Welcome, {user?.organizationName || user?.name || 'user'}
        </div>
        <div className="welcome-meta">
          <span>Email: {user?.email || user?.username || '-'}</span>
          <span>Organization: {user?.organization || user?.organizationName || '-'}</span>
          <span>Role: {user?.role || 'Customer'}</span>
        </div>
      </div>

      <div className="home-grid">
        {/* Responsibilities Card */}
        <div className="home-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <span className="card-title">Responsibilities</span>
          </div>
          <ul className="card-list">
            <li>You have been assigned to investigate as part of these departments</li>
            <li>These complaint types have been assigned to you</li>
            <li>You are required to audit these</li>
            <li>Chair for the following meetings</li>
            <li>Coordinator for the following meetings</li>
            <li>Member in the following meetings</li>
            <li>Data steward for these areas</li>
            <li>Area incharges for these areas</li>
            <li>Incharge for reviewing these SOPs</li>
          </ul>
        </div>

        {/* Tasks Card */}
        <div className="home-card">
          <div className="card-header">
            <span className="card-title" style={{ textTransform: 'uppercase', fontSize: '13px', color: '#64748b' }}>TASKS</span>
          </div>
          <div className="task-tabs">
            <div className="task-tab active">Overdue <span style={{ background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>0</span></div>
            <div className="task-tab">Open <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>0</span></div>
            <div className="task-tab">Done <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>0</span></div>
          </div>
          <div className="task-empty">
            ----No OverDue Tasks----
          </div>
        </div>

        {/* Activities Card */}
        <div className="home-card">
          <div className="card-header">
            <div className="card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <span className="card-title">Activities</span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
            Activities requiring your attention will show here.
          </p>
          <ul className="card-list">
            <li>Incidents to investigate</li>
            <li>Complaints to close</li>
            <li>Review of SOPs</li>
            <li>Close RCAs</li>
            <li>Risk assessments</li>
            <li>Self appraisal</li>
            <li>Review appraisals</li>
            <li>Review confirmations</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default HomePage
