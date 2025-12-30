
export enum ProjectStatus {
  IN_PROGRESS = '진행중',
  COMPLETED = '완료'
}

export enum ProjectType {
  NEW_DEVELOPMENT = '신규 개발',
  INCREMENTAL_MOLD = '증작 금형'
}

export enum GateStatus {
  LOCKED = '잠금',
  OPEN = '진행중',
  APPROVED = '승인완료'
}

export enum IssueType {
  POROSITY = '기공 (Porosity)',
  UNDERFILL = '미성형 (Underfill)',
  DIMENSION = '치수 불량 (Dimension)',
  SURFACE = '표면 결함 (Surface)',
  OTHERS = '기타'
}

export interface Gate {
  id: string;
  projectId: string;
  phaseNumber: number; // 1 to 5
  status: GateStatus;
  approvalDate?: string;
  flowAnalysisResult?: boolean; // Phase 2 specific
  tryOutCount?: number; // Phase 3 specific (T0, T1, T2...)
  tryOutResult?: string; // Phase 3 specific
}

export interface Issue {
  id: string;
  projectId: string;
  phase: number;
  issueType: IssueType;
  description: string;
  actionPlan: string;
  isResolved: boolean;
}

export interface Project {
  id: string;
  customerName: string;
  carModel: string;
  partName: string;
  partNumber: string;
  moldCavity: number;
  sopDate: string;
  status: ProjectStatus;
  type: ProjectType;
  material: string;
  createdAt: string;
  // 일정 필드
  fotDate?: string;
  faiDate?: string;
  p1Date?: string;
  p2Date?: string;
  runAtRateDate?: string;
  ppapDate?: string;
  customerSopDate?: string;
}
