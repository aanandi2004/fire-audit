import React, { useState } from 'react'

function AdminSettings({ currentUser, admins, setAdmins, onLogout }) {
  const [formData, setFormData] = useState(() => ({
    username: currentUser?.username || '',
    password: currentUser?.password || '',
    name: currentUser?.name || ''
  }))

  const handleUpdate = (e) => {
    e.preventDefault()
    
    // Update in the admins list
    const updatedAdmins = admins.map(admin => {
      if (admin.username === currentUser.username) { // Assuming username didn't change yet, or using ID if available. 
        // Note: If username changes, we need to match by original username. 
        // But for simplicity, let's assume we match by the original object reference or we'll just iterate and match by old username if we stored it.
        // Actually, let's just use the current username from props as the key.
        return { ...admin, ...formData }
      }
      return admin
    })

    setAdmins(updatedAdmins)
    alert('Profile updated successfully! Please log in again with your new credentials.')
    onLogout()
  }

  return (
    <div className="page-body">
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '24px' }}>Settings</h2>
      
      <div className="card" style={{ maxWidth: '600px', padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>My Profile</h3>
        
        <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label className="field-label">Name</label>
            <input 
              className="field-input" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input 
              className="field-input" 
              type="text"
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>
          
          <div style={{ marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary">Update Profile & Logout</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ maxWidth: '600px', padding: '24px', marginTop: '24px', borderLeft: '4px solid #ef4444' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: '#ef4444' }}>Session</h3>
        <p style={{ marginBottom: '16px', color: '#64748b' }}>Sign out of your account safely.</p>
        <button 
          onClick={onLogout}
          className="btn btn-outline"
          style={{ borderColor: '#ef4444', color: '#ef4444' }}
        >
          Log Out
        </button>
      </div>
    </div>
  )
}

export default AdminSettings
