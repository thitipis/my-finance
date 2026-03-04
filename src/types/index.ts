// Shared TypeScript types across the app

export type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fields?: string[] };

// ─── Tax ─────────────────────────────────────────────────────────────────────

export type FilingStatus =
  | "single"
  | "married_no_income"
  | "married_separate"
  | "married_joint";

export interface TaxBracketConfig {
  minIncome: number;
  maxIncome: number | null;
  rate: number;
  sortOrder: number;
}

export interface PersonalAllowanceConfig {
  selfAmount: number;
  spouseAmount: number;
  childAmountPerChild: number;
  parentAmountPerParent: number;
  maxParents: number;
  expenseDeductionRate: number;
  expenseDeductionMax: number;
}

export interface DeductionTypeConfig {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  maxAmount: number | null;
  maxRateOfIncome: number | null;
  combinedCapGroup: string | null;
  combinedCapAmount: number | null;
}

export interface TaxCalculationInput {
  year: number;
  filingStatus: FilingStatus;
  annualSalary: number;
  bonus: number;
  otherIncome: number;
  spouseIncome: number;
  withheldTax: number;
  providentFund: number;
  socialSecurity: number;
  numChildren: number;
  numParents: number;
  deductions: Array<{ deductionTypeId: string; code: string; amount: number }>;
}

export interface DeductionBreakdownItem {
  code: string;
  nameTh: string;
  nameEn: string;
  claimed: number;
  allowed: number;
  taxSaving: number;
}

export interface UnusedDeductionRoom {
  code: string;
  nameTh: string;
  nameEn: string;
  roomLeft: number;
  potentialSaving: number;
}

export interface TaxCalculationResult {
  grossIncome: number;
  expenseDeduction: number;
  personalAllowances: number;
  otherDeductions: number;
  totalDeductions: number;
  taxableIncome: number;
  taxBeforeCredit: number;
  withheldTax: number;
  taxOwed: number;
  isRefund: boolean;
  effectiveRate: number;
  marginalBracket: number;
  breakdown: {
    deductionsByType: DeductionBreakdownItem[];
    unusedDeductionRoom: UnusedDeductionRoom[];
  };
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export type GoalType =
  | "retirement"
  | "emergency_fund"
  | "investment"
  | "home_car"
  | "education"
  | "custom";

export interface GoalProjection {
  projectedCompletionDate: string | null;
  onTrack: boolean;
  progressPercent: number;
  monthsRemaining: number | null;
}

// ─── Feature Flags ───────────────────────────────────────────────────────────

export type FeatureFlagKey =
  | "ai_advisor"
  | "ai_tax_advice"
  | "ai_chat"
  | "ai_tips"
  | "ai_tax_optimize"
  | "ai_insurance_gap"
  | "ai_health_score_explain";

export type Tier = "free" | "premium";
