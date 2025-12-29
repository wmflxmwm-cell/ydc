
import { Project, ProjectStatus, ProjectType, Gate, GateStatus, Issue, IssueType } from '../types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    customerName: '현대자동차',
    carModel: '아이오닉 5',
    partName: '배터리 하우징 케이스',
    partNumber: 'BH-2024-001',
    moldCavity: 2,
    sopDate: '2024-12-20',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.NEW_DEVELOPMENT,
    material: 'ALDC12',
    createdAt: '2024-01-15'
  },
  {
    id: 'proj-2',
    customerName: '기아',
    carModel: 'EV9',
    partName: '리어 언더바디 기가캐스팅',
    partNumber: 'TS-RY-992',
    moldCavity: 1,
    sopDate: '2025-03-10',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.NEW_DEVELOPMENT,
    material: 'AlSi10MnMg',
    createdAt: '2024-02-10'
  },
  {
    id: 'proj-3',
    customerName: '현대모비스',
    carModel: '아이오닉 6',
    partName: '리어 프레임 커버 (#2 Mold)',
    partNumber: 'HM-I6-RF-2',
    moldCavity: 2,
    sopDate: '2024-11-05',
    status: ProjectStatus.IN_PROGRESS,
    type: ProjectType.INCREMENTAL_MOLD,
    material: 'ALDC12',
    createdAt: '2024-03-01'
  },
  {
    id: 'proj-4',
    customerName: 'BMW',
    carModel: '5시리즈 (G60)',
    partName: '엔진 마운팅 브라켓',
    partNumber: 'BW-550-EM',
    moldCavity: 4,
    sopDate: '2024-08-15',
    status: ProjectStatus.COMPLETED,
    type: ProjectType.NEW_DEVELOPMENT,
    material: 'ALDC10',
    createdAt: '2023-11-01'
  }
];

export const INITIAL_GATES: Gate[] = [
  // Project 1 Gates
  { id: 'g1-1', projectId: 'proj-1', phaseNumber: 1, status: GateStatus.APPROVED, approvalDate: '2024-02-01' },
  { id: 'g1-2', projectId: 'proj-1', phaseNumber: 2, status: GateStatus.OPEN, flowAnalysisResult: true },
  { id: 'g1-3', projectId: 'proj-1', phaseNumber: 3, status: GateStatus.LOCKED },
  { id: 'g1-4', projectId: 'proj-1', phaseNumber: 4, status: GateStatus.LOCKED },
  { id: 'g1-5', projectId: 'proj-1', phaseNumber: 5, status: GateStatus.LOCKED },

  // Project 3 Gates (증작 금형)
  { id: 'g3-1', projectId: 'proj-3', phaseNumber: 1, status: GateStatus.APPROVED, approvalDate: '2024-03-10' },
  { id: 'g3-2', projectId: 'proj-3', phaseNumber: 2, status: GateStatus.APPROVED, approvalDate: '2024-03-20', flowAnalysisResult: true },
  { id: 'g3-3', projectId: 'proj-3', phaseNumber: 3, status: GateStatus.OPEN },
  { id: 'g3-4', projectId: 'proj-3', phaseNumber: 4, status: GateStatus.LOCKED },
  { id: 'g3-5', projectId: 'proj-3', phaseNumber: 5, status: GateStatus.LOCKED },
  
  // Project 4 Gates (All Approved)
  { id: 'g4-1', projectId: 'proj-4', phaseNumber: 1, status: GateStatus.APPROVED, approvalDate: '2023-11-15' },
  { id: 'g4-2', projectId: 'proj-4', phaseNumber: 2, status: GateStatus.APPROVED, approvalDate: '2023-12-20', flowAnalysisResult: true },
  { id: 'g4-3', projectId: 'proj-4', phaseNumber: 3, status: GateStatus.APPROVED, approvalDate: '2024-02-10', tryOutCount: 2, tryOutResult: 'T2 차수에서 승인 완료' },
  { id: 'g4-4', projectId: 'proj-4', phaseNumber: 4, status: GateStatus.APPROVED, approvalDate: '2024-04-01' },
  { id: 'g4-5', projectId: 'proj-4', phaseNumber: 5, status: GateStatus.APPROVED, approvalDate: '2024-05-15' },
];

export const INITIAL_ISSUES: Issue[] = [
  {
    id: 'issue-1',
    projectId: 'proj-1',
    phase: 2,
    issueType: IssueType.POROSITY,
    description: '초기 시뮬레이션 결과 게이트 주변 가스 기공 발생 우려.',
    actionPlan: '런너 디자인 수정 및 진공 압력 상향 조정.',
    isResolved: false
  },
  {
    id: 'issue-2',
    projectId: 'proj-4',
    phase: 3,
    issueType: IssueType.DIMENSION,
    description: 'T0 시사출 결과 중앙부 0.5mm 수축 편차 발생.',
    actionPlan: '금형 코어 치수 보정 및 냉각수 온도 최적화.',
    isResolved: true
  }
];
