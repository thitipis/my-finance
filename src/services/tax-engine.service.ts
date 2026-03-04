/**
 * MyFinance Tax Engine (ภงด.91)
 * 100% config-driven — all rules come from the database, zero hardcoding.
 * Supports: all filing statuses, all deduction types, multi-year.
 */

import { prisma } from "@/lib/prisma";
import type {
  TaxCalculationInput,
  TaxCalculationResult,
  DeductionBreakdownItem,
  UnusedDeductionRoom,
  DeductionTypeConfig,
} from "@/types";

// ─── Load config from DB ──────────────────────────────────────────────────────

export async function getTaxConfig(yearNumber: number) {
  const taxYear = await prisma.taxYear.findFirst({
    where: { year: yearNumber, isActive: true },
    include: {
      taxBrackets: { orderBy: { sortOrder: "asc" } },
      personalAllowance: true,
      deductionLimits: {
        where: { isActive: true },
        include: { deductionType: true },
      },
    },
  });

  if (!taxYear) throw new Error(`TAX_YEAR_NOT_ACTIVE:${yearNumber}`);
  return taxYear;
}

// ─── Calculate progressive tax from brackets ─────────────────────────────────

function calculateProgressiveTax(
  taxableIncome: number,
  brackets: Array<{ minIncome: number; maxIncome: number | null; rate: number }>
): { tax: number; marginalRate: number } {
  let tax = 0;
  let marginalRate = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.minIncome) break;
    const upper = bracket.maxIncome ?? Infinity;
    const portion = Math.min(taxableIncome, upper) - bracket.minIncome;
    tax += portion * (bracket.rate / 100);
    if (taxableIncome > bracket.minIncome) {
      marginalRate = bracket.rate;
    }
  }

  return { tax: Math.max(0, tax), marginalRate };
}

// ─── Apply deduction limits from config ──────────────────────────────────────

function applyDeductionLimits(
  grossIncome: number,
  deductions: Array<{ deductionTypeId: string; code: string; amount: number }>,
  deductionConfigs: DeductionTypeConfig[]
): {
  allowed: Map<string, number>;
  combinedCaps: Map<string, number>; // group -> total used
} {
  const allowed = new Map<string, number>();
  const combinedUsed = new Map<string, number>();

  for (const config of deductionConfigs) {
    const entry = deductions.find((d) => d.deductionTypeId === config.id);
    const claimed = entry?.amount ?? 0;

    // 1. Apply individual % of income cap
    let maxFromRate = Infinity;
    if (config.maxRateOfIncome !== null) {
      maxFromRate = grossIncome * (config.maxRateOfIncome / 100);
    }

    // 2. Apply absolute max cap
    const maxFromAmount = config.maxAmount ?? Infinity;

    // 3. Effective individual limit
    let effectiveLimit = Math.min(maxFromRate, maxFromAmount);
    let allowedAmount = Math.min(claimed, effectiveLimit);

    // 4. Apply combined group cap
    if (config.combinedCapGroup && config.combinedCapAmount !== null) {
      const usedSoFar = combinedUsed.get(config.combinedCapGroup) ?? 0;
      const roomInGroup = Math.max(0, config.combinedCapAmount - usedSoFar);
      allowedAmount = Math.min(allowedAmount, roomInGroup);
      combinedUsed.set(
        config.combinedCapGroup,
        usedSoFar + allowedAmount
      );
    }

    allowed.set(config.id, allowedAmount);
  }

  return { allowed, combinedCaps: combinedUsed };
}

// ─── Main calculate function ──────────────────────────────────────────────────

