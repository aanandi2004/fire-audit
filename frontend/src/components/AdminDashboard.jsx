import React from 'react'
import { RECORD_GROUPS } from '../config/groups'
import { auth } from '../firebase'

function AdminDashboard() {
  const [counts, setCounts] = React.useState({
    organizations: 0,
    customers: 0,
    auditors: 0,
    audits: 0,
    auditsCompleted: 0,
    auditsPending: 0,
  })

  React.useEffect(() => {
    let cancelled = false
    async function fetchStats() {
      try {
        const current = auth.currentUser
        if (!current) return
        const idToken = await current.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const res = await fetch(`${BASE_URL}/api/admin/stats`, {
          method: 'GET',
          headers: { idToken }
        })
        if (!res.ok) {
          if (!cancelled) {
            setCounts({
              organizations: 0,
              customers: 0,
              auditors: 0,
              audits: 0,
              auditsCompleted: 0,
              auditsPending: 0,
            })
          }
          return
        }
        const data = await res.json()
        if (!cancelled) {
          setCounts(prev => ({
            ...prev,
            organizations: Number(data?.totalOrganizations || 0),
            customers: Number(data?.totalCustomers || 0),
            auditors: Number(data?.totalAuditors || 0),
            audits: Number(data?.totalAudits || 0),
            auditsCompleted: Number(data?.auditsCompleted || 0),
            auditsPending: Number(data?.auditsPending || 0),
          }))
        }
      } catch {
        if (!cancelled) {
          setCounts({
            organizations: 0,
            customers: 0,
            auditors: 0,
            audits: 0,
            auditsCompleted: 0,
            auditsPending: 0,
          })
        }
      }
    }
    fetchStats()
    function handleRefresh() {
      fetchStats()
    }
    window.addEventListener('admin:auditors:refresh', handleRefresh)
    window.addEventListener('admin:users:refresh', handleRefresh)
    window.addEventListener('admin:orgs:refresh', handleRefresh)
    return () => {
      cancelled = true
      window.removeEventListener('admin:auditors:refresh', handleRefresh)
      window.removeEventListener('admin:users:refresh', handleRefresh)
      window.removeEventListener('admin:orgs:refresh', handleRefresh)
    }
  }, [])

  const stats = [
    { label: 'Total Organizations', value: counts.organizations, color: '#3b82f6' },
    { label: 'Total Customers', value: counts.customers, color: '#10b981' },
    { label: 'Total Auditors', value: counts.auditors, color: '#8b5cf6' },
    { label: 'Total Audits', value: counts.audits, color: '#f59e0b' },
    { label: 'Audits Completed', value: counts.auditsCompleted, color: '#166534' },
    { label: 'Audits Pending', value: counts.auditsPending, color: '#ef4444' },
  ]

  return (
    <div className="page-body">
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: '#1e293b' }}>Admin Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {stats.map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: stat.color, marginBottom: '8px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>{stat.label}</div>
          </div>
        ))}
      </div>
      
      {/* Recent Activity section removed as requested */}
    </div>
  )
}

export default AdminDashboard
