
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
  // 연도별 볼륨 (pcs)
  volume2026?: number;
  volume2027?: number;
  volume2028?: number;
  volume2029?: number;
  volume2030?: number;
  volume2031?: number;
  volume2032?: number;
  // 증작 금형 프로젝트 전용 필드
  developmentPhase?: string; // 개발 차수
  // 계획/실적 날짜 필드들
  feasibilityReviewPlan?: string; // 타당성검토서 계획
  feasibilityReviewActual?: string; // 타당성검토서 실적
  moldOrderPlan?: string; // 금형발주 계획
  moldOrderActual?: string; // 금형발주 실적
  moldDeliveryPlan?: string; // 금형 입고 계획
  moldDeliveryActual?: string; // 금형 입고 실적
  istrSubmissionPlan?: string; // istr 제출 계획
  istrSubmissionActual?: string; // istr 제출 실적
  ydcVnPpapPlan?: string; // ydc vn ppap 계획
  ydcVnPpapActual?: string; // ydc vn ppap 실적
  ppapKrSubmissionPlan?: string; // ppap kr 제출 계획
  ppapKrSubmissionActual?: string; // ppap kr 제출 실적
  ppapCustomerApprovalPlan?: string; // ppap 고객 승인 계획
  ppapCustomerApprovalActual?: string; // ppap 고객 승인 실적
  ydcVnSopPlan?: string; // ydc vn sop 계획
  ydcVnSopActual?: string; // ydc vn sop 실적
  customerSopPlan?: string; // 고객 sop 계획
  customerSopActual?: string; // 고객 sop 실적
  deliverySchedulePlan?: string; // 납품일정 계획
  deliveryScheduleActual?: string; // 납품일정 실적
}
