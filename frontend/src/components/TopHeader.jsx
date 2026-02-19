import React, { useState } from 'react'

function TopHeader({ title, subtitle, meta, user, onLogout, onSettings }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div className="top-header-title">{title}</div>
        {subtitle && <div className="top-header-subtitle">{subtitle}</div>}
        {meta && (
          <div className="top-header-meta">
            {meta.role && <span>Role: {meta.role}</span>}
            {meta.email && <span>Email: {meta.email}</span>}
            {meta.organization && <span>Org: {meta.organization}</span>}
          </div>
        )}
      </div>

      {user && (
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ 
              background: '#f1f5f9', 
              border: 'none', 
              borderRadius: '50%', 
              width: '40px', 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#334155'
            }}
            title="Profile"
          >
            {user.username.charAt(0).toUpperCase()}
          </button>
          
          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              width: '200px',
              zIndex: 50,
              overflow: 'hidden'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{user.name || user.username}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{user.role}</div>
              </div>
              {user.role === 'ADMIN' && (
                <button 
                  onClick={() => { setMenuOpen(false); onSettings() }}
                  style={{ 
                    display: 'block', 
                    width: '100%', 
                    textAlign: 'left', 
                    padding: '10px 16px', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer',
                    color: '#334155',
                    fontSize: '14px'
                  }}
                  className="hover:bg-slate-50"
                >
                  ⚙️ Profile Settings
                </button>
              )}
              <button 
                onClick={() => { setMenuOpen(false); onLogout() }}
                style={{ 
                  display: 'block', 
                  width: '100%', 
                  textAlign: 'left', 
                  padding: '10px 16px', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: '#ef4444',
                  fontSize: '14px',
                  borderTop: '1px solid #f1f5f9'
                }}
              >
                🚪 Log Out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TopHeader
