import { normalizeGroupAQuestions } from '../utils/questionUtils'

import groupAA1 from '../../scripts/groupA-A-1.json'
import groupAA2 from '../../scripts/groupA-A-2.json'
import groupAA3 from '../../scripts/groupA-A-3.json'
import groupAA4 from '../../scripts/groupA-A-4.json'
import groupAA5 from '../../scripts/groupA-A-5.json'
import groupAA6 from '../../scripts/groupA-A-6.json'
import groupAAGEN from '../../scripts/groupA-A-GEN.json'
import groupBB1 from '../../scripts/groupB-B-1.json'
import groupBB2 from '../../scripts/groupB-B-2.json'
import groupBBGEN from '../../scripts/groupB-B-GEN.json'
import groupCC2 from '../../scripts/groupC-C-2.json'
import groupCC3 from '../../scripts/groupC-C-3.json'
import groupCCGEN from '../../scripts/groupC-C-GEN.json'
import groupDDGEN from '../../scripts/groupD-D-GEN.json'
import groupDD6 from '../../scripts/groupD-D-6.json'
import groupEE1 from '../../scripts/groupE-E-1.json'
import groupEE2 from '../../scripts/groupE-E-2.json'
import groupEE3 from '../../scripts/groupE-E-3.json'
import groupEE4 from '../../scripts/groupE-E-4.json'
import groupEE5 from '../../scripts/groupE-E-5.json'
import groupEEGEN from '../../scripts/groupE-E-GEN.json'
import groupFF1 from '../../scripts/groupF-F-1.json'
import groupFF2 from '../../scripts/groupF-F-2.json'
import groupFF3 from '../../scripts/groupF-F-3.json'
import groupFFGEN from '../../scripts/groupF-F-GEN.json'
import groupGG1 from '../../scripts/groupG-G-1.json'
import groupGG2 from '../../scripts/groupG-G-2.json'
import groupGG3 from '../../scripts/groupG-G-3.json'
import groupGGGEN from '../../scripts/groupG-G-GEN.json'
import groupHH1 from '../../scripts/groupH-H-1.json'
import groupHHGEN from '../../scripts/groupH-H-GEN.json'
import groupJJ1 from '../../scripts/groupJ-J-1.json'
import groupJJGEN from '../../scripts/groupJ-J-GEN.json'

const GROUP_A_QUESTION_BANK = {
  'A-1': normalizeGroupAQuestions(groupAA1),
  'A-2': normalizeGroupAQuestions(groupAA2),
  'A-3': normalizeGroupAQuestions(groupAA3),
  'A-4': normalizeGroupAQuestions(groupAA4),
  'A-5': normalizeGroupAQuestions(groupAA5),
  'A-6': normalizeGroupAQuestions(groupAA6),
  'A-GEN': normalizeGroupAQuestions(groupAAGEN),
}

const GROUP_B_QUESTION_BANK = {
  'B-1': normalizeGroupAQuestions(groupBB1),
  'B-2': normalizeGroupAQuestions(groupBB2),
  'B-GEN': normalizeGroupAQuestions(groupBBGEN),
}

const GROUP_C_QUESTION_BANK = {
  'C-2': normalizeGroupAQuestions(groupCC2),
  'C-3': normalizeGroupAQuestions(groupCC3),
  'C-GEN': normalizeGroupAQuestions(groupCCGEN),
}

const GROUP_D_QUESTION_BANK = {
  'D-1': normalizeGroupAQuestions(groupDDGEN),
  'D-2': normalizeGroupAQuestions(groupDDGEN),
  'D-3': normalizeGroupAQuestions(groupDDGEN),
  'D-4': normalizeGroupAQuestions(groupDDGEN),
  'D-5': normalizeGroupAQuestions(groupDDGEN),
  'D-6': normalizeGroupAQuestions(groupDD6),
  'D-GEN': normalizeGroupAQuestions(groupDDGEN),
}

const GROUP_E_QUESTION_BANK = {
  'E-1': normalizeGroupAQuestions(groupEE1),
  'E-2': normalizeGroupAQuestions(groupEE2),
  'E-3': normalizeGroupAQuestions(groupEE3),
  'E-4': normalizeGroupAQuestions(groupEE4),
  'E-5': normalizeGroupAQuestions(groupEE5),
  'E-GEN': normalizeGroupAQuestions(groupEEGEN),
}

const GROUP_F_QUESTION_BANK = {
  'F-1': normalizeGroupAQuestions(groupFF1),
  'F-2': normalizeGroupAQuestions(groupFF2),
  'F-3': normalizeGroupAQuestions(groupFF3),
  'F-GEN': normalizeGroupAQuestions(groupFFGEN),
}

const GROUP_G_QUESTION_BANK = {
  'G-1': normalizeGroupAQuestions(groupGG1),
  'G-2': normalizeGroupAQuestions(groupGG2),
  'G-3': normalizeGroupAQuestions(groupGG3),
  'G-GEN': normalizeGroupAQuestions(groupGGGEN),
}

const GROUP_H_QUESTION_BANK = {
  'H-1': normalizeGroupAQuestions(groupHH1),
  'H-GEN': normalizeGroupAQuestions(groupHHGEN),
}

const GROUP_J_QUESTION_BANK = {
  'J-1': normalizeGroupAQuestions(groupJJ1),
  'J-GEN': normalizeGroupAQuestions(groupJJGEN),
}

export const QUESTION_BANKS = {
  A: GROUP_A_QUESTION_BANK,
  B: GROUP_B_QUESTION_BANK,
  C: GROUP_C_QUESTION_BANK,
  D: GROUP_D_QUESTION_BANK,
  E: GROUP_E_QUESTION_BANK,
  F: GROUP_F_QUESTION_BANK,
  G: GROUP_G_QUESTION_BANK,
  H: GROUP_H_QUESTION_BANK,
  J: GROUP_J_QUESTION_BANK,
}

export function getQuestions(groupId, subdivisionId) {
  if (!groupId || !subdivisionId) return []
  const groupBank = QUESTION_BANKS[groupId]
  if (!groupBank) return []
  if (groupBank[subdivisionId]) return groupBank[subdivisionId]
  const genKey = `${groupId}-GEN`
  if (groupBank[genKey]) return groupBank[genKey]
  const firstKey = Object.keys(groupBank)[0]
  return firstKey ? groupBank[firstKey] : []
}
