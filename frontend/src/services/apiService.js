const HAS_ENV_URL = !!(import.meta.env && import.meta.env.VITE_BACKEND_URL)
const HAS_WINDOW_URL = typeof window !== 'undefined' && !!window.__BACKEND_URL__
const IS_PROD = !!(import.meta.env && import.meta.env.PROD)
if (IS_PROD && !HAS_ENV_URL && !HAS_WINDOW_URL) {
  throw new Error('VITE_BACKEND_URL is missing in production')
}
const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || (typeof window !== 'undefined' ? window.__BACKEND_URL__ : undefined) || 'http://localhost:8011'
if (!IS_PROD && !HAS_ENV_URL && !HAS_WINDOW_URL) {
  try { console.warn('[apiService] VITE_BACKEND_URL missing; defaulting to', BASE_URL) } catch { void 0 }
}

export async function getToken() {
  try {
    const { auth } = await import('../firebase')
    const current = auth.currentUser
    if (!current || !current.getIdToken) return null
    try {
      return await current.getIdToken(true)
    } catch {
      return await current.getIdToken()
    }
  } catch {
    return null
  }
}

export async function getLatestAuditId(orgId) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/api/organizations/${encodeURIComponent(orgId)}/latest-audit`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    const data = await resp.json().catch(() => ({}))
    return data?.auditId || null
  } catch {
    return null
  }
}

export async function getAdminOrganizations() {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/api/admin/organizations`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => []) : []
  } catch {
    return []
  }
}

export async function getOrganizations() {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/api/organizations`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => []) : []
  } catch {
    return []
  }
}

export async function getAssignments() {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/assignments`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => []) : []
  } catch {
    return []
  }
}

export async function getAuditorsAdmin() {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/api/admin/auditors/list`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => []) : []
  } catch {
    return []
  }
}

export async function getUsersByRole(role) {
  // Backend does not expose GET /users?role=; avoid 405s
  if (String(role || '').toUpperCase() === 'CUSTOMER') return []
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/users?role=${encodeURIComponent(role)}`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => []) : []
  } catch {
    return []
  }
}

export async function getUsersByRoleAndOrg(role, orgId) {
  try {
    const token = await getToken()
    const params = new URLSearchParams({ role: String(role || ''), org_id: String(orgId || '') })
    const resp = await fetch(`${BASE_URL}/users?${params.toString()}`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => []) : []
  } catch {
    return []
  }
}

export async function listOrgResponses(audit_id, block_id) {
  try {
    const token = await getToken()
    const params = new URLSearchParams({ audit_id: String(audit_id || ''), block_id: String(block_id || '') })
    const resp = await fetch(`${BASE_URL}/org-responses/list?${params.toString()}`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => []) : []
  } catch {
    return []
  }
}

export async function saveOrgResponses(payload) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/org-responses/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { idToken: token } : {}) },
      body: JSON.stringify(payload || [])
    })
    return resp.ok ? resp.json().catch(() => []) : []
  } catch {
    return []
  }
}

export async function saveBuildingDetails(body) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/org-responses/building-details/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { idToken: token } : {}) },
      body: JSON.stringify(body || {})
    })
    return resp.ok ? resp.json().catch(() => ({})) : {}
  } catch {
    return {}
  }
}

export async function autosaveOrganizationField(orgId, section, field, value) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/api/organizations/${encodeURIComponent(orgId)}/self-assessment/save`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { idToken: token } : {}) },
      body: JSON.stringify({ section, field, value })
    })
    return resp.ok ? resp.json().catch(() => ({})) : {}
  } catch {
    return {}
  }
}

export async function listAuditResponsesByAssignment(assignment_id) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/audit/responses?assignment_id=${encodeURIComponent(String(assignment_id || ''))}`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => []) : []
  } catch {
    return []
  }
}

export async function postAuditorResponse(body) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/audit/auditor-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { idToken: token } : {}) },
      body: JSON.stringify(body || {})
    })
    return resp.ok ? resp.json().catch(() => ({})) : {}
  } catch {
    return {}
  }
}

export async function listObservations(query) {
  try {
    const token = await getToken()
    const params = new URLSearchParams(Object.entries(query || {}).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null) acc[k] = String(v)
      return acc
    }, {}))
    const resp = await fetch(`${BASE_URL}/audit/observations?${params.toString()}`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => []) : []
  } catch {
    return []
  }
}

export async function verifyAuditorObservation(body) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/audit/observations/auditor/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { idToken: token } : {}) },
      body: JSON.stringify(body || {})
    })
    return resp.ok ? resp.json().catch(() => ({})) : {}
  } catch {
    return {}
  }
}

export async function upsertQuestionsMasterAdmin() {
  // Endpoint not available; no-op to avoid 404 noise
  return {}
}

export async function ensureBuildingInfoSchemaForOrgAdmin(orgId) {
  String(orgId || '')
  try { console.warn('[apiService] ensureBuildingInfoSchemaForOrgAdmin skipped: endpoint unavailable'); } catch { /* noop */ }
  return {}
}

export async function createAudit(orgId, buildingId, auditorId) {
  try {
    const token = await getToken()
    const body = { org_id: orgId, building_id: buildingId, auditor_id: auditorId }
    const resp = await fetch(`${BASE_URL}/api/admin/audits/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { idToken: token } : {}) },
      body: JSON.stringify(body)
    })
    const data = await resp.json().catch(() => ({}))
    return data?.audit_id || null
  } catch {
    return null
  }
}

export async function completeAudit(auditId) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/api/admin/audits/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { idToken: token } : {}) },
      body: JSON.stringify({ audit_id: auditId })
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      const blockers = Array.isArray(data?.blockers) ? data.blockers : []
      return { ok: false, blockers }
    }
    return { ok: true, blockers: [] }
  } catch {
    return { ok: false, blockers: [] }
  }
}

export async function getAudit(auditId) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/audits/${encodeURIComponent(String(auditId || ''))}`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => ({})) : {}
  } catch {
    return {}
  }
}

export async function getAuditBaseline(auditId) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/audits/${encodeURIComponent(String(auditId || ''))}/baseline`, {
      method: 'GET',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => ({})) : {}
  } catch {
    return {}
  }
}

export async function lockAudit(auditId) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/audits/${encodeURIComponent(String(auditId || ''))}/lock`, {
      method: 'POST',
      headers: token ? { idToken: token } : {}
    })
    return resp.ok ? resp.json().catch(() => ({})) : {}
  } catch {
    return {}
  }
}
export async function validateAudit(auditId) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/audits/${encodeURIComponent(String(auditId || ''))}/validate`, {
      method: 'POST',
      headers: token ? { idToken: token } : {}
    })
    const data = await resp.json().catch(() => ({}))
    const blockers = Array.isArray(data?.blockers) ? data.blockers : []
    return { valid: !!data?.valid, blockers }
  } catch {
    return { valid: false, blockers: [] }
  }
}
export async function completeAuditAuditor(auditId) {
  try {
    const token = await getToken()
    const resp = await fetch(`${BASE_URL}/audits/${encodeURIComponent(String(auditId || ''))}/complete`, {
      method: 'POST',
      headers: token ? { idToken: token } : {}
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      const blockers = Array.isArray(data?.blockers) ? data.blockers : []
      return { ok: false, blockers }
    }
    return { ok: true, blockers: [] }
  } catch {
    return { ok: false, blockers: [] }
  }
}
export function resolveOrgId(user, orgs) {
  if (user?.orgId) return user.orgId
  const org = Array.isArray(orgs) ? orgs.find(o => o.name === user?.organizationName) : null
  return org?.id || (user?.organizationName || 'default')
}
