import React, { useState } from 'react'
import './App.css'
import CredentialsScreen from './components/CredentialsScreen'
import UserInfoScreen from './components/UserInfoScreen'
import Sidebar from './components/Sidebar'
import TopHeader from './components/TopHeader'
import HomePage from './components/HomePage'
import RecordAssessments from './components/RecordAssessments'
import CloseObservationsPage from './components/CloseObservationsPage'
import FireSafetyAuditSummary from './components/FireSafetyAuditSummary'
import AuditorDashboard from './components/AuditorDashboard'
import AuditorAssessment from './components/AuditorAssessment'
import AdminDashboard from './components/AdminDashboard'
import AdminOrgManagement from './components/AdminOrgManagement'
import AdminUserManagement from './components/AdminUserManagement'
import AdminCreateUser from './components/AdminCreateUser'
import AdminAssignment from './components/AdminAssignment'
import AdminAuditDataRegistry from './components/AdminAuditDataRegistry'
import AdminSettings from './components/AdminSettings'
import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { RECORD_GROUPS } from './config/groups'
import { getAdminOrganizations, getOrganizations, getAssignments, getAuditorsAdmin, getUsersByRole, upsertQuestionsMasterAdmin, ensureBuildingInfoSchemaForOrgAdmin } from './services/apiService'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { className: 'app-error' }, 'Something went wrong.')
    }
    return this.props.children
  }
}


function InactivityTimeout({ onTimeout, minutes = 30 }) {
  React.useEffect(() => {
    let timer = null
    const reset = () => {
      try { if (timer) clearTimeout(timer) } catch { /* noop */ }
      timer = setTimeout(() => {
        try { onTimeout() } catch { /* noop */ }
      }, minutes * 60 * 1000)
    }
    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
    events.forEach(ev => window.addEventListener(ev, reset, { passive: true }))
    reset()
    return () => {
      try { if (timer) clearTimeout(timer) } catch { /* noop */ }
      events.forEach(ev => window.removeEventListener(ev, reset))
    }
  }, [onTimeout, minutes])
  return null
}

