import React from 'react'
import { validateAudit, completeAuditAuditor } from '../services/apiService'

export default function FinalizeAuditModal({ auditId, onClose, onCompleted }) {
  const [loading, setLoading] = React.useState(false)
  const [blockers, setBlockers] = React.useState([])
  const [valid, setValid] = React.useState(false)
  const [agree, setAgree] = React.useState(false)
  const [error, setError] = React.useState('')
  React.useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const res = await validateAudit(auditId)
        setBlockers(res.blockers || [])
        setValid(!!res.valid && (Array.isArray(res.blockers) ? res.blockers.length === 0 : true))
      } catch {
        setBlockers([])
        setValid(false)
      } finally {
        setLoading(false)
      }
    })()
  }, [auditId])
  async function handleConfirm() {
    if (!valid || !agree || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await completeAuditAuditor(auditId)
      if (!res.ok) {
        setBlockers(res.blockers || [])
        setValid(false)
        setError('Validation failed')
        return
      }
      if (typeof onCompleted === 'function') onCompleted({ auditId })
      if (typeof onClose === 'function') onClose()
    } catch {
      setError('Failed to complete audit')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div style={{ fontSize: 16, fontWeight: 600 }}>Finalize Audit</div>
        </div>
        <div className="modal-body">
          {!valid && (
            <div style={{ background: '#fee2e2', color: '#7f1d1d', padding: 12, borderRadius: 6, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Blockers</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {(blockers || []).map((b, idx) => (
                  <li key={idx} style={{ fontSize: 12 }}>{String(b)}</li>
                ))}
              </ul>
            </div>
          )}
          {valid && (
            <div style={{ background: '#fff7ed', color: '#7c2d12', padding: 12, borderRadius: 6, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Warning</div>
              <div style={{ fontSize: 12 }}>
                DANGER: You are about to lock this audit. Once completed, no further changes can be made to scores, observations, or evidence. This is a permanent legal record.
              </div>
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I understand this action is irreversible.</span>
          </label>
          {error ? <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 8 }}>{error}</div> : null}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={!valid || !agree || loading}>
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
