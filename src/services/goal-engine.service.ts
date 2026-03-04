/**
 * Goal Projection Engine
 * Calculates projected completion dates and on-track status
 * using future-value formula: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
 */
import type { GoalProjection } from "@/types";

function monthlyRate(annualRate: number): number {
  return annualRate / 100 / 12;
}

/**
 * Project months needed to reach target given current amount,
 * monthly contribution, and annual return rate.
 */
export function projectGoal(
  targetAmount: number,
  currentAmount: number,
  monthlyContribution: number,
  annualReturnRate: number
): GoalProjection {
  const progressPercent = Math.min(
    100,
    Math.round((currentAmount / targetAmount) * 10000) / 100
  );

  if (currentAmount >= targetAmount) {
    return {
      projectedCompletionDate: new Date().toISOString().split("T")[0],
      onTrack: true,
      progressPercent: 100,
      monthsRemaining: 0,
    };
  }

  if (monthlyContribution <= 0 && annualReturnRate <= 0) {
    return {
      projectedCompletionDate: null,
      onTrack: false,
      progressPercent,
      monthsRemaining: null,
    };
  }

  const r = monthlyRate(annualReturnRate);
  let months = 0;
  const MAX_MONTHS = 12 * 60; // 60 years cap

  if (r <= 0) {
    // No return — simple linear projection
    if (monthlyContribution <= 0) {
      return { projectedCompletionDate: null, onTrack: false, progressPercent, monthsRemaining: null };
    }
    months = Math.ceil((targetAmount - currentAmount) / monthlyContribution);
  } else {
    // FV formula solving for n numerically (binary search)
    let lo = 0, hi = MAX_MONTHS;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const fv =
        currentAmount * Math.pow(1 + r, mid) +
        monthlyContribution * ((Math.pow(1 + r, mid) - 1) / r);
      if (fv >= targetAmount) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    months = lo;
  }

  if (months >= MAX_MONTHS) {
    return { projectedCompletionDate: null, onTrack: false, progressPercent, monthsRemaining: null };
  }

  const completionDate = new Date();
  completionDate.setMonth(completionDate.getMonth() + months);

  return {
    projectedCompletionDate: completionDate.toISOString().split("T")[0],
    onTrack: true,
    progressPercent,
    monthsRemaining: months,
  };
}

export function simulateGoal(
  targetAmount: number,
  currentAmount: number,
  newMonthlyContribution: number,
  newAnnualReturnRate: number,
  originalProjection: GoalProjection
): { projectedCompletionDate: string | null; timeSavedMonths: number } {
  const newProjection = projectGoal(
    targetAmount,
    currentAmount,
    newMonthlyContribution,
    newAnnualReturnRate
  );

  const timeSavedMonths =
    originalProjection.monthsRemaining !== null &&
    newProjection.monthsRemaining !== null
      ? Math.max(0, originalProjection.monthsRemaining - newProjection.monthsRemaining)
      : 0;

  return {
    projectedCompletionDate: newProjection.projectedCompletionDate,
    timeSavedMonths,
  };
}