function App() {
  const [authUser, setAuthUser] = useState(null)
  const [user, setUser] = useState(null)
  const [active, setActive] = useState('home')
  const [auditContext, setAuditContext] = useState({ auditId: null, blockId: null, groupId: null, subdivisionId: null })
  React.useEffect(() => {
    try { window.__AUDITOR_LOCK__ = 'false' } catch { /* noop */ }
  }, [])
  const enterAudit = React.useCallback((auditId, blockId, groupId, subdivisionId) => {
    setAuditContext({
      auditId: String(auditId || ''),
      blockId: String(blockId || ''),
      groupId: String(groupId || ''),
      subdivisionId: String(subdivisionId || '')
    })
    setActive('auditorAssessment')
  }, [])
  React.useEffect(() => {
    try { localStorage.setItem('app.active', String(active || 'home')) } catch { /* noop */ }
  }, [active])
  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          setAuthUser(null)
          setUser(null)
          setActive('home')
          return
        }
        const idToken = await fbUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || (typeof window !== 'undefined' ? window.__BACKEND_URL__ : undefined) || 'http://localhost:8010'
        const resp = await fetch(`${BASE_URL}/auth/session`, { headers: { idToken } })
        let session = {}
        if (resp.ok) {
          session = await resp.json().catch(() => ({}))
        }
        const mappedUser = {
          id: session.uid || fbUser.uid,
          username: session.email || fbUser.email,
          name: session.email || fbUser.email,
          email: session.email || fbUser.email,
          role: session.role || 'AUDITOR',
          orgId: session.org_id || null,
          organizationName: ''
        }
        setAuthUser(mappedUser)
        setUser(mappedUser)
        // Do not modify active view or auditContext here
      } catch {
        // noop
      }
    })
    return () => { try { unsub() } catch { /* noop */ } }
  }, [])
  // Admin Data State
  const [admins, setAdmins] = useState([])
  const [customers, setCustomers] = useState([])
  const [auditors, setAuditors] = useState([])
  const [orgs, setOrgs] = useState([])
  const [assignments, setAssignments] = useState([])
  
  

  React.useEffect(() => {
    ;(async () => {
      if (!auth.currentUser) {
        setOrgs([])
        return
      }
      if (authUser?.role === 'ADMIN') {
        const data = await getAdminOrganizations()
        setOrgs(Array.isArray(data) ? data : [])
        return
      }
      const data = await getOrganizations()
      setOrgs(Array.isArray(data) ? data : [])
    })()
  }, [authUser])
  React.useEffect(() => {
    ;(async () => {
      if (!authUser) return
      if (authUser.role !== 'ADMIN') return
      try {
        await upsertQuestionsMasterAdmin()
      } catch {
        void 0
      }
    })()
  }, [authUser])
  React.useEffect(() => {
    ;(async () => {
      if (!authUser) return
      if (authUser.role !== 'ADMIN') return
      const ids = Array.isArray(orgs) ? orgs.map(o => o.id).filter(Boolean) : []
      for (const id of ids) {
        try {
          await ensureBuildingInfoSchemaForOrgAdmin(id)
        } catch {
          void 0
        }
      }
    })()
  }, [authUser, orgs])
  React.useEffect(() => {
    ;(async () => {
      if (!auth.currentUser) {
        setAssignments([])
        return
      }
      const data = await getAssignments()
      const list = (Array.isArray(data) ? data : []).map(d => ({
        id: d.id,
        assignment_id: d.id,
        audit_id: d.audit_id || d.id,
        org_id: d.org_id,
        org_name: d.org_name,
        block_id: d.block_id,
        block_name: d.block_name,
        occupancy_group: d.occupancy_group,
        subdivision: d.subdivision,
        auditor_id: d.auditor_id,
        auditor_name: d.auditor_name,
        group: d.group,
        subdivision_id: d.subdivision_id,
        is_active: d.is_active === true,
        orgId: d.org_id,
        blockId: d.block_id,
        blockName: d.block_name,
        auditorId: d.auditor_id,
        auditorName: d.auditor_name
      }))
      setAssignments(list)
    })()
  }, [authUser])

  React.useEffect(() => {
    ;(async () => {
      if (!auth.currentUser) {
        setCustomers([])
        setAuditors([])
        return
      }
      if (authUser?.role === 'ADMIN') {
        const cust = await getUsersByRole('CUSTOMER')
        setCustomers(Array.isArray(cust) ? cust.map(d => ({ id: d.id, ...d, role: 'Customer' })) : [])
        const aud = await getAuditorsAdmin()
        const mapped = Array.isArray(aud) ? aud.map(d => ({
          id: d.id,
          email: d.email,
          username: d.username,
          name: d.name || d.username || d.email,
          role: 'Auditor',
          org_id: d.org_id || null,
          status: d.is_active ? 'Active' : 'Inactive'
        })) : []
        setAuditors(mapped)
        return
      }
      setCustomers([])
      setAuditors([])
    })()
  }, [authUser?.id, authUser?.role])

  // Customer/Auditor State
  const [assessmentGroupId, setAssessmentGroupId] = useState('A')
  const [assessmentSubdivisionId, setAssessmentSubdivisionId] = useState('A-1')
  const [auditorActiveOrgId, setAuditorActiveOrgId] = useState(null)
  
  
  // Audit Data State (Persisted)
  const [statusMap, setStatusMap] = useState({})
  const [commentMap, setCommentMap] = useState({})
  const [valueMap, setValueMap] = useState({})
  const [auditorStatusMap, setAuditorStatusMap] = useState({})
  const [auditorCommentMap, setAuditorCommentMap] = useState({})

  // Recent Activity Log (Persisted)
  const [RECENT_ACTIVITIES, setRecentActivities] = useState([])

  // Persist Audit Data
 

  const nextActivityIdRef = React.useRef(1)
  const logActivity = (user, action, details) => {
    const newActivity = {
      id: `act_${nextActivityIdRef.current++}`,
      timestamp: new Date().toISOString(),
      user: {
        name: user.name || user.username,
        role: user.role,
        id: user.id
      },
      action,
      details
    }
    setRecentActivities(prev => [newActivity, ...prev].slice(0, 50)) // Keep last 50
  }

  React.useEffect(() => {
    if (!user) return
    const p = window.location.pathname
    if (p === '/admin' || p === '/auditor' || p === '/customer') {
      setActive('home')
    }
  }, [user])

  if (!authUser) {
    return (
      <CredentialsScreen 
        onNext={(session) => {
          const mappedUser = {
            id: session.uid,
            username: session.email,
            name: session.email,
            email: session.email,
            role: session.role,
            orgId: session.org_id || null,
            organizationName: ''
          }
          setAuthUser(mappedUser)
          logActivity(mappedUser, 'Logged In', 'User logged in to the system.')
          setUser(mappedUser)
          const p = window.location.pathname
          if (p === '/admin' || p === '/auditor' || p === '/customer') {
            setActive('home')
          }
        }} 
      />
    )
  }

  // Fallback for non-pre-created users (or first-time login customers)
  if (!user) {
    return (
      <UserInfoScreen
        initialName={authUser.name || authUser.username}
        initialOrganization={authUser.organizationName || authUser.organization}
        onSubmit={(userInfo) => {
          if (authUser.role === 'CUSTOMER') {
            const updatedUser = { 
              ...authUser, 
              ...userInfo, 
              organizationName: userInfo.organization, // Sync fields
              isFirstLogin: false 
            }
            
            const updatedCustomers = customers.map(c => 
              c.id === authUser.id ? updatedUser : c
            )
            setCustomers(updatedCustomers)
            setAuthUser(updatedUser)
            setUser(updatedUser)
          } else {
            setUser({ ...authUser, ...userInfo })
          }
        }}
      />
    )
  }

  const isAuditor = user.role === 'AUDITOR'
  const isAdmin = user.role === 'ADMIN'

  const handleLogout = () => {
    try {
      localStorage.removeItem('app.active')
      localStorage.removeItem('audit.activeAuditId')
      localStorage.removeItem('audit.activeBlockId')
      localStorage.removeItem('audit.activeGroupId')
      localStorage.removeItem('audit.activeSubdivisionId')
    } catch { /* noop */ }
    setAuthUser(null)
    setUser(null)
    setActive('home')
  }

  // --- ADMIN CONTENT RENDERER ---
  const renderAdminContent = () => {
    if (active === 'home') return (
      <AdminDashboard 
        auditorStatusMap={auditorStatusMap}
      />
    )
    if (active === 'orgManagement') return (
      <AdminOrgManagement 
        orgs={orgs} 
        setOrgs={setOrgs} 
        customers={customers} 
        setCustomers={setCustomers}
        statusMap={statusMap}
        commentMap={commentMap}
        auditorStatusMap={auditorStatusMap}
        auditorCommentMap={auditorCommentMap}
        valueMap={valueMap}
        setValueMap={setValueMap}
        openCreateUser={() => setActive('createUser')}
      />
    )
    if (active === 'userManagement') return (
      <AdminUserManagement 
        customers={customers} 
        auditors={auditors} 
        setCustomers={setCustomers}
        setAuditors={setAuditors}
        assignments={assignments}
        statusMap={statusMap}
        setStatusMap={setStatusMap}
        commentMap={commentMap}
        setCommentMap={setCommentMap}
        valueMap={valueMap}
        setValueMap={setValueMap}
        auditorStatusMap={auditorStatusMap}
        setAuditorStatusMap={setAuditorStatusMap}
        auditorCommentMap={auditorCommentMap}
        setAuditorCommentMap={setAuditorCommentMap}
      />
    )
    if (active === 'createUser') return (
      <AdminCreateUser onBack={() => setActive('userManagement')} />
    )
    if (active === 'assignments') return <AdminAssignment orgs={orgs} auditors={auditors} assignments={assignments} setAssignments={setAssignments} />
    if (active === 'auditRegistry') return (
      <AdminAuditDataRegistry 
        orgs={orgs} 
        customers={customers} 
        auditors={auditors}
        statusMap={statusMap}
        commentMap={commentMap}
        valueMap={valueMap}
        auditorStatusMap={auditorStatusMap}
        auditorCommentMap={auditorCommentMap}
      />
    )
    if (active === 'settings') return (
      <AdminSettings 
        currentUser={authUser}
        admins={admins}
        setAdmins={setAdmins}
        onLogout={handleLogout}
      />
    )
    return <AdminDashboard />
  }

  // --- AUDITOR CONTENT RENDERER ---
  const renderAuditorContent = () => {
    if (active === 'home') {
      return (
        <AuditorDashboard 
          user={user}
          assignments={assignments}
          onStartAudit={(groupId, subId, orgId, blockId) => {
          const asg = assignments.find(a => 
              (a.orgId === orgId || a.org_id === orgId) && 
              (a.blockId === blockId || a.block_id === blockId)
            )
            if (!asg) {
              console.error("Assignment not found for:", { groupId, subId, orgId, blockId })
              return
            }
            const auditId = asg.audit_id || asg.id
            if (!auditId) {
              console.error("No auditId found in assignment:", asg)
              return
            }
          setAuditorActiveOrgId(asg.org_id)
          enterAudit(auditId, asg.block_id, groupId, subId)
          }} 
          orgs={orgs}
        />
      )
    }
    if (active === 'auditorAssessment') {
      const asg = assignments.find(a => (a.auditId === auditContext.auditId || a.id === auditContext.auditId || a.assignment_id === auditContext.auditId)) || null
      const activeOrg = (
        orgs.find(o => o.id === (auditorActiveOrgId || (asg?.orgId || asg?.org_id))) ||
        orgs.find(o => o.name === (auditorActiveOrgId || asg?.org_name)) ||
        null
      )
      const effectiveOrgName = activeOrg ? activeOrg.name : (asg?.org_name || 'Unknown Organization')
      return (
        <AuditorAssessment 
          key={`${auditContext.auditId}-${auditContext.blockId}`}
          groupId={auditContext.groupId}
          subdivisionId={auditContext.subdivisionId}
          blockId={auditContext.blockId}
          auditId={auditContext.auditId}
          orgName={effectiveOrgName}
          orgData={activeOrg}
          onBack={() => setActive('home')}
          auditorStatusMap={auditorStatusMap}
          setAuditorStatusMap={setAuditorStatusMap}
          auditorCommentMap={auditorCommentMap}
          setAuditorCommentMap={setAuditorCommentMap}
          statusMap={statusMap}
          commentMap={commentMap}
          valueMap={valueMap}
        />
      )
    }
    return (
      <AuditorDashboard 
        user={user}
        assignments={assignments}
        onStartAudit={(groupId, subId, orgId, blockId) => {
          const asg = assignments.find(a => 
            (a.orgId === orgId || a.org_id === orgId) && 
            (a.blockId === blockId || a.block_id === blockId) && 
            ((a.auditorId || a.auditor_id) === user.id)
          )
          if (!asg) {
            console.error("Assignment not found for:", { groupId, subId, orgId, blockId })
            return
          }
          const auditId = asg.audit_id || asg.id
          if (!auditId) {
            console.error("No auditId found in assignment:", asg)
            return
          }
          setAuditorActiveOrgId(asg.org_id || orgId)
          enterAudit(auditId, asg.block_id || blockId, groupId, subId)
        }} 
        orgs={orgs}
      />
    )
  }

  // Determine Customer's Allowed Group
  const customerOrg = user?.role === 'CUSTOMER' 
    ? (user?.orgId ? orgs.find(o => o.id === user.orgId) : orgs.find(o => o.name === user.organizationName)) 
    : null
  const customerAllowedGroup = customerOrg ? RECORD_GROUPS.find(g => g.label === customerOrg.type) : null
  const customerAllowedSubdivision = (() => {
    if (!customerOrg) return null
    const sub = customerOrg.subdivision
    if (Array.isArray(sub)) {
      const cleaned = sub
        .map(s => (customerAllowedGroup?.id === 'C' && s === 'C-1') ? 'C-2' : s)
        .filter(Boolean)
      return cleaned
    } else {
      if (customerAllowedGroup?.id === 'C' && sub === 'C-1') return ['C-2']
      return sub ? [sub] : []
    }
  })()

  // --- MAIN RENDER ---
  try { console.log("APP STATE:", active, auditContext) } catch (e) { void e }
  return (
    <div className="app-shell">
      <Sidebar active={active} onChange={setActive} role={user?.role} />
      <div className="app-main">
        <TopHeader
          title={
            isAdmin 
              ? (active === 'home' ? 'Admin Dashboard' : active === 'orgManagement' ? 'Organization Management' : active === 'userManagement' ? 'User Management' : active === 'auditRegistry' ? 'Audit Data Registry' : active === 'settings' ? 'Settings' : 'Assignments')
              : isAuditor 
                ? (active === 'home' ? 'Auditor Dashboard' : 'Auditor Assessment')
                : (active === 'home' ? 'Fire and Life Safety Audit' : 'Fire Safety Audit')
          }
          subtitle={isAdmin && active !== 'settings' ? 'Manage system, users, and organizations.' : ''}
          meta={active === 'home' ? undefined : user}
          user={user}
          onLogout={handleLogout}
          onSettings={() => setActive('settings')}
        />
        <InactivityTimeout onTimeout={handleLogout} minutes={30} />
        
        {isAdmin ? renderAdminContent() : isAuditor ? renderAuditorContent() : (
          <>
            {active === 'home' && <HomePage user={user} />}
            {active === 'fireSafetyAudits' && (
              <FireSafetyAuditSummary 
                user={user}
                orgs={orgs}
                statusMap={statusMap} 
                commentMap={commentMap}
                valueMap={valueMap}
                auditorStatusMap={auditorStatusMap}
                auditorCommentMap={auditorCommentMap}
                allowedGroup={customerAllowedGroup}
                allowedSubdivision={customerAllowedSubdivision}
                assignments={assignments}
                auditors={auditors}
              />
            )}
            {active === 'recordAssessments' && (
              <RecordAssessments
                allowedGroup={customerAllowedGroup}
                allowedSubdivision={customerAllowedSubdivision}
                groupId={assessmentGroupId}
                subdivisionId={assessmentSubdivisionId}
                onChangeGroup={setAssessmentGroupId}
                onChangeSubdivision={setAssessmentSubdivisionId}
                statusMap={statusMap}
                setStatusMap={setStatusMap}
                commentMap={commentMap}
                setCommentMap={setCommentMap}
                valueMap={valueMap}
                setValueMap={setValueMap}
                logActivity={logActivity}
                user={user}
                auditorStatusMap={auditorStatusMap}
                auditorCommentMap={auditorCommentMap}
                assignments={assignments}
              />
            )}
            {active === 'closeAuditObservations' && (
              <ErrorBoundary>
                <CloseObservationsPage
                  allowedGroup={customerAllowedGroup}
                  allowedSubdivision={customerAllowedSubdivision}
                  groupId={assessmentGroupId}
                  statusMap={statusMap}
                  setStatusMap={setStatusMap}
                  commentMap={commentMap}
                  auditorStatusMap={auditorStatusMap}
                  setAuditorStatusMap={setAuditorStatusMap}
                  auditorCommentMap={auditorCommentMap}
                  setAuditorCommentMap={setAuditorCommentMap}
                  user={user}
                  assignments={assignments}
                />
              </ErrorBoundary>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
