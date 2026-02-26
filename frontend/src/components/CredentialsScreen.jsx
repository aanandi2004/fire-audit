import React, { useState } from 'react'
import { auth } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'

function CredentialsScreen({ onNext }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || !password) {
      return
    }
    const normalizedEmail = trimmedName.includes('@') ? trimmedName : `${trimmedName}@fireaudit.com`

    ;(async () => {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password)
        const { user } = userCredential
        const idToken = await user.getIdToken()
        console.log('idToken prefix:', (idToken || '').slice(0, 20))
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        try {
          await fetch(`${BASE_URL}/users/self-upsert`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` }
          })
        } catch { /* noop */ }
        const res = await fetch(`${BASE_URL}/auth/session`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${idToken}` }
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data?.detail || 'Session verification failed')
          return
        }
        const session = await res.json()
        const { role } = session
        const targetPath = role === 'ADMIN' ? '/admin' : role === 'AUDITOR' ? '/auditor' : '/customer'
        window.history.pushState({}, '', targetPath)
        onNext(session)
      } catch {
        setError('Invalid credentials or network error')
      }
    })()
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-title">Fire Audit Management</div>
        <div className="login-subtitle">Sign in to start a fire and life safety audit.</div>
        
        {error && <div style={{ color: 'red', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}

        <div className="field-group">
          <label className="field-label" htmlFor="name">
            Email
          </label>
          <input
            id="name"
            type="email"
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="user@example.com"
            required
          />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              className="field-input"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <button type="submit" className="btn btn-primary login-button">
          Login
        </button>
      </form>
    </div>
  )
}

export default CredentialsScreen