export async function calculateTax(
  input: TaxCalculationInput
): Promise<TaxCalculationResult> {
  const config = await getTaxConfig(input.year);
  const allowance = config.personalAllowance;

  if (!allowance) throw new Error("MISSING_ALLOWANCE_CONFIG");

  // 1. Gross income
  const grossIncome =
    input.annualSalary +
    input.bonus +
    input.otherIncome +
    (input.filingStatus === "married_joint" ? input.spouseIncome : 0);

  // 2. Standard expense deduction (50% capped)
  const expenseDeduction = Math.min(
    grossIncome * (Number(allowance.expenseDeductionRate) / 100),
    Number(allowance.expenseDeductionMax)
  );

  // 3. Personal allowances
  const selfAllowance = Number(allowance.selfAmount);
  const spouseAllowance =
    input.filingStatus === "married_no_income" ||
    input.filingStatus === "married_joint"
      ? Number(allowance.spouseAmount)
      : 0;
  const childAllowance =
    input.numChildren * Number(allowance.childAmountPerChild);
  const parentCount = Math.min(input.numParents, allowance.maxParents);
  const parentAllowance =
    parentCount * Number(allowance.parentAmountPerParent);
  const providentFundAllowance = input.providentFund;
  const socialSecurityAllowance = input.socialSecurity;

  const personalAllowances =
    selfAllowance +
    spouseAllowance +
    childAllowance +
    parentAllowance +
    providentFundAllowance +
    socialSecurityAllowance;

  // 4. Build deduction type config list
  const deductionConfigs: DeductionTypeConfig[] = config.deductionLimits.map(
    (dl) => ({
      id: dl.deductionType.id,
      code: dl.deductionType.code,
      nameTh: dl.deductionType.nameTh,
      nameEn: dl.deductionType.nameEn,
      maxAmount: dl.maxAmount ? Number(dl.maxAmount) : null,
      maxRateOfIncome: dl.maxRateOfIncome ? Number(dl.maxRateOfIncome) : null,
      combinedCapGroup: dl.combinedCapGroup,
      combinedCapAmount: dl.combinedCapAmount
        ? Number(dl.combinedCapAmount)
        : null,
    })
  );

  // 5. Apply deduction limits
  const { allowed } = applyDeductionLimits(
    grossIncome,
    input.deductions,
    deductionConfigs
  );

  // 6. Sum other deductions
  let otherDeductions = 0;
  const breakdownItems: DeductionBreakdownItem[] = [];
  const unusedRoom: UnusedDeductionRoom[] = [];

  for (const dc of deductionConfigs) {
    const entry = input.deductions.find((d) => d.deductionTypeId === dc.id);
    const claimed = entry?.amount ?? 0;
    const allowedAmt = allowed.get(dc.id) ?? 0;

    // Marginal rate for tax saving estimate (use current bracket rate guess)
    // We'll recalculate after getting taxable income — approximate for now
    const taxSavingEst = allowedAmt * 0.2; // rough estimate, refined below

    if (claimed > 0) {
      breakdownItems.push({
        code: dc.code,
        nameTh: dc.nameTh,
        nameEn: dc.nameEn,
        claimed,
        allowed: allowedAmt,
        taxSaving: taxSavingEst,
      });
    }

    // Unused room
    const individualMax = Math.min(
      dc.maxAmount ?? Infinity,
      dc.maxRateOfIncome ? grossIncome * (dc.maxRateOfIncome / 100) : Infinity
    );
    const roomLeft = Math.max(0, individualMax - claimed);
    if (roomLeft > 0) {
      unusedRoom.push({
        code: dc.code,
        nameTh: dc.nameTh,
        nameEn: dc.nameEn,
        roomLeft,
        potentialSaving: roomLeft * 0.2, // refined below
      });
    }

    otherDeductions += allowedAmt;
  }

  // 7. Taxable income
  const totalDeductions =
    expenseDeduction + personalAllowances + otherDeductions;
  const taxableIncome = Math.max(0, grossIncome - totalDeductions);

  // 8. Progressive tax
  const brackets = config.taxBrackets.map((b) => ({
    minIncome: Number(b.minIncome),
    maxIncome: b.maxIncome ? Number(b.maxIncome) : null,
    rate: Number(b.rate),
  }));
  const { tax: taxBeforeCredit, marginalRate } = calculateProgressiveTax(
    taxableIncome,
    brackets
  );

  // 9. Refine tax saving estimates with actual marginal rate
  for (const item of breakdownItems) {
    item.taxSaving = item.allowed * (marginalRate / 100);
  }
  for (const room of unusedRoom) {
    room.potentialSaving = room.roomLeft * (marginalRate / 100);
  }

  // 10. Tax owed / refund
  const taxOwed = taxBeforeCredit - input.withheldTax;
  const effectiveRate =
    grossIncome > 0 ? (taxBeforeCredit / grossIncome) * 100 : 0;

  return {
    grossIncome,
    expenseDeduction,
    personalAllowances,
    otherDeductions,
    totalDeductions,
    taxableIncome,
    taxBeforeCredit,
    withheldTax: input.withheldTax,
    taxOwed,
    isRefund: taxOwed < 0,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
    marginalBracket: marginalRate,
    breakdown: {
      deductionsByType: breakdownItems,
      unusedDeductionRoom: unusedRoom,
    },
  };
}
