// Mock Data for Auth and Admin Management

export const INITIAL_ADMINS = [
  { username: 'admin', password: 'password123', role: 'Admin', name: 'System Admin' }
]

export const INITIAL_CUSTOMERS = [
  { 
    id: 'c1',
    username: 'cust_demo', 
    password: 'password123', 
    role: 'Customer', 
    name: 'Demo Customer',
    orgId: 'org1',
    organizationName: 'Demo Corp',
    createdOn: '2024-01-20T10:00:00.000Z'
  },
  {
    id: 'c2',
    username: 'cust_cmc',
    password: 'password123',
    role: 'Customer',
    name: 'CMC Admin',
    orgId: 'org2',
    organizationName: 'CMC',
    createdOn: '2024-01-22T09:00:00.000Z'
  },
  {
    id: 'c3',
    username: 'cust_qwert',
    password: 'password123',
    role: 'Customer',
    name: 'qwert Admin',
    orgId: 'org3',
    organizationName: 'qwert',
    createdOn: '2024-01-22T09:30:00.000Z'
  },
  {
    id: 'c4',
    username: 'cust_youtube',
    password: 'password123',
    role: 'Customer',
    name: 'youtube Admin',
    orgId: 'org4',
    organizationName: 'youtube',
    createdOn: '2024-01-22T10:14:00.000Z'
  }
]

export const INITIAL_AUDITORS = [
  { 
    id: 'a1',
    username: 'aud_demo', 
    password: 'password123', 
    role: 'Auditor', 
    name: 'Demo Auditor',
    email: 'auditor@demo.com',
    status: 'Active'
  },
  {
    id: 'a2',
    username: 'aud_cmc',
    password: 'password123',
    role: 'Auditor',
    name: 'CMC Auditor',
    email: 'auditor_cmc@demo.com',
    status: 'Active'
  }
]

export const INITIAL_ORGS = [
  {
    id: 'org1',
    name: 'Demo Corp',
    type: 'Group D – Assembly',
    subdivision: 'D-1',
    address: '123 Business Rd',
    blockCount: 2,
    status: 'Active',
    customerId: 'c1',
    createdOn: '2024-01-20T10:00:00.000Z'
  },
  {
    id: 'org2',
    name: 'CMC',
    type: 'Group A – Residential',
    subdivision: 'A-1',
    address: '456 Tech Park',
    blockCount: 3,
    status: 'Active',
    customerId: 'c2',
    createdOn: '2024-01-22T09:00:00.000Z'
  },
  {
    id: 'org3',
    name: 'qwert',
    type: 'Group B – Educational',
    subdivision: 'B-1',
    address: '789 Edu Lane',
    blockCount: 1,
    status: 'Active',
    customerId: 'c3',
    createdOn: '2024-01-22T09:30:00.000Z'
  },
  {
    id: 'org4',
    name: 'youtube',
    type: 'Group C – Institutional',
    subdivision: 'C-1',
    address: '101 Video St',
    blockCount: 1,
    status: 'Active',
    customerId: 'c4',
    createdOn: '2024-01-22T10:14:00.000Z'
  }
]

export const INITIAL_ASSIGNMENTS = [
  {
    id: 'asg1',
    orgId: 'org1',
    groupId: 'D',
    subdivisionId: 'D-1',
    auditorId: 'a1'
  }
]
