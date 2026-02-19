import React, { useState, useEffect, useMemo } from 'react'
import { RECORD_GROUPS } from '../config/groups'
import { getQuestions } from '../config/questionBanks'
import { ORGANIZATION_SECTIONS, ORGANIZATION_PARTS, SECTION_FIELDS, ORG_FIELD_LABELS, DEFAULT_ORG_DATA } from '../config/orgDetailsConfig'
import { computePercentage } from '../utils/scoring'
import BuildingDetailsTable from './BuildingDetailsTable'
import LandmarksApproachTable from './LandmarksApproachTable'
import MainPowerSupplyTable from './MainPowerSupplyTable'
import StandbyPowerSupplyTable from './StandbyPowerSupplyTable'
import { auth } from '../firebase'
import { resolveOrgId } from '../services/apiService'

// --- CONSTANTS & DEFAULTS ---
// Moved to config/orgDetailsConfig.js


// --- SUB-COMPONENTS ---

function YearEstablishmentTable({ localData, updateField, commitField }) {
  return (
    <div>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Type of Building</td>
              <td style={{ padding: '10px 12px' }}>
                <input type="text" defaultValue={localData.year_type || ''} placeholder="NA" onChange={e => updateField('year_type', e.target.value)} onBlur={e => commitField('year_type', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Ownership Type (rented, leased, partially owned)</td>
              <td style={{ padding: '10px 12px' }}>
                <input type="text" defaultValue={localData.year_ownership || ''} placeholder="NA" onChange={e => updateField('year_ownership', e.target.value)} onBlur={e => commitField('year_ownership', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Total Manpower (Employees, Contractors)</td>
              <td style={{ padding: '10px 12px' }}>
                <input type="text" defaultValue={localData.year_manpower || ''} placeholder="NA" onChange={e => updateField('year_manpower', e.target.value)} onBlur={e => commitField('year_manpower', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Total No of Buildings</td>
              <td style={{ padding: '10px 12px' }}>
                <input type="text" defaultValue={localData.year_total_buildings || ''} placeholder="NA" onChange={e => updateField('year_total_buildings', e.target.value)} onBlur={e => commitField('year_total_buildings', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Total No of Departments</td>
              <td style={{ padding: '10px 12px' }}>
                <input type="text" defaultValue={localData.year_departments || ''} placeholder="NA" onChange={e => updateField('year_departments', e.target.value)} onBlur={e => commitField('year_departments', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Total Area</td>
              <td style={{ padding: '10px 12px' }}>
                <input type="text" defaultValue={localData.year_total_area || ''} placeholder="NA" onChange={e => updateField('year_total_area', e.target.value)} onBlur={e => commitField('year_total_area', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Built Up Area</td>
              <td style={{ padding: '10px 12px' }}>
                <input type="text" defaultValue={localData.year_built_up_area || ''} placeholder="NA" onChange={e => updateField('year_built_up_area', e.target.value)} onBlur={e => commitField('year_built_up_area', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '16px' }}>
        <BuildingDetailsTable
          building1Name={localData.year_b1_name}
          building1Height={localData.year_b1_height}
          building2Name={localData.year_b2_name}
          building2Height={localData.year_b2_height}
          noOfFloors={localData.year_no_floor}
          onChangeB1Name={v => updateField('year_b1_name', v)}
          onChangeB1Height={v => updateField('year_b1_height', v)}
          onChangeB2Name={v => updateField('year_b2_name', v)}
          onChangeB2Height={v => updateField('year_b2_height', v)}
          onChangeNoOfFloors={v => updateField('year_no_floor', v)}
          onCommitB1Name={v => commitField('year_b1_name', v)}
          onCommitB1Height={v => commitField('year_b1_height', v)}
          onCommitB2Name={v => commitField('year_b2_name', v)}
          onCommitB2Height={v => commitField('year_b2_height', v)}
          onCommitNoOfFloors={v => commitField('year_no_floor', v)}
          floorB1Height={localData.year_floor_b1_height}
          floorB2Name={localData.year_floor_b2_name}
          floorB2Height={localData.year_floor_b2_height}
          onChangeFloorB1Height={v => updateField('year_floor_b1_height', v)}
          onChangeFloorB2Name={v => updateField('year_floor_b2_name', v)}
          onChangeFloorB2Height={v => updateField('year_floor_b2_height', v)}
          onCommitFloorB1Height={v => commitField('year_floor_b1_height', v)}
          onCommitFloorB2Name={v => commitField('year_floor_b2_name', v)}
          onCommitFloorB2Height={v => commitField('year_floor_b2_height', v)}
        />
      </div>
    </div>
  )
}

function SummaryDashboard({ statusMap, commentMap, blocks, organizationData, allowedGroup, allowedSubdivision }) {
  const stats = useMemo(() => {
    // Helper to find group info by section/subdivision ID
    const subIdToGroupMap = {}
    RECORD_GROUPS.forEach(group => {
      group.subdivisions.forEach(sub => {
        subIdToGroupMap[sub.id] = {
          groupId: group.id,
          groupLabel: group.label,
          subLabel: sub.label
        }
      })
    })

    // 1. Initialize Aggregators
    let totalGaps = 0
    let totalAnswered = 0

    // Section Aggregates for "Status by Section"
    const sectionAggregates = {}

    // Block Stats Calculation
    const blockStats = blocks.map(block => {
      let blockTotal = 0
      let blockCompliant = 0
      let blockNotRelevant = 0
      let blockAnswered = 0

      const blockSections = block.sections || []

      blockSections.forEach(sectionId => {
        const groupInfo = subIdToGroupMap[sectionId]
        if (groupInfo) {
          // Filter by allowed group if present
          if (allowedGroup && groupInfo.groupId !== allowedGroup.id) return
          const allowedList = Array.isArray(allowedSubdivision) ? allowedSubdivision : (allowedSubdivision ? [allowedSubdivision] : [])
          if (allowedList.length > 0 && !allowedList.includes(sectionId)) return

          const questions = getQuestions(groupInfo.groupId, sectionId)
          
          if (!sectionAggregates[sectionId]) {
            sectionAggregates[sectionId] = {
              label: groupInfo.subLabel,
              total: 0,
              inPlace: 0,
              notRelevant: 0,
              answered: 0
            }
          }
          const sectionStat = sectionAggregates[sectionId]

          questions.forEach(q => {
            const status = statusMap[q.id]
            if (status) {
              blockAnswered++
              sectionStat.answered++
            }
            
            blockTotal++
            sectionStat.total++

            if (status === 'in_place') {
              blockCompliant++
              sectionStat.inPlace++
            } else if (status === 'not_relevant') {
              blockNotRelevant++
              sectionStat.notRelevant++
            } 
          })
        }
      })

      const relevantTotal = blockTotal - blockNotRelevant
      const percentage = relevantTotal > 0 ? (blockCompliant / relevantTotal) * 100 : 0

      return {
        label: block.name || 'Unknown Block',
        value: parseFloat(percentage.toFixed(1)),
        hasData: blockAnswered > 0,
        answered: blockAnswered,
        total: relevantTotal
      }
    })

    // GLOBAL STATS CALCULATION (Dynamic fallback if no blocks, or hybrid)
    totalGaps = 0
    totalAnswered = 0

    RECORD_GROUPS.forEach(group => {
      // Filter by allowed group if present
      if (allowedGroup && group.id !== allowedGroup.id) return

      group.subdivisions.forEach(sub => {
        const allowedList = Array.isArray(allowedSubdivision) ? allowedSubdivision : (allowedSubdivision ? [allowedSubdivision] : [])
        if (allowedList.length > 0 && !allowedList.includes(sub.id)) return

        const questions = getQuestions(group.id, sub.id)
        questions.forEach(q => {
          const status = statusMap[q.id]
          
          if (status) {
            totalAnswered++
            if (status === 'not_in_place' || status === 'partial') totalGaps++
          }
        })
      })
    })

    // Calculate Global Percentage using 5/3/0 with NA excluded
    const allStatuses = []
    RECORD_GROUPS.forEach(group => {
      if (allowedGroup && group.id !== allowedGroup.id) return
      group.subdivisions.forEach(sub => {
        const allowedList = Array.isArray(allowedSubdivision) ? allowedSubdivision : (allowedSubdivision ? [allowedSubdivision] : [])
        if (allowedList.length > 0 && !allowedList.includes(sub.id)) return
        const questions = getQuestions(group.id, sub.id)
        questions.forEach(q => {
          const st = statusMap[q.id]
          if (st) allStatuses.push(st)
        })
      })
    })
    const percentage = computePercentage(allStatuses)

    // Format Section Status List
    if (Object.keys(sectionAggregates).length === 0) {
      RECORD_GROUPS.forEach(group => {
        // Filter by allowed group if present
        if (allowedGroup && group.id !== allowedGroup.id) return

        group.subdivisions.forEach(sub => {
          const allowedList = Array.isArray(allowedSubdivision) ? allowedSubdivision : (allowedSubdivision ? [allowedSubdivision] : [])
          if (allowedList.length > 0 && !allowedList.includes(sub.id)) return

          const questions = getQuestions(group.id, sub.id)
          let hasAnswer = false
          const currentStat = {
            label: sub.label,
            total: 0,
            inPlace: 0,
            notRelevant: 0,
            answered: 0
          }
          
          questions.forEach(q => {
            currentStat.total++
            const status = statusMap[q.id]
            if (status) {
              hasAnswer = true
              currentStat.answered++
              if (status === 'in_place') currentStat.inPlace++
              else if (status === 'not_relevant') currentStat.notRelevant++
            }
          })

          if (hasAnswer) {
            sectionAggregates[sub.id] = currentStat
          }
        })
      })
    }

    const sectionStatusList = Object.entries(sectionAggregates)
      .map(([subId, stat]) => {
        const group = RECORD_GROUPS.find(g => g.subdivisions.some(s => s.id === subId))
        const subdivision = group ? group.subdivisions.find(s => s.id === subId) : null
        const qs = group ? getQuestions(group.id, subId) : []
        const statuses = qs.map(q => statusMap[q.id]).filter(Boolean)
        const pct = computePercentage(statuses)
        return {
          label: subdivision ? subdivision.label : stat.label,
          value: pct,
          answered: stat.answered,
          total: stat.total
        }
      })

    // Count Observations
    const totalObservations = commentMap ? Object.values(commentMap).filter(c => c && c.trim().length > 0).length : 0

    return {
      percentage: parseFloat(percentage.toFixed(1)),
      totalGaps,
      totalObservations,
      blockStatus: blockStats,
      sectionStatus: sectionStatusList,
      blocksDefined: blocks.length,
      hasAuditData: totalAnswered > 0
    }
  }, [statusMap, blocks, commentMap, allowedGroup, allowedSubdivision])

  const { percentage, totalObservations, blockStatus, sectionStatus, blocksDefined, hasAuditData } = stats
  
  const orgName = organizationData.gen_name ? organizationData.gen_name.toUpperCase() : ''
  const summaryTitle = orgName ? `FIRE SAFETY AUDIT SUMMARY - ${orgName}` : 'FIRE SAFETY AUDIT SUMMARY'

  const getProgressColor = (val) => {
    if (val >= 80) return '#10b981' // Green
    if (val >= 50) return '#f59e0b' // Orange
    return '#ef4444' // Red
  };


  return (
    <div className="summary-dashboard">
      <div className="summary-top-section">
        <div className="gauge-card">
          <svg className="gauge-svg" viewBox="0 0 200 120">
            <path className="gauge-bg" d="M 20 100 A 80 80 0 0 1 180 100" />
            <path
              className="gauge-arc"
              d="M 20 100 A 80 80 0 0 1 180 100"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 * (1 - percentage / 100)}
            />
            <line
              className="gauge-needle"
              x1="100" y1="100" x2="160" y2="100"
              transform={`rotate(${-180 + percentage * 1.8} 100 100)`}
            />
            <text x="100" y="90" className="gauge-text">
              {hasAuditData ? `${percentage}%` : '0%'}
            </text>
          </svg>
        </div>

        <div className="kpi-cards">
          <div className="kpi-card">
            <div>
              <div className="kpi-label">BLOCKS</div>
              <div className="kpi-value">{blocksDefined}</div>
            </div>
            <div className="kpi-subtext">DEFINED</div>
          </div>
          <div className="kpi-card">
            <div>
              <div className="kpi-label">OBSERVATIONS</div>
              <div className="kpi-value">{totalObservations}</div>
            </div>
            <div className="kpi-subtext">RECORDED</div>
          </div>
          
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
         <h2 className="summary-title" style={{ margin: 0 }}>{summaryTitle}</h2>
      </div>

      <div className="summary-grid">
        {/* Status by Block */}
        <div className="summary-col">
          <h3 className="summary-section-title">STATUS BY BLOCK</h3>
          {blocksDefined > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {blockStatus.map((item, index) => (
                <div key={index} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: getProgressColor(item.value), fontSize: '14px' }}>{item.value}%</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${item.value}%`, background: getProgressColor(item.value), height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
                    {item.hasData ? 'Audit in progress' : 'No data yet'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏗️</div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>No blocks defined yet</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Go to "Block Details" tab to add blocks</div>
            </div>
          )}
        </div>

        {/* Status by Section */}
        <div className="summary-col">
          <h3 className="summary-section-title">STATUS BY SECTION</h3>
          {hasAuditData ? (
            sectionStatus.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sectionStatus.map((item, index) => (
                  <div key={index} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>{item.label}</span>
                      <span style={{ fontWeight: 700, color: getProgressColor(item.value), fontSize: '14px' }}>{item.value}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.value}%`, background: getProgressColor(item.value), height: '100%', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>No active sections found</div>
              </div>
            )
          ) : (
            <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>No audit data available</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Start answering questions in "Record Assessments"</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InputRow({ label, value, onChange, onCommit, placeholder, sr }) {
  const [v, setV] = React.useState(value || '')
  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      setV(value)
    }
  }, [value])
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
      <div style={{ width: sr ? '10%' : '0%', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
        {sr ? `(${sr})` : ''}
      </div>
      <div style={{ width: sr ? '30%' : '40%', fontSize: '14px', fontWeight: 500, color: '#334155' }}>{label}</div>
      <div style={{ width: sr ? '60%' : '60%' }}>
        <input
          type="text"
          value={v}
          onChange={e => {
            const next = e.target.value
            setV(next)
            if (onChange) onChange(next)
          }}
          onBlur={() => {
            if (onCommit) onCommit(v)
          }}
          placeholder={placeholder}
          style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px', fontSize: '14px' }}
        />
      </div>
    </div>
  )
}

function ACSystemTable({ localData, updateField, commitField }) {
  const bandCell = { border: '1px solid #e2e8f0', padding: '10px', fontWeight: 700, textAlign: 'center', width: '60px', color: '#334155' }
  const labelCell = { border: '1px solid #e2e8f0', padding: '10px 12px', fontWeight: 600, color: '#334155' }
  const valueCell = { border: '1px solid #e2e8f0', padding: '10px 12px' }
  const inputStyle = { width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }
  return (
    <div>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'transparent' }}>
              <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
              <th style={{ ...labelCell, width: '40%' }}>Particulars</th>
              <th style={{ ...labelCell, width: '25%' }}>Number</th>
              <th style={{ ...labelCell, width: '25%' }}>Not Applicable</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={bandCell}>(a)</td>
              <td style={labelCell}>Air Handling Unit</td>
              <td style={valueCell}>
                <input type="text" value={localData.ac_ahu || ''} placeholder="NA" onChange={e => updateField('ac_ahu', e.target.value)} onBlur={e => commitField('ac_ahu', e.target.value)} style={inputStyle} />
              </td>
              <td style={valueCell}>
                <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
              </td>
            </tr>
            <tr>
              <td style={bandCell}>(b)</td>
              <td style={labelCell}>Centralised AC</td>
              <td style={valueCell}>
                <input type="text" value={localData.ac_central || ''} placeholder="NA" onChange={e => updateField('ac_central', e.target.value)} onBlur={e => commitField('ac_central', e.target.value)} style={inputStyle} />
              </td>
              <td style={valueCell}>
                <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
              </td>
            </tr>
            <tr>
              <td style={bandCell}>(c)</td>
              <td style={labelCell}>Window AC</td>
              <td style={valueCell}>
                <input type="text" value={localData.ac_window || ''} placeholder="NA" onChange={e => updateField('ac_window', e.target.value)} onBlur={e => commitField('ac_window', e.target.value)} style={inputStyle} />
              </td>
              <td style={valueCell}>
                <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
              </td>
            </tr>
            <tr>
              <td style={bandCell}>(d)</td>
              <td style={labelCell}>Split AC</td>
              <td style={valueCell}>
                <input type="text" value={localData.ac_split || ''} placeholder="NA" onChange={e => updateField('ac_split', e.target.value)} onBlur={e => commitField('ac_split', e.target.value)} style={inputStyle} />
              </td>
              <td style={valueCell}>
                <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DocumentsListSection() {
  const bandCell = { border: '1px solid #e2e8f0', padding: '10px', fontWeight: 700, textAlign: 'center', width: '60px', color: '#334155' }
  const labelCell = { border: '1px solid #e2e8f0', padding: '10px 12px', fontWeight: 600, color: '#334155' }
  const docs = [
    'Factories license/ Shops and Establishment Copy',
    'Occupier details',
    'CFO & CFE',
    'Fire NOC',
    'Electrical board approvals',
    'Structural stability certificate',
    'Building information including layout',
    'Third party certificates of earthing pits, lighting arrestor',
    'Emergency response plans',
    'Evacuation layout',
    'Calibration certificates of all pressure gauges & instruments',
    'Maintenance, inspection & Test records of fire alarm systems, fire hydrants, fire extinguishers, fire pump house',
    'Maintenance and inspection records of HVAC units',
    'Mock drill records',
    'Fire safety training records'
  ]
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: 'transparent' }}>
            <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
            <th style={{ ...labelCell, width: '80%' }}>Document</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d, idx) => (
            <tr key={idx}>
              <td style={bandCell}>{idx + 1}</td>
              <td style={labelCell}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
function OrganizationDetails({ data, onUpdate, jumpToSection, orgId, auditId }) {
  const partI = ORGANIZATION_PARTS.find(p => p.id === 'part_i')
  const partII = ORGANIZATION_PARTS.find(p => p.id === 'part_ii')
  const partIII = ORGANIZATION_PARTS.find(p => p.id === 'part_iii')
  const partISectionIds = partI ? partI.sections : []
  const partIISectionIds = partII ? partII.sections : []
  const partIIISectionIds = partIII ? partIII.sections : []
  const partISections = partISectionIds.map(id => ORGANIZATION_SECTIONS.find(s => s.id === id)).filter(Boolean)
  const partIISections = partIISectionIds.map(id => ORGANIZATION_SECTIONS.find(s => s.id === id)).filter(Boolean)
  const partIIISections = partIIISectionIds.map(id => ORGANIZATION_SECTIONS.find(s => s.id === id)).filter(Boolean)
  const [activeSection, setActiveSection] = useState(() => partISectionIds[0] || 'general')
  const [localData, setLocalData] = useState(data)
  const CUSTOMER_LOCKED = false
  useEffect(() => {
    setLocalData(data)
  }, [data])
  useEffect(() => {
    if (jumpToSection) {
      setActiveSection(jumpToSection)
    }
  }, [jumpToSection])
  useEffect(() => {
    ;(async () => {
      try {
        if (!auditId) return
        const token = await auth.currentUser?.getIdToken?.()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const res = await fetch(`${BASE_URL}/org-responses/building-details/list?audit_id=${encodeURIComponent(auditId)}`, {
          method: 'GET',
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined
          }
        })
        if (res.ok) {
          const payload = await res.json()
          const merged = payload?.fields || {}
          if (merged && Object.keys(merged).length > 0) {
            setLocalData(prev => ({ ...(prev || {}), ...merged }))
            if (typeof onUpdate === 'function') {
              onUpdate(prev => ({ ...(prev || {}), ...merged }))
            }
          }
        }
      } catch { void 0 }
    })()
  }, [auditId, onUpdate])

  const updateField = (key, val) => {
    setLocalData(prev => ({ ...(prev || {}), [key]: val }))
    ;(async () => {
      try {
        if (!orgId) return
        const token2 = await auth.currentUser?.getIdToken?.()
        const BASE_URL2 = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        await fetch(`${BASE_URL2}/api/organizations/${encodeURIComponent(orgId)}/self-assessment/save`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token2 ? `Bearer ${token2}` : undefined
          },
          body: JSON.stringify({
            section: activeSection || 'general',
            field: key,
            value: val
          })
        })
        if (!auditId) return
        const token3 = await auth.currentUser?.getIdToken?.()
        const BASE_URL3 = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        await fetch(`${BASE_URL3}/org-responses/building-details/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token3 ? `Bearer ${token3}` : undefined
          },
          body: JSON.stringify({
            audit_id: auditId,
            org_id: orgId,
            sections: [{ section_id: activeSection || 'general', fields: { [key]: val } }]
          })
        })
      } catch { void 0 }
    })()
  }
  const commitField = (key, val) => {
    if (typeof onUpdate === 'function') {
      onUpdate(prev => ({ ...(prev || {}), [key]: val }))
    }
  }
  const handleSaveOrgDetails = async () => {
    try {
      
      if (!orgId) {
        alert('Organization not linked. Unable to save.')
        return
      }
      if (!auditId) {
        alert('Active audit not found for organization')
        return
      }
      const token = await auth.currentUser?.getIdToken?.()
      const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
      const sections = Object.keys(SECTION_FIELDS || {}).map(sectionId => {
        const keys = SECTION_FIELDS[sectionId] || []
        const fields = {}
        keys.forEach(k => { fields[k] = (localData && localData[k] !== undefined && localData[k] !== null) ? localData[k] : '' })
        return { section_id: sectionId, fields }
      })
      await fetch(`${BASE_URL}/org-responses/building-details/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined
        },
        body: JSON.stringify({ audit_id: auditId, org_id: orgId, sections })
      })
      alert('Organization details saved')
    } catch {
      alert('Failed to save organization details')
    }
  }
  
  const [activeConstructionSub, setActiveConstructionSub] = useState('A')

  const ACSystemTable = React.useMemo(() => function ACSystemTable({ localData, updateField, commitField }) {
    const bandCell = { border: '1px solid #e2e8f0', padding: '10px', fontWeight: 700, textAlign: 'center', width: '60px', color: '#334155' }
    const labelCell = { border: '1px solid #e2e8f0', padding: '10px 12px', fontWeight: 600, color: '#334155' }
    const valueCell = { border: '1px solid #e2e8f0', padding: '10px 12px' }
    const inputStyle = { width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }
    return (
      <div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'transparent' }}>
                <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
                <th style={{ ...labelCell, width: '40%' }}>Particulars</th>
                <th style={{ ...labelCell, width: '25%' }}>Number</th>
                <th style={{ ...labelCell, width: '25%' }}>Not Applicable</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={bandCell}>(a)</td>
                <td style={labelCell}>Air Handling Unit</td>
                <td style={valueCell}>
                  <input type="text" defaultValue={localData.ac_ahu || ''} placeholder="NA" onChange={e => updateField('ac_ahu', e.target.value)} onBlur={e => commitField('ac_ahu', e.target.value)} style={inputStyle} />
                </td>
                <td style={valueCell}>
                  <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
                </td>
              </tr>
              <tr>
                <td style={bandCell}>(b)</td>
                <td style={labelCell}>Centralised AC</td>
                <td style={valueCell}>
                  <input type="text" defaultValue={localData.ac_central || ''} placeholder="NA" onChange={e => updateField('ac_central', e.target.value)} onBlur={e => commitField('ac_central', e.target.value)} style={inputStyle} />
                </td>
                <td style={valueCell}>
                  <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
                </td>
              </tr>
              <tr>
                <td style={bandCell}>(c)</td>
                <td style={labelCell}>Window AC</td>
                <td style={valueCell}>
                  <input type="text" defaultValue={localData.ac_window || ''} placeholder="NA" onChange={e => updateField('ac_window', e.target.value)} onBlur={e => commitField('ac_window', e.target.value)} style={inputStyle} />
                </td>
                <td style={valueCell}>
                  <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
                </td>
              </tr>
              <tr>
                <td style={bandCell}>(d)</td>
                <td style={labelCell}>Split AC</td>
                <td style={valueCell}>
                  <input type="text" defaultValue={localData.ac_split || ''} placeholder="NA" onChange={e => updateField('ac_split', e.target.value)} onBlur={e => commitField('ac_split', e.target.value)} style={inputStyle} />
                </td>
                <td style={valueCell}>
                  <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
    )
  }, [])

  const FireProtectionTables = React.useMemo(() => function FireProtectionTables({ localData, updateField, commitField }) {
    const [activeFireProtectionSub, setActiveFireProtectionSub] = useState('A')
    const bandCell = { border: '1px solid #e2e8f0', padding: '10px', fontWeight: 700, textAlign: 'center', width: '60px', color: '#334155' }
    const labelCell = { border: '1px solid #e2e8f0', padding: '10px 12px', fontWeight: 600, color: '#334155' }
    const valueCell = { border: '1px solid #e2e8f0', padding: '10px 12px' }
    const inputStyle = { width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(letter => (
            <button
              key={letter}
              onClick={() => setActiveFireProtectionSub(letter)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: activeFireProtectionSub === letter ? '#1e3a8a' : 'white',
                color: activeFireProtectionSub === letter ? 'white' : '#334155',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer'
              }}
              title={
                letter === 'A' ? 'Fire Water Storage' :
                letter === 'B' ? 'Fire Pumping System' :
                letter === 'C' ? 'Hydrant System' :
                letter === 'D' ? 'Fire Detector Systems – Building' :
                letter === 'E' ? 'Gas Detector Systems' :
                letter === 'F' ? 'LPG Detector Systems' :
                letter === 'G' ? 'Sprinkler Systems' :
                'Fire Extinguishers'
              }
            >
              {letter}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 800, color: '#334155' }}>
          {activeFireProtectionSub === 'A' && 'A. Fire Water Storage'}
          {activeFireProtectionSub === 'B' && 'B. Fire Pumping System'}
          {activeFireProtectionSub === 'C' && 'C. Hydrant System'}
          {activeFireProtectionSub === 'D' && 'D. Fire Detector Systems – Building'}
          {activeFireProtectionSub === 'E' && 'E. Gas Detector Systems'}
          {activeFireProtectionSub === 'F' && 'F. LPG Detector Systems'}
          {activeFireProtectionSub === 'G' && 'G. Sprinkler Systems'}
          {activeFireProtectionSub === 'H' && 'H. Fire Extinguishers'}
        </div>
        {activeFireProtectionSub === 'A' && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
                  <th style={{ ...labelCell, width: '50%' }}>Type of Tank</th>
                  <th style={{ ...labelCell, width: '20%' }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={bandCell}>(a)</td>
                  <td style={labelCell}>Underground Water Tanks (Fire)</td>
                  <td style={valueCell}>
                    <input type="text" defaultValue={localData.water_ug_qty || ''} placeholder="NA" onChange={e => updateField('water_ug_qty', e.target.value)} onBlur={e => commitField('water_ug_qty', e.target.value)} style={inputStyle} />
                  </td>
                </tr>
                <tr>
                  <td style={bandCell}>(b)</td>
                  <td style={labelCell}>Terrace Water Tanks (Fire)</td>
                  <td style={valueCell}>
                    <input type="text" defaultValue={localData.water_terrace_qty || ''} placeholder="NA" onChange={e => updateField('water_terrace_qty', e.target.value)} onBlur={e => commitField('water_terrace_qty', e.target.value)} style={inputStyle} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {activeFireProtectionSub === 'B' && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
                  <th style={{ ...labelCell, width: '20%' }}>Type of Pumps</th>
                  <th style={{ ...labelCell, width: '13%' }}>Capacity</th>
                  <th style={{ ...labelCell, width: '13%' }}>Size of Head</th>
                  <th style={{ ...labelCell, width: '10%' }}>RPM</th>
                  <th style={{ ...labelCell, width: '14%' }}>Make</th>
                  <th style={{ ...labelCell, width: '10%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'main', label: 'Main Fire Pump' },
                  { key: 'diesel', label: 'Diesel Fire Pump' },
                  { key: 'sprinkler', label: 'Sprinkler Pump' },
                  { key: 'jockey', label: 'Jockey Pump' },
                  { key: 'booster', label: 'Booster Pump' }
                ].map((p, idx) => (
                  <tr key={p.key}>
                    <td style={bandCell}>{String.fromCharCode(97 + idx)}</td>
                    <td style={labelCell}>{p.label}</td>
                    <td style={valueCell}>
                      <input type="text" defaultValue={localData[`pump_${p.key}_cap`] || ''} placeholder="NA" onChange={e => updateField(`pump_${p.key}_cap`, e.target.value)} onBlur={e => commitField(`pump_${p.key}_cap`, e.target.value)} style={inputStyle} />
                    </td>
                    <td style={valueCell}>
                      <input type="text" defaultValue={localData[`pump_${p.key}_head`] || ''} placeholder="NA" onChange={e => updateField(`pump_${p.key}_head`, e.target.value)} onBlur={e => commitField(`pump_${p.key}_head`, e.target.value)} style={inputStyle} />
                    </td>
                    <td style={valueCell}>
                      <input type="text" defaultValue={localData[`pump_${p.key}_rpm`] || ''} placeholder="NA" onChange={e => updateField(`pump_${p.key}_rpm`, e.target.value)} onBlur={e => commitField(`pump_${p.key}_rpm`, e.target.value)} style={inputStyle} />
                    </td>
                    <td style={valueCell}>
                      <input type="text" defaultValue={localData[`pump_${p.key}_make`] || ''} placeholder="NA" onChange={e => updateField(`pump_${p.key}_make`, e.target.value)} onBlur={e => commitField(`pump_${p.key}_make`, e.target.value)} style={inputStyle} />
                    </td>
                    <td style={valueCell}>
                      <input type="text" defaultValue={localData[`pump_${p.key}_status`] || ''} placeholder="NA" onChange={e => updateField(`pump_${p.key}_status`, e.target.value)} onBlur={e => commitField(`pump_${p.key}_status`, e.target.value)} style={inputStyle} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeFireProtectionSub === 'C' && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
                  <th style={{ ...labelCell, width: '45%' }}>Type of Hydrants</th>
                  <th style={{ ...labelCell, width: '20%' }}>Quantity</th>
                  <th style={{ ...labelCell, width: '20%' }}>Not Applicable</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'wet', label: 'Wet Riser' },
                  { key: 'dry', label: 'Dry Riser' },
                  { key: 'down', label: 'Down Comer' },
                  { key: 'hose_reel', label: 'Hose Reels' },
                  { key: 'box_s', label: 'Hose Box (Single)' },
                  { key: 'box_d', label: 'Hose Box (Double)' },
                  { key: 'landing', label: 'Landing Valves' },
                  { key: 'yard', label: 'Yard Hydrants' },
                  { key: 'monitor', label: 'Fire Monitors' }
                ].map((h, idx) => (
                  <tr key={h.key}>
                    <td style={bandCell}>{String.fromCharCode(97 + idx)}</td>
                    <td style={labelCell}>{h.label}</td>
                    <td style={valueCell}>
                      <input type="text" defaultValue={localData[`hyd_${h.key}`] || ''} placeholder="NA" onChange={e => updateField(`hyd_${h.key}`, e.target.value)} onBlur={e => commitField(`hyd_${h.key}`, e.target.value)} style={inputStyle} />
                    </td>
                    <td style={valueCell}>
                    <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeFireProtectionSub === 'D' && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
                  <th style={{ ...labelCell, width: '40%' }}>Type of Detectors</th>
                  <th style={{ ...labelCell, width: '20%' }}>Quantity</th>
                  <th style={{ ...labelCell, width: '20%' }}>Not Applicable</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'smoke', label: 'Smoke Detectors' },
                  { key: 'heat', label: 'Heat Detectors' },
                  { key: 'alarm', label: 'Fire Alarms' },
                  { key: 'mcp', label: 'Manual Call Points' }
                ].map((d, idx) => (
                  <tr key={d.key}>
                    <td style={bandCell}>{String.fromCharCode(97 + idx)}</td>
                    <td style={labelCell}>{d.label}</td>
                    <td style={valueCell}>
                      <input type="text" defaultValue={localData[`det_${d.key}`] || ''} placeholder="NA" onChange={e => updateField(`det_${d.key}`, e.target.value)} onBlur={e => commitField(`det_${d.key}`, e.target.value)} style={inputStyle} />
                    </td>
                    <td style={valueCell}>
                    <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeFireProtectionSub === 'E' && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ ...labelCell, width: '60%' }}>Gas Detector Systems</th>
                  <th style={{ ...labelCell, width: '20%' }}>Quantity</th>
                  <th style={{ ...labelCell, width: '20%' }}>Not Applicable</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={labelCell}>Gas Detector Systems</td>
                  <td style={valueCell}>
                    <input type="text" defaultValue={localData.det_gas || ''} placeholder="NA" onChange={e => updateField('det_gas', e.target.value)} onBlur={e => commitField('det_gas', e.target.value)} style={inputStyle} />
                  </td>
                  <td style={valueCell}>
                    <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {activeFireProtectionSub === 'F' && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ ...labelCell, width: '60%' }}>LPG Detector Systems</th>
                  <th style={{ ...labelCell, width: '20%' }}>Quantity</th>
                  <th style={{ ...labelCell, width: '20%' }}>Not Applicable</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={labelCell}>LPG Detector Systems</td>
                  <td style={valueCell}>
                    <input type="text" defaultValue={localData.det_lpg || ''} placeholder="NA" onChange={e => updateField('det_lpg', e.target.value)} onBlur={e => commitField('det_lpg', e.target.value)} style={inputStyle} />
                  </td>
                  <td style={valueCell}>
                  <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {activeFireProtectionSub === 'G' && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
                  <th style={{ ...labelCell, width: '40%' }}>Type of Sprinklers</th>
                  <th style={{ ...labelCell, width: '20%' }}>Quantity</th>
                  <th style={{ ...labelCell, width: '20%' }}>Not Applicable</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'pendent', label: 'Pendent Type' },
                  { key: 'sidewall', label: 'Sidewall Type' },
                  { key: 'concealed', label: 'Concealed Type' },
                  { key: 'other', label: 'Others' }
                ].map((s, idx) => (
                  <tr key={s.key}>
                    <td style={bandCell}>{String.fromCharCode(97 + idx)}</td>
                    <td style={labelCell}>{s.label}</td>
                    <td style={valueCell}>
                      <input type="text" defaultValue={localData[`spr_${s.key}`] || ''} placeholder="NA" onChange={e => updateField(`spr_${s.key}`, e.target.value)} onBlur={e => commitField(`spr_${s.key}`, e.target.value)} style={inputStyle} />
                    </td>
                    <td style={valueCell}>
                    <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeFireProtectionSub === 'H' && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
                  <th style={{ ...labelCell, width: '40%' }}>Type of</th>
                  <th style={{ ...labelCell, width: '20%' }}>Quantity</th>
                  <th style={{ ...labelCell, width: '20%' }}>Not Applicable</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'foam', label: 'Foam Type' },
                  { key: 'co2', label: 'Type CO2' },
                  { key: 'clean', label: 'Clean Agents' },
                  { key: 'bucket', label: 'Fire Buckets' },
                  { key: 'dcp', label: 'Dry Chemical powder' },
                  { key: 'other', label: 'Others' }
                ].map((eItem, idx) => (
                  <tr key={eItem.key}>
                    <td style={bandCell}>{String.fromCharCode(97 + idx)}</td>
                    <td style={labelCell}>{eItem.label}</td>
                    <td style={valueCell}>
                      <input type="text" defaultValue={localData[`ext_${eItem.key}`] || ''} placeholder="NA" onChange={e => updateField(`ext_${eItem.key}`, e.target.value)} onBlur={e => commitField(`ext_${eItem.key}`, e.target.value)} style={inputStyle} />
                    </td>
                    <td style={valueCell}>
                    <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }, [])

  const PPEProvidedTable = React.useMemo(() => function PPEProvidedTable({ localData, updateField, commitField }) {
    const bandCell = { border: '1px solid #e2e8f0', padding: '10px', fontWeight: 700, textAlign: 'center', width: '60px', color: '#334155' }
    const labelCell = { border: '1px solid #e2e8f0', padding: '10px 12px', fontWeight: 600, color: '#334155' }
    const valueCell = { border: '1px solid #e2e8f0', padding: '10px 12px' }
    const inputStyle = { width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }
    const items = [
      { key: 'helmet', label: 'Helmets / Hard Hats' },
      { key: 'goggle', label: 'Safety Goggles' },
      { key: 'ear', label: 'Ear Plugs / Ear Muffs' },
      { key: 'mask', label: 'Face Shields' },
      { key: 'glove', label: 'Hand Gloves' },
      { key: 'boot', label: 'Gum Boots' },
      { key: 'shoe', label: 'Safety Shoes' },
      { key: 'apron', label: 'Aprons / Coveralls' },
      { key: 'ba', label: 'Self-Contained Breathing Apparatus' },
      { key: 'belt', label: 'Safety Belts' },
      { key: 'other', label: 'Others' }
    ]

    return (
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'transparent' }}>
              <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
              <th style={{ ...labelCell, width: '60%' }}>Equipment</th>
              <th style={{ ...labelCell, width: '20%' }}>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.key}>
                <td style={bandCell}>{String.fromCharCode(97 + idx)}</td>
                <td style={labelCell}>{item.label}</td>
                <td style={valueCell}>
                  <input
                    type="text"
                    defaultValue={localData[`ppe_${item.key}`] || ''}
                    placeholder="NA"
                    onChange={e => updateField(`ppe_${item.key}`, e.target.value)}
                    onBlur={e => commitField(`ppe_${item.key}`, e.target.value)}
                    style={inputStyle}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }, [])

  const CommunicationsTable = React.useMemo(() => function CommunicationsTable({ localData, updateField, commitField }) {
    const bandCell = { border: '1px solid #e2e8f0', padding: '10px', fontWeight: 700, textAlign: 'center', width: '60px', color: '#334155' }
    const labelCell = { border: '1px solid #e2e8f0', padding: '10px 12px', fontWeight: 600, color: '#334155' }
    const valueCell = { border: '1px solid #e2e8f0', padding: '10px 12px' }
    const inputStyle = { width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }
    const items = [
      { key: 'cctv', label: 'CCTV' },
      { key: 'fire_alarm', label: 'Fire Alarm' },
      { key: 'pa', label: 'PA System' }
    ]

    return (
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'transparent' }}>
              <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
              <th style={{ ...labelCell, width: '40%' }}>Intercom Services</th>
              <th style={{ ...labelCell, width: '20%' }}>Quantity</th>
              <th style={{ ...labelCell, width: '20%' }}>Not Applicable</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.key}>
                <td style={bandCell}>{String.fromCharCode(97 + idx)}</td>
                <td style={labelCell}>{item.label}</td>
                <td style={valueCell}>
                  <input
                    type="text"
                    defaultValue={localData[`comm_${item.key}`] || ''}
                    placeholder="NA"
                    onChange={e => updateField(`comm_${item.key}`, e.target.value)}
                    onBlur={e => commitField(`comm_${item.key}`, e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={valueCell}>
                  <input type="text" defaultValue={''} placeholder="NA" onBlur={() => {}} style={inputStyle} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }, [])

  const ChemicalsTable = React.useMemo(() => function ChemicalsTable({ localData, updateField, commitField }) {
    const bandCell = { border: '1px solid #e2e8f0', padding: '10px', fontWeight: 700, textAlign: 'center', width: '60px', color: '#334155' }
    const labelCell = { border: '1px solid #e2e8f0', padding: '10px 12px', fontWeight: 600, color: '#334155' }
    const valueCell = { border: '1px solid #e2e8f0', padding: '10px 12px' }
    const inputStyle = { width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }
    const rows = Array.isArray(localData.chem_rows) && localData.chem_rows.length > 0
      ? localData.chem_rows
      : Array.from({ length: 6 }, () => ({ name: '', hazardous: '', nonhazardous: '' }))

    const addRow = () => {
      const next = [...rows, { name: '', hazardous: '', nonhazardous: '' }]
      updateField('chem_rows', next)
    }

    const updateRowField = (idx, key, val) => {
      const next = rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r))
      updateField('chem_rows', next)
    }

    const commitRowField = (idx, key, val) => {
      const next = rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r))
      commitField('chem_rows', next)
    }

    return (
      <div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'transparent' }}>
                <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
                <th style={{ ...labelCell, width: '40%' }}>Chemicals</th>
                <th style={{ ...labelCell, width: '20%' }}>Hazardous</th>
                <th style={{ ...labelCell, width: '20%' }}>Non-Hazardous</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td style={bandCell}>{idx + 1}</td>
                  <td style={valueCell}>
                    <input
                      type="text"
                      defaultValue={row.name || ''}
                      placeholder="NA"
                      onChange={e => updateRowField(idx, 'name', e.target.value)}
                      onBlur={e => commitRowField(idx, 'name', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={valueCell}>
                    <input
                      type="text"
                      defaultValue={row.hazardous || ''}
                      placeholder="NA"
                      onChange={e => updateRowField(idx, 'hazardous', e.target.value)}
                      onBlur={e => commitRowField(idx, 'hazardous', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={valueCell}>
                    <input
                      type="text"
                      defaultValue={row.nonhazardous || ''}
                      placeholder="NA"
                      onChange={e => updateRowField(idx, 'nonhazardous', e.target.value)}
                      onBlur={e => commitRowField(idx, 'nonhazardous', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={addRow}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: 'white',
              color: '#334155',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Add Row
          </button>
        </div>
      </div>
    )
  }, [])

  const DrawingsVerificationTable = React.useMemo(() => function DrawingsVerificationTable({ localData, updateField, commitField }) {
    const bandCell = { border: '1px solid #e2e8f0', padding: '10px', fontWeight: 700, textAlign: 'center', width: '60px', color: '#334155' }
    const labelCell = { border: '1px solid #e2e8f0', padding: '10px 12px', fontWeight: 600, color: '#334155' }
    const valueCell = { border: '1px solid #e2e8f0', padding: '10px 12px' }
    const inputStyle = { width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }
    const rows = Array.isArray(localData.draw_rows) && localData.draw_rows.length > 0
      ? localData.draw_rows
      : Array.from({ length: 2 }, () => ({ name: '', status: '' }))
    const addRow = () => {
      const next = [...rows, { name: '', status: '' }]
      updateField('draw_rows', next)
    }
    const updateRowField = (idx, key, val) => {
      const next = rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r))
      updateField('draw_rows', next)
    }
    const commitRowField = (idx, key, val) => {
      const next = rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r))
      commitField('draw_rows', next)
    }
    return (
      <div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'transparent' }}>
                <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
                <th style={{ ...labelCell, width: '50%' }}>Drawing</th>
                <th style={{ ...labelCell, width: '30%' }}>Available</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td style={bandCell}>{idx + 1}</td>
                  <td style={valueCell}>
                    <input
                      type="text"
                      defaultValue={row.name || ''}
                      placeholder="NA"
                      onChange={e => updateRowField(idx, 'name', e.target.value)}
                      onBlur={e => commitRowField(idx, 'name', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={valueCell}>
                    <input
                      type="text"
                      defaultValue={row.status || ''}
                      placeholder="NA"
                      onChange={e => updateRowField(idx, 'status', e.target.value)}
                      onBlur={e => commitRowField(idx, 'status', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={addRow}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: 'white',
              color: '#334155',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Add Row
          </button>
        </div>
      </div>
    )
  }, [])

  const LegalVerificationTable = React.useMemo(() => function LegalVerificationTable({ localData, updateField, commitField }) {
    const bandCell = { border: '1px solid #e2e8f0', padding: '10px', fontWeight: 700, textAlign: 'center', width: '60px', color: '#334155' }
    const labelCell = { border: '1px solid #e2e8f0', padding: '10px 12px', fontWeight: 600, color: '#334155' }
    const valueCell = { border: '1px solid #e2e8f0', padding: '10px 12px' }
    const inputStyle = { width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }
    const items = [
      { key: 'factory', label: 'Factory License' },
      { key: 'stability', label: 'Building Stability Certificate' },
      { key: 'fire_noc', label: 'Fire NOC' }
    ]
    return (
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'transparent' }}>
              <th style={{ ...bandCell, width: '80px' }}>Sr. No.</th>
              <th style={{ ...labelCell, width: '40%' }}>Parameter</th>
              <th style={{ ...labelCell, width: '30%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.key}>
                <td style={bandCell}>{String.fromCharCode(97 + idx)}</td>
                <td style={labelCell}>{item.label}</td>
                <td style={valueCell}>
                  <input
                    type="text"
                    defaultValue={localData[`legal_${item.key}`] || ''}
                    placeholder="NA"
                    onChange={e => updateField(`legal_${item.key}`, e.target.value)}
                    onBlur={e => commitField(`legal_${item.key}`, e.target.value)}
                    style={inputStyle}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }, [])


 
  
  const ConstructionDetailsTable = React.useMemo(() => function ConstructionDetailsTable({ localData, updateField, commitField }) {
    return (
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '60px', padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(a)</td>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Ownership of the Structure</td>
                <td style={{ padding: '10px 12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Own Building</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.const_own_bldg || ''} placeholder="NA" onChange={e => updateField('const_own_bldg', e.target.value)} onBlur={e => commitField('const_own_bldg', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Lease</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.const_lease || ''} placeholder="NA" onChange={e => updateField('const_lease', e.target.value)} onBlur={e => commitField('const_lease', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Rental</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.const_rental || ''} placeholder="NA" onChange={e => updateField('const_rental', e.target.value)} onBlur={e => commitField('const_rental', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '60px', padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(b)</td>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Built up Area (SQ.MT)</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.const_built_up || ''} placeholder="NA" onChange={e => updateField('const_built_up', e.target.value)} onBlur={e => commitField('const_built_up', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '60px', padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(c)</td>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Structures (Number)</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.const_structures || ''} placeholder="NA" onChange={e => updateField('const_structures', e.target.value)} onBlur={e => commitField('const_structures', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '60px', padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(d)</td>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Height of the Building (Meters)</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.const_height || ''} placeholder="NA" onChange={e => updateField('const_height', e.target.value)} onBlur={e => commitField('const_height', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '60px', padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(e)</td>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Floors in each Building (including basement)</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.const_floors || ''} placeholder="NA" onChange={e => updateField('const_floors', e.target.value)} onBlur={e => commitField('const_floors', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '60px', padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(f)</td>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Ceiling Height of Each Floor (Meters)</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.const_ceiling_height || ''} placeholder="NA" onChange={e => updateField('const_ceiling_height', e.target.value)} onBlur={e => commitField('const_ceiling_height', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '60px', padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(g)</td>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>RAMP</td>
                <td style={{ padding: '10px 12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>No. of RAMPS</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.const_ramp_no || ''} placeholder="NA" onChange={e => updateField('const_ramp_no', e.target.value)} onBlur={e => commitField('const_ramp_no', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Width</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.const_ramp_width || ''} placeholder="NA" onChange={e => updateField('const_ramp_width', e.target.value)} onBlur={e => commitField('const_ramp_width', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '60px', padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(i)</td>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Staircase</td>
                <td style={{ padding: '10px 12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>No. of Staircase</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.const_stair_no || ''} placeholder="NA" onChange={e => updateField('const_stair_no', e.target.value)} onBlur={e => commitField('const_stair_no', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Width</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.const_stair_width || ''} placeholder="NA" onChange={e => updateField('const_stair_width', e.target.value)} onBlur={e => commitField('const_stair_width', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={{ width: '60px', padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(j)</td>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Lifts</td>
                <td style={{ padding: '10px 12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>No. of Lifts</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.const_lift_no || ''} placeholder="NA" onChange={e => updateField('const_lift_no', e.target.value)} onBlur={e => commitField('const_lift_no', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
    )
  }, [])
  
  const BasementsTable = React.useMemo(() => function BasementsTable({ localData, updateField, commitField }) {
    return (
      <div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ width: '60px', padding: '10px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Sr. No.</th>
                <th style={{ width: '32%', padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Description</th>
                <th style={{ width: '16%', padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>Qty. /Dim</th>
                <th style={{ width: '6%', padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>:</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(a)</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Number of Basement Floors</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>(Number)</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>:</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.base_no || ''} placeholder="NA" onChange={e => updateField('base_no', e.target.value)} onBlur={e => commitField('base_no', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(b)</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Area of Basement</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>(Sq. Meters)</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>:</td>
                <td style={{ padding: '10px 12px' }}>
                  <textarea defaultValue={localData.base_area_details || ''} placeholder="NA" onChange={e => updateField('base_area_details', e.target.value)} onBlur={e => commitField('base_area_details', e.target.value)} rows={4} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px', fontSize: '13px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(c)</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Height of the basement</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>(Meters)</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>:</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.base_height || ''} placeholder="NA" onChange={e => updateField('base_height', e.target.value)} onBlur={e => commitField('base_height', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(d)</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Basement Utility</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}></td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}></td>
                <td style={{ padding: '6px 12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '30%', padding: '6px', fontWeight: 600, color: '#334155' }}>Car Park</td>
                        <td style={{ width: '20%', padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_util_carpark || ''} placeholder="NA" onChange={e => updateField('base_util_carpark', e.target.value)} onBlur={e => commitField('base_util_carpark', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                        <td style={{ width: '30%', padding: '6px', fontWeight: 600, color: '#334155' }}>Storage</td>
                        <td style={{ width: '20%', padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_util_storage || ''} placeholder="NA" onChange={e => updateField('base_util_storage', e.target.value)} onBlur={e => commitField('base_util_storage', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '30%', padding: '6px', fontWeight: 600, color: '#334155' }}>Office</td>
                        <td style={{ width: '20%', padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_util_office || ''} placeholder="NA" onChange={e => updateField('base_util_office', e.target.value)} onBlur={e => commitField('base_util_office', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(e)</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Materials Stored in Basements</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}></td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}></td>
                <td style={{ padding: '6px 12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Papers</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_mat_papers || ''} placeholder="NA" onChange={e => updateField('base_mat_papers', e.target.value)} onBlur={e => commitField('base_mat_papers', e.target.value)} style={{ width: '220px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Clothes</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_mat_clothes || ''} placeholder="NA" onChange={e => updateField('base_mat_clothes', e.target.value)} onBlur={e => commitField('base_mat_clothes', e.target.value)} style={{ width: '220px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Rags</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_mat_rags || ''} placeholder="NA" onChange={e => updateField('base_mat_rags', e.target.value)} onBlur={e => commitField('base_mat_rags', e.target.value)} style={{ width: '220px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Records</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_mat_records || ''} placeholder="NA" onChange={e => updateField('base_mat_records', e.target.value)} onBlur={e => commitField('base_mat_records', e.target.value)} style={{ width: '220px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Books</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_mat_books || ''} placeholder="NA" onChange={e => updateField('base_mat_books', e.target.value)} onBlur={e => commitField('base_mat_books', e.target.value)} style={{ width: '220px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Electronics</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_mat_electronics || ''} placeholder="NA" onChange={e => updateField('base_mat_electronics', e.target.value)} onBlur={e => commitField('base_mat_electronics', e.target.value)} style={{ width: '220px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Petrol</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_mat_petrol || ''} placeholder="NA" onChange={e => updateField('base_mat_petrol', e.target.value)} onBlur={e => commitField('base_mat_petrol', e.target.value)} style={{ width: '220px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Kerosene</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_mat_kerosene || ''} placeholder="NA" onChange={e => updateField('base_mat_kerosene', e.target.value)} onBlur={e => commitField('base_mat_kerosene', e.target.value)} style={{ width: '220px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '40%', padding: '6px', fontWeight: 600, color: '#334155' }}>Ganders</td>
                        <td style={{ padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_mat_ganders || ''} placeholder="NA" onChange={e => updateField('base_mat_ganders', e.target.value)} onBlur={e => commitField('base_mat_ganders', e.target.value)} style={{ width: '220px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '10px', fontWeight: 700, textAlign: 'center', color: '#334155' }}>(f)</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Approach to Basements</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}></td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}></td>
                <td style={{ padding: '6px 12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '30%', padding: '6px', fontWeight: 600, color: '#334155' }}>Lifts</td>
                        <td style={{ width: '20%', padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_app_lifts || ''} placeholder="NA" onChange={e => updateField('base_app_lifts', e.target.value)} onBlur={e => commitField('base_app_lifts', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                        <td style={{ width: '30%', padding: '6px', fontWeight: 600, color: '#334155' }}>Staircase</td>
                        <td style={{ width: '20%', padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_app_staircase || ''} placeholder="NA" onChange={e => updateField('base_app_staircase', e.target.value)} onBlur={e => commitField('base_app_staircase', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: '30%', padding: '6px', fontWeight: 600, color: '#334155' }}>Driveway</td>
                        <td style={{ width: '20%', padding: '6px' }}>
                          <input type="text" defaultValue={localData.base_app_driveway || ''} placeholder="NA" onChange={e => updateField('base_app_driveway', e.target.value)} onBlur={e => commitField('base_app_driveway', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }, [])
  
  const KitchenTable = React.useMemo(() => function KitchenTable({ localData, updateField, commitField }) {
    return (
      <div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Kitchen Available?</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.kit_avail || ''} placeholder="NA" onChange={e => updateField('kit_avail', e.target.value)} onBlur={e => commitField('kit_avail', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Kitchen Location</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.kit_loc || ''} placeholder="NA" onChange={e => updateField('kit_loc', e.target.value)} onBlur={e => commitField('kit_loc', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Kitchen Fuel Used</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.kit_fuel || ''} placeholder="NA" onChange={e => updateField('kit_fuel', e.target.value)} onBlur={e => commitField('kit_fuel', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }, [])
  
  const GasStorageTable = React.useMemo(() => function GasStorageTable({ localData, updateField, commitField }) {
    return (
      <div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Type of Gas</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.gas_type || ''} placeholder="NA" onChange={e => updateField('gas_type', e.target.value)} onBlur={e => commitField('gas_type', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Gas Storage Method</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.gas_storage || ''} placeholder="NA" onChange={e => updateField('gas_storage', e.target.value)} onBlur={e => commitField('gas_storage', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }, [])
  
  const BuildingInformationTable = React.useMemo(() => function BuildingInformationTable({ localData, updateField, commitField }) {
    return (
      <div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Nature of Occupancy</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.gen_nature_occupancy || ''} placeholder="NA" onChange={e => updateField('gen_nature_occupancy', e.target.value)} onBlur={e => commitField('gen_nature_occupancy', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Total Departments</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.gen_departments || ''} placeholder="NA" onChange={e => updateField('gen_departments', e.target.value)} onBlur={e => commitField('gen_departments', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Name of the Departments</td>
                <td style={{ padding: '10px 12px' }}>
                  <textarea defaultValue={localData.gen_department_names || ''} placeholder="NA" onChange={e => updateField('gen_department_names', e.target.value)} onBlur={e => commitField('gen_department_names', e.target.value)} rows={4} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px', fontSize: '13px' }} />
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b' }}>Enter one per line, e.g., 1. House Keeping</div>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Total number of Process</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.gen_process_count || ''} placeholder="NA" onChange={e => updateField('gen_process_count', e.target.value)} onBlur={e => commitField('gen_process_count', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Total number of Process out sourced</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.gen_process_outsourced || ''} placeholder="NA" onChange={e => updateField('gen_process_outsourced', e.target.value)} onBlur={e => commitField('gen_process_outsourced', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
              <tr>
                <td style={{ width: '40%', padding: '10px 12px', fontWeight: 600, color: '#334155' }}>Total number of Contractor</td>
                <td style={{ padding: '10px 12px' }}>
                  <input type="text" defaultValue={localData.gen_contractors || ''} placeholder="NA" onChange={e => updateField('gen_contractors', e.target.value)} onBlur={e => commitField('gen_contractors', e.target.value)} style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px' }} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }, [])

  const renderContent = () => {
    if (activeSection === 'general') {
      return <BuildingInformationTable localData={localData} updateField={updateField} commitField={commitField} />
    } else if (activeSection === 'construction') {
      return (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {['A', 'B', 'C', 'D'].map(letter => (
              <button
                key={letter}
                onClick={() => setActiveConstructionSub(letter)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: activeConstructionSub === letter ? '#1e3a8a' : 'white',
                  color: activeConstructionSub === letter ? 'white' : '#334155',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                title={
                  letter === 'A' ? 'Structural Details' :
                  letter === 'B' ? 'Basements' :
                  letter === 'C' ? 'Kitchen' :
                  'Gas Storage'
                }
              >
                {letter}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 800, color: '#334155' }}>
            {activeConstructionSub === 'A' && 'A. Structural Details'}
            {activeConstructionSub === 'B' && 'B. Basement Details'}
            {activeConstructionSub === 'C' && 'C. Kitchen'}
            {activeConstructionSub === 'D' && 'D. Gas Storage'}
          </div>
          {activeConstructionSub === 'A' && <ConstructionDetailsTable localData={localData} updateField={updateField} commitField={commitField} />}
          {activeConstructionSub === 'B' && <BasementsTable localData={localData} updateField={updateField} commitField={commitField} />}
          {activeConstructionSub === 'C' && <KitchenTable localData={localData} updateField={updateField} commitField={commitField} />}
          {activeConstructionSub === 'D' && <GasStorageTable localData={localData} updateField={updateField} commitField={commitField} />}
        </>
      )
    } else if (activeSection === 'year_establishment') {
      return <YearEstablishmentTable localData={localData} updateField={updateField} commitField={commitField} />
    } else if (activeSection === 'landmark_access') {
      return (
        <LandmarksApproachTable
          approachE={localData.access_approach_e}
          approachW={localData.access_approach_w}
          approachN={localData.access_approach_n}
          approachS={localData.access_approach_s}
          fireStnName={localData.access_fire_stn_name}
          fireStnDist={localData.access_fire_stn_dist}
          policeStnName={localData.access_police_stn_name}
          policeStnDist={localData.access_police_stn_dist}
          hospitalName={localData.access_hospital_name}
          hospitalDist={localData.access_hospital_dist}
          gateWidth={localData.access_gate_width}
          leftDrive={localData.access_approach_left}
          rightDrive={localData.access_approach_right}
          frontRoad={localData.access_approach_front}
          backRoad={localData.access_approach_back}
          onChangeApproachE={v => updateField('access_approach_e', v)}
          onChangeApproachW={v => updateField('access_approach_w', v)}
          onChangeApproachN={v => updateField('access_approach_n', v)}
          onChangeApproachS={v => updateField('access_approach_s', v)}
          onChangeFireStnName={v => updateField('access_fire_stn_name', v)}
          onChangeFireStnDist={v => updateField('access_fire_stn_dist', v)}
          onChangePoliceStnName={v => updateField('access_police_stn_name', v)}
          onChangePoliceStnDist={v => updateField('access_police_stn_dist', v)}
          onChangeHospitalName={v => updateField('access_hospital_name', v)}
          onChangeHospitalDist={v => updateField('access_hospital_dist', v)}
          onChangeGateWidth={v => updateField('access_gate_width', v)}
          onChangeLeftDrive={v => updateField('access_approach_left', v)}
          onChangeRightDrive={v => updateField('access_approach_right', v)}
          onChangeFrontRoad={v => updateField('access_approach_front', v)}
          onChangeBackRoad={v => updateField('access_approach_back', v)}
          onCommitApproachE={v => commitField('access_approach_e', v)}
          onCommitApproachW={v => commitField('access_approach_w', v)}
          onCommitApproachN={v => commitField('access_approach_n', v)}
          onCommitApproachS={v => commitField('access_approach_s', v)}
          onCommitFireStnName={v => commitField('access_fire_stn_name', v)}
          onCommitFireStnDist={v => commitField('access_fire_stn_dist', v)}
          onCommitPoliceStnName={v => commitField('access_police_stn_name', v)}
          onCommitPoliceStnDist={v => commitField('access_police_stn_dist', v)}
          onCommitHospitalName={v => commitField('access_hospital_name', v)}
          onCommitHospitalDist={v => commitField('access_hospital_dist', v)}
          onCommitGateWidth={v => commitField('access_gate_width', v)}
          onCommitLeftDrive={v => commitField('access_approach_left', v)}
          onCommitRightDrive={v => commitField('access_approach_right', v)}
          onCommitFrontRoad={v => commitField('access_approach_front', v)}
          onCommitBackRoad={v => commitField('access_approach_back', v)}
        />
      )
    } else if (activeSection === 'power_main') {
      return (
        <MainPowerSupplyTable
            subCapacity={data.power_sub_cap}
            subMake={data.power_sub_make}
            subSource={data.power_sub_source}
            transCapacity={data.power_trans_cap}
            transMake={data.power_trans_make}
            transSource={data.power_trans_source}
            solarCapacity={data.power_solar_cap}
            solarMake={data.power_solar_make}
            solarSource={data.power_solar_source}
            onChangeSubCapacity={v => updateField('power_sub_cap', v)}
            onChangeSubMake={v => updateField('power_sub_make', v)}
            onChangeSubSource={v => updateField('power_sub_source', v)}
            onChangeTransCapacity={v => updateField('power_trans_cap', v)}
            onChangeTransMake={v => updateField('power_trans_make', v)}
            onChangeTransSource={v => updateField('power_trans_source', v)}
            onChangeSolarCapacity={v => updateField('power_solar_cap', v)}
            onChangeSolarMake={v => updateField('power_solar_make', v)}
            onChangeSolarSource={v => updateField('power_solar_source', v)}
            onCommitSubCapacity={v => commitField('power_sub_cap', v)}
            onCommitSubMake={v => commitField('power_sub_make', v)}
            onCommitSubSource={v => commitField('power_sub_source', v)}
            onCommitTransCapacity={v => commitField('power_trans_cap', v)}
            onCommitTransMake={v => commitField('power_trans_make', v)}
            onCommitTransSource={v => commitField('power_trans_source', v)}
            onCommitSolarCapacity={v => commitField('power_solar_cap', v)}
            onCommitSolarMake={v => commitField('power_solar_make', v)}
            onCommitSolarSource={v => commitField('power_solar_source', v)}
        />
      )
    } else if (activeSection === 'power_standby') {
      return (
        <StandbyPowerSupplyTable
            genCapacity={localData.power_gen_cap}
            genMake={localData.power_gen_make}
            genSource={localData.power_gen_source}
            invCapacity={localData.power_inv_cap}
            invMake={localData.power_inv_make}
            invSource={localData.power_inv_source}
            solarCapacity={localData.power_solar_st_cap}
            solarMake={localData.power_solar_st_make}
            solarSource={localData.power_solar_st_source}
            onChangeGenCapacity={v => updateField('power_gen_cap', v)}
            onChangeGenMake={v => updateField('power_gen_make', v)}
            onChangeGenSource={v => updateField('power_gen_source', v)}
            onChangeInvCapacity={v => updateField('power_inv_cap', v)}
            onChangeInvMake={v => updateField('power_inv_make', v)}
            onChangeInvSource={v => updateField('power_inv_source', v)}
            onChangeSolarCapacity={v => updateField('power_solar_st_cap', v)}
            onChangeSolarMake={v => updateField('power_solar_st_make', v)}
            onChangeSolarSource={v => updateField('power_solar_st_source', v)}
            onCommitGenCapacity={v => commitField('power_gen_cap', v)}
            onCommitGenMake={v => commitField('power_gen_make', v)}
            onCommitGenSource={v => commitField('power_gen_source', v)}
            onCommitInvCapacity={v => commitField('power_inv_cap', v)}
            onCommitInvMake={v => commitField('power_inv_make', v)}
            onCommitInvSource={v => commitField('power_inv_source', v)}
            onCommitSolarCapacity={v => commitField('power_solar_st_cap', v)}
            onCommitSolarMake={v => commitField('power_solar_st_make', v)}
            onCommitSolarSource={v => commitField('power_solar_st_source', v)}
        />
      )
    } else if (activeSection === 'ac_system') {
      return <ACSystemTable localData={localData} updateField={updateField} commitField={commitField} />
    } else if (activeSection === 'fire_protection') {
      return <FireProtectionTables localData={localData} updateField={updateField} commitField={commitField} />
    } else if (activeSection === 'ppe') {
      return <PPEProvidedTable localData={localData} updateField={updateField} commitField={commitField} />
    } else if (activeSection === 'communications') {
      return <CommunicationsTable localData={localData} updateField={updateField} commitField={commitField} />
    } else if (activeSection === 'chemicals') {
      return <ChemicalsTable localData={localData} updateField={updateField} commitField={commitField} />
    } else if (activeSection === 'drawings') {
      return <DrawingsVerificationTable localData={localData} updateField={updateField} commitField={commitField} />
    } else if (activeSection === 'legal_verification') {
      return <LegalVerificationTable localData={localData} updateField={updateField} commitField={commitField} />
    } else if (activeSection === 'documents_list') {
      return <DocumentsListSection />
    }

    const fields = SECTION_FIELDS[activeSection] || []
    if (fields.length === 0) {
      return <div style={{ padding: 20, color: '#64748b' }}>No fields configured for this section yet.</div>
    }

    return fields.map((fieldKey, idx) => (
      <InputRow 
        key={fieldKey}
        label={ORG_FIELD_LABELS[fieldKey] || fieldKey}
        value={localData[fieldKey]}
        onChange={v => updateField(fieldKey, v)}
        onCommit={v => commitField(fieldKey, v)}
        placeholder="NA"
        sr={activeSection === 'name_address' ? String.fromCharCode(97 + idx) : undefined}
      />
    ))
  }

  return (
    <div style={{ display: 'flex', gap: '20px', minHeight: '400px' }}>
      <div style={{ width: '300px', borderRight: '1px solid #e2e8f0' }}>
        <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: '12px', color: '#1e3a8a', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase' }}>
          {partI?.label}
        </div>
        {partISections.map(section => (
          <div 
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{ 
              padding: '12px 16px', 
              cursor: 'pointer',
              backgroundColor: activeSection === section.id ? '#1e3a8a' : 'transparent',
              color: activeSection === section.id ? 'white' : '#334155',
              fontWeight: 500,
              fontSize: '13px',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            {section.label}
          </div>
        ))}
        <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: '12px', color: '#1e3a8a', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase' }}>
          {partII?.label}
        </div>
        {partIISections.map(section => (
          <div 
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{ 
              padding: '12px 16px', 
              cursor: 'pointer',
              backgroundColor: activeSection === section.id ? '#1e3a8a' : 'transparent',
              color: activeSection === section.id ? 'white' : '#334155',
              fontWeight: 500,
              fontSize: '13px',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            {section.label}
          </div>
        ))}
        <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: '12px', color: '#1e3a8a', borderTop: '1px solid #f1f5f9', textTransform: 'uppercase' }}>
          {partIII?.label}
        </div>
        {partIIISections.map(section => (
          <div 
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{ 
              padding: '12px 16px', 
              cursor: 'pointer',
              backgroundColor: activeSection === section.id ? '#1e3a8a' : 'transparent',
              color: activeSection === section.id ? 'white' : '#334155',
              fontWeight: 500,
              fontSize: '13px',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            {section.label}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: '0 20px' }}>
        <div style={{ marginBottom: '10px', fontSize: '12px', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase' }}>
          {(partISectionIds.includes(activeSection) ? partI?.label : partIISectionIds.includes(activeSection) ? partII?.label : partIII?.label) || ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e3a8a' }}>{ORGANIZATION_SECTIONS.find(s => s.id === activeSection)?.label}</div>
          <button
            onClick={handleSaveOrgDetails}
            style={{ background: '#1e3a8a', color: 'white', border: 'none', borderRadius: 6, padding: '8px 12px', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
            disabled={CUSTOMER_LOCKED}
          >
            Save Organization Details
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  )
}


function BlockDetails({ blocks, onUpdate, assignments = [], auditors = [], orgId }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', inCharge: '', height: '' })

  const startEditing = (block) => {
    setEditingId(block.id)
    setEditForm({ 
      name: block.name, 
      inCharge: block.inCharge || '', 
      height: block.height || '' 
    })
  }

  const displayedBlocks = useMemo(() => {
    const base = Array.isArray(blocks) ? [...blocks] : []
    const scoped = orgId ? assignments.filter(a => a.orgId === orgId) : assignments
    const ids = Array.from(new Set(scoped.map(a => a.blockId).filter(b => b && b !== '__ALL__')))
    ids.forEach(id => {
      const exists = base.some(b => String(b.id) === String(id) || String(b.name) === String(id))
      if (!exists) {
        base.push({ id: String(id), name: String(id), inCharge: '', height: '' })
      }
    })
    return base
  }, [blocks, assignments, orgId])

  const saveEdit = () => {
    onUpdate(displayedBlocks.map(b => {
      if (b.id === editingId) {
        return { ...b, ...editForm }
      }
      return b
    }))
    setEditingId(null)
  }

  // Removed unused cancelEdit

  // Helper to find assigned auditor
  const getAssignedAuditor = (blockId) => {
    const scoped = orgId ? assignments.filter(a => a.orgId === orgId) : assignments
    const assignment = scoped.find(a => a.blockId === blockId || a.blockId === String(blockId)) || scoped.find(a => a.blockId === '__ALL__')
    if (!assignment) return null
    const found = auditors.find(aud => aud.id === assignment.auditorId)
    if (found) return found
    const name = assignment.auditor_name || ''
    return name ? { id: assignment.auditorId, name } : null
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Table Container */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', background: 'white', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: '#334155', width: '30%' }}>Building Name</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: '#334155', width: '25%' }}>Block In-Charge</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: '#334155', width: '15%' }}>Building Height</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: '#334155', width: '20%' }}>Assigned Auditor</th>
              <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, color: '#334155', width: '10%' }}></th>
            </tr>
          </thead>
          <tbody>
            {displayedBlocks.map(block => {
              const isEditing = editingId === block.id
              const auditor = getAssignedAuditor(block.id)
              
              return (
                <tr key={block.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {isEditing ? (
                    <>
                      <td style={{ padding: '8px 16px' }}>
                        <input 
                          type="text" 
                          value={editForm.name} 
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          placeholder="Block Name"
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                          autoFocus
                        />
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <input 
                          type="text" 
                          value={editForm.inCharge} 
                          onChange={e => setEditForm({...editForm, inCharge: e.target.value})}
                          placeholder="In-Charge Name"
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                         <input 
                          type="text" 
                          value={editForm.height} 
                          onChange={e => setEditForm({...editForm, height: e.target.value})}
                          placeholder="Height (m)"
                          style={{ width: '100%', padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ padding: '8px 16px', color: '#64748b' }}>
                        {auditor ? auditor.name : '-'}
                      </td>
                      <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                         <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                           <button onClick={saveEdit} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                         </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '12px 16px', color: '#1e293b', fontWeight: 500 }}>{block.name}</td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{block.inCharge}</td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>{block.height}</td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {auditor ? auditor.name : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button 
                          onClick={() => startEditing(block)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px' }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}

            {displayedBlocks.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                  No blocks defined by Admin.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Footer Info */}
        <div style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>
          ℹ️ Blocks are defined by the Admin during organization creation. You can edit the details but cannot add or remove blocks.
        </div>
      </div>
      
      <div style={{ marginTop: '20px', fontWeight: 800, fontSize: '14px', color: 'black', textTransform: 'uppercase' }}>
        BUILDING MASTER
      </div>
    </div>
  )
}

function BlockAssignmentView({ blocks, assignments, auditors, orgId }) {
  // Find assignment for each block
  const getAssignedAuditor = (blockId) => {
    const scoped = orgId ? assignments.filter(a => a.orgId === orgId) : assignments
    const assignment = scoped.find(a => a.blockId === blockId || a.blockId === String(blockId)) || scoped.find(a => a.blockId === '__ALL__')
    if (!assignment) return null
    const found = auditors.find(aud => aud.id === assignment.auditorId)
    if (found) return found
    const name = assignment.auditor_name || ''
    return name ? { id: assignment.auditorId, name } : null
  }

  const displayedBlocks = useMemo(() => {
    const base = Array.isArray(blocks) ? [...blocks] : []
    const scoped = orgId ? assignments.filter(a => a.orgId === orgId) : assignments
    const ids = Array.from(new Set(scoped.map(a => a.blockId).filter(b => b && b !== '__ALL__')))
    ids.forEach(id => {
      const exists = base.some(b => String(b.id) === String(id) || String(b.name) === String(id))
      if (!exists) {
        base.push({ id: String(id), name: String(id), inCharge: '', height: '' })
      }
    })
    return base
  }, [blocks, assignments, orgId])

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e3a8a', marginBottom: '20px' }}>
        Block-wise Auditor Assignments
      </h3>
      {displayedBlocks.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
          No blocks defined. Go to "Block Details" to add blocks first.
        </div>
      ) : (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Block Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Assigned Auditor</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedBlocks.map(block => {
                const auditor = getAssignedAuditor(block.id)
                return (
                  <tr key={block.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                      {block.name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#334155' }}>
                      {auditor ? auditor.name : '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {auditor ? (
                         <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 600 }}>
                           Active
                         </span>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: 600 }}>
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '6px', fontSize: '13px', color: '#0369a1' }}>
        ℹ️ <strong>Note:</strong> Auditors are assigned by the Admin in the "Assign Auditors" section. This view is read-only.
      </div>
    </div>
  )
}

// --- MAIN COMPONENT ---

export default function FireSafetyAuditSummary({ statusMap = {}, commentMap = {}, allowedGroup, allowedSubdivision, assignments = [], auditors = [], user, orgs }) {
  const sanitizeOrgData = (data) => {
    try {
      const d = { ...(data || {}) }
      const sentinel = d.const_own_bldg === 'Yes (Divyasree techpark)'
      if (sentinel) {
        const keysToBlank = [
          'const_own_bldg','const_lease','const_rental','const_height','const_floors','const_ceiling_height',
          'const_ramp_no','const_ramp_width','const_stair_no','const_stair_width','const_lift_no',
          'base_util_carpark','base_util_storage','base_util_office','base_mat_papers','base_mat_clothes','base_mat_rags',
          'base_mat_records','base_mat_books','base_mat_electronics','base_mat_petrol','base_mat_kerosene','base_mat_ganders',
          'base_app_lifts','base_app_staircase','base_app_driveway',
          'ac_ahu','ac_central','ac_window','ac_split',
          'water_ug_qty','water_terrace_qty',
          'pump_main_cap','pump_main_head','pump_main_rpm','pump_main_make','pump_main_status',
          'pump_diesel_cap','pump_diesel_head','pump_diesel_rpm','pump_diesel_make','pump_diesel_status',
          'pump_sprinkler_cap','pump_sprinkler_head','pump_sprinkler_rpm','pump_sprinkler_make','pump_sprinkler_status',
          'pump_jockey_cap','pump_jockey_head','pump_jockey_rpm','pump_jockey_make','pump_jockey_status',
          'pump_booster_cap','pump_booster_head','pump_booster_rpm','pump_booster_make','pump_booster_status',
          'hyd_wet','hyd_dry','hyd_down','hyd_hose_reel','hyd_box_s','hyd_box_d','hyd_landing','hyd_yard','hyd_monitor',
          'det_smoke','det_heat','det_alarm','det_mcp','det_gas','det_lpg',
          'spr_pendent','spr_sidewall','spr_concealed','spr_other',
          'ext_foam','ext_co2','ext_clean','ext_bucket','ext_dcp','ext_other'
        ]
        keysToBlank.forEach(k => { d[k] = '' })
      }
      return d
    } catch {
      return data
    }
  }
  const [activeTab, setActiveTab] = useState('summary')
  const [forceOrgSection] = useState(null)
  const getOrgIdent = () => {
    if (Array.isArray(orgs) && user && (user.organizationName || user.orgId)) {
      const org = orgs.find(o => o.name === user.organizationName || o.id === user.orgId)
      if (org) return org.id || org.name || 'default'
    }
    if (user && (user.organizationName || user.orgId)) return user.orgId || user.organizationName
    return 'default'
  }
  const ORG_IDENT = getOrgIdent()
  const ORG_DATA_KEY = `fireAudit_orgData_v2::${ORG_IDENT}`
  const BLOCKS_KEY = `fireAudit_blocks_v2::${ORG_IDENT}`
  const [orgData, setOrgData] = useState(() => {
    return DEFAULT_ORG_DATA
  })
  const blocksDerived = useMemo(() => {
    try {
      const orgId = user?.orgId || ''
      const list = Array.isArray(assignments) ? assignments : []
      const scoped = list.filter(a => a.org_id === orgId || a.orgId === orgId)
      const map = new Map()
      scoped.forEach(a => {
        const bid = a.block_id || a.blockId || a.block_name
        if (!bid || bid === '__ALL__') return
        const bname = String(a.block_name || bid)
        const audId = a.auditor_id || a.auditorId
        const aud = Array.isArray(auditors) ? auditors.find(x => String(x.id) === String(audId)) : null
        const audName = aud ? (aud.name || aud.email || '') : ''
        const key = String(bid)
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            name: bname,
            block_id: key,
            block_name: bname,
            auditor_id: audId ? String(audId) : '',
            auditor_name: audName,
            sections: []
          })
        }
        const entry = map.get(key)
        const subId = a.subdivision_id || a.subdivisionId
        if (subId && !entry.sections.includes(subId)) {
          entry.sections.push(String(subId))
        }
      })
      return Array.from(map.values())
    } catch {
      return []
    }
  }, [assignments, user, auditors])

  const ACTIVE_AUDIT_ID = useMemo(() => {
    try {
      const scoped = Array.isArray(assignments) ? assignments.filter(a => (a.org_id || a.orgId) === ORG_IDENT) : []
      const first = scoped[0]
      return first?.audit_id || first?.assignment_id || first?.id || ''
    } catch {
      return ''
    }
  }, [assignments, ORG_IDENT])

  useEffect(() => {
    ;(async () => {
      try {
        const idToken = await auth.currentUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const res = await fetch(`${BASE_URL}/api/organizations/${ORG_IDENT}`, {
          method: 'GET',
          headers: { idToken }
        })
        if (res.ok) {
          const doc = await res.json()
          const sa = doc.self_assessment || {}
          const flat = {}
          Object.keys(sa || {}).forEach(sec => {
            const fields = sa[sec] || {}
            Object.keys(fields).forEach(k => { flat[k] = fields[k] })
          })
          const next = { ...DEFAULT_ORG_DATA, ...flat }
          setTimeout(() => setOrgData(sanitizeOrgData(next)), 0)
          return
        }
      } catch { void 0 }
      setTimeout(() => setOrgData(DEFAULT_ORG_DATA), 0)
    })()
  }, [ORG_IDENT, ORG_DATA_KEY])

  useEffect(() => {
  }, [ORG_IDENT, orgs, user, BLOCKS_KEY])

  const [summaryStatusMap, setSummaryStatusMap] = useState({})
  useEffect(() => {
    ;(async () => {
      try {
        if (!ACTIVE_AUDIT_ID) return
        const hasExternal = statusMap && Object.keys(statusMap).length > 0
        if (hasExternal) {
          setSummaryStatusMap(statusMap)
          return
        }
        const token = await auth.currentUser.getIdToken()
        const BASE_URL = (import.meta.env && import.meta.env.VITE_BACKEND_URL) || window.__BACKEND_URL__ || 'http://localhost:8010'
        const resp = await fetch(`${BASE_URL}/org-responses/list?audit_id=${encodeURIComponent(ACTIVE_AUDIT_ID)}`, {
          method: 'GET',
          headers: { idToken: token }
        })
        if (!resp.ok) return
        const list = await resp.json().catch(() => [])
        const next = {}
        ;(Array.isArray(list) ? list : []).forEach(d => {
          const qid = d.question_id
          const st = String(d.status || '').toLowerCase()
          if (qid && st) next[qid] = st
        })
        setSummaryStatusMap(next)
      } catch { /* silent */ }
    })()
  }, [ACTIVE_AUDIT_ID, statusMap])
  const normalizedStatusMap = useMemo(() => {
    const src = (summaryStatusMap && Object.keys(summaryStatusMap).length > 0) ? summaryStatusMap : statusMap || {}
    const m = {}
    Object.keys(src || {}).forEach(k => {
      const qid = k.includes('::') ? k.split('::')[1] : k
      const v = src[k]
      if (qid && v) m[qid] = v
    })
    return m
  }, [summaryStatusMap, statusMap])
  

  return (
    <div className="summary-page-container" style={{ padding: '20px', background: '#f8fafc', minHeight: '100%' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
        <div 
          onClick={() => setActiveTab('summary')}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer', 
            fontWeight: 600, 
            color: activeTab === 'summary' ? '#1e3a8a' : '#64748b',
            borderBottom: activeTab === 'summary' ? '2px solid #1e3a8a' : 'none'
          }}
        >
          Summary
        </div>
        <div 
          onClick={() => setActiveTab('organization')}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer', 
            fontWeight: 600, 
            color: activeTab === 'organization' ? '#1e3a8a' : '#64748b',
            borderBottom: activeTab === 'organization' ? '2px solid #1e3a8a' : 'none'
          }}
        >
          Organisation Details
        </div>
        <div 
          onClick={() => setActiveTab('blocks')}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer', 
            fontWeight: 600, 
            color: activeTab === 'blocks' ? '#1e3a8a' : '#64748b',
            borderBottom: activeTab === 'blocks' ? '2px solid #1e3a8a' : 'none'
          }}
        >
          Block Details
        </div>
        <div 
          onClick={() => setActiveTab('assignments')}
          style={{ 
            padding: '10px 20px', 
            cursor: 'pointer', 
            fontWeight: 600, 
            color: activeTab === 'assignments' ? '#1e3a8a' : '#64748b',
            borderBottom: activeTab === 'assignments' ? '2px solid #1e3a8a' : 'none'
          }}
        >
          Block Assignments
        </div>
        
      </div>

      {/* Content */}
      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' }}>
        {activeTab === 'summary' && (
          <SummaryDashboard 
            statusMap={normalizedStatusMap} 
            commentMap={commentMap}
            blocks={blocksDerived} 
            organizationData={orgData} 
            allowedGroup={allowedGroup}
            allowedSubdivision={allowedSubdivision}
          />
        )}
        {activeTab === 'organization' && (
          <OrganizationDetails 
            data={orgData} 
            onUpdate={setOrgData} 
            jumpToSection={forceOrgSection} 
            orgId={resolveOrgId(user, orgs)} 
            auditId={ACTIVE_AUDIT_ID}
          />
        )}
        {activeTab === 'blocks' && (
          <BlockDetails blocks={blocksDerived} onUpdate={() => {}} assignments={assignments} auditors={auditors} orgId={orgs?.find(o => o.name === user?.organizationName || o.id === user?.orgId)?.id} />
        )}
        {activeTab === 'assignments' && (
          <BlockAssignmentView blocks={blocksDerived} assignments={assignments} auditors={auditors} orgId={orgs?.find(o => o.name === user?.organizationName || o.id === user?.orgId)?.id} />
        )}
      </div>
    </div>
  )
}
