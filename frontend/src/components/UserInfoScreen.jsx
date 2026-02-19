import React, { useState } from 'react'

function UserInfoScreen({ initialName, initialOrganization, onSubmit }) {
  const [name, setName] = useState(initialName || '')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState(initialOrganization || '')

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({
      name: name || 'User',
      email,
      organization,
    })
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-title">User information</div>
        <div className="login-subtitle">
          Enter your profile details before opening the dashboard.
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="profile-name">
            Name
          </label>
          <input
            id="profile-name"
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="organization">
            Organization
          </label>
          <input
            id="organization"
            className="field-input"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Sri Kauvery Medical Care (India) Ltd"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary login-button">
          Continue
        </button>
      </form>
    </div>
  )
}

export default UserInfoScreen
