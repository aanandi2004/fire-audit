import React, { useState } from 'react'
import { auth } from '../firebase'

export default function AdminCreateUser({ onBack }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Customer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const isValidPassword = (p) => {
    if (!p || p.length < 8) return false
    if (!/[A-Z]/.test(p)) return false
    if (!/[0-9]/.test(p)) return false
    if (!/[!@#$%^&*(),.?":{}|<>_-]/.test(p)) return false
    return true
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const u = username.trim()
    const p = password
    if (!u) {
      setError('Username is required')
      return
    }
    if (!isValidPassword(p)) {
      setError('Password must be 8+ chars with uppercase, number, and special char')
      return
    }
    setLoading(true)
    try {
      const email = `${u}@fireaudit.com`
      const idToken = await auth.currentUser.getIdToken()
      const res = await fetch('http://localhost:8000/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', idToken },
        body: JSON.stringify({ username: u, email, password: p, role })
      })
      if (res.status === 409) {
        setError('Username is already taken')
        setLoading(false)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.detail || 'Failed to create user')
        setLoading(false)
        return
      }
      setSuccess('User created')
      setUsername('')
      setPassword('')
      setRole('Customer')
    } catch {
      setError('Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>Create User</h2>
        <button className="btn btn-outline" onClick={onBack}>Back</button>
      </div>
      {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}
      {success && <div style={{ color: '#10b981', marginBottom: '16px' }}>{success}</div>}
      <form onSubmit={handleSave} className="card" style={{ padding: '24px', maxWidth: '480px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label className="field-label">Username</label>
          <input className="field-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label className="field-label">Password</label>
          <div style={{ position: 'relative' }}>
            <input 
              className="field-input" 
              type={showPassword ? 'text' : 'password'} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter password" 
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
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
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {password.length < 8 && (
            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
              Minimum 8 chars, uppercase, number, special char required
            </div>
          )}
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label className="field-label">Role</label>
          <select className="field-input" value={role} onChange={e => setRole(e.target.value)}>
            <option value="Customer">Customer</option>
            <option value="Auditor">Auditor</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading || !username.trim() || !isValidPassword(password)}>
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  )
}
