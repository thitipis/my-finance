// Shared Investment Plan constants used by both investment-plan and financial-plan pages

export type Instrument = { name: string; alloc: number; note: string };

export type OptionPlan = {
  label: string;
  returnRate: number;
  rebalance: string;
  desc: string;
  colorKey: "amber" | "blue" | "emerald";
  instruments: Instrument[];
};

export type PlanOption = "soft" | "balanced" | "hard";

export const PLANS: Record<string, { soft: OptionPlan; balanced: OptionPlan; hard: OptionPlan }> = {
  conservative: {
    soft: {
      label: "แผนพื้นฐาน",
      returnRate: 5,
      rebalance: "ปีละครั้ง",
      desc: "3 กองทุน ความเสี่ยงต่ำมาก เน้นตราสารหนี้",
      colorKey: "amber",
      instruments: [
        { name: "กองทุนตราสารหนี้ไทย", alloc: 50, note: "พื้นฐานมั่นคง" },
        { name: "กองทุนหุ้นไทย (SET50)", alloc: 30, note: "Growth ในประเทศ" },
        { name: "กองทุนทองคำ", alloc: 20, note: "ป้องกันความเสี่ยง" },
      ],
    },
    balanced: {
      label: "แผนสมดุล",
      returnRate: 7,
      rebalance: "ทุก 6 เดือน",
      desc: "4 สินทรัพย์ ผสมตราสารหนี้-หุ้น ความเสี่ยงปานกลาง",
      colorKey: "blue",
      instruments: [
        { name: "พันธบัตรรัฐบาล / ตราสารหนี้", alloc: 30, note: "Core Safety" },
        { name: "กองทุนหุ้นไทย (SET50)", alloc: 35, note: "Domestic Equity" },
        { name: "US ETF (VTI)", alloc: 25, note: "Global Diversify" },
        { name: "ทองคำ", alloc: 10, note: "Hedge" },
      ],
    },
    hard: {
      label: "แผนเชิงรุก",
      returnRate: 9,
      rebalance: "ไตรมาสละครั้ง",
      desc: "5 สินทรัพย์หลากหลาย เพิ่ม Equity ผลตอบแทนสูงขึ้น",
      colorKey: "emerald",
      instruments: [
        { name: "พันธบัตรรัฐบาล", alloc: 15, note: "Core Safety" },
        { name: "หุ้นไทยขนาดใหญ่ (SET50)", alloc: 30, note: "Domestic Core" },
        { name: "US ETF (VTI/VOO)", alloc: 30, note: "Global Growth" },
        { name: "REITs ไทย", alloc: 15, note: "Passive Income" },
        { name: "ทองคำ / Commodities", alloc: 10, note: "Hedge" },
      ],
    },
  },
  moderate: {
    soft: {
      label: "แผนพื้นฐาน",
      returnRate: 6,
      rebalance: "ปีละครั้ง",
      desc: "3 กองทุนหลัก ผสมสมดุล ลงทุนง่าย ปรับปีละครั้ง",
      colorKey: "amber",
      instruments: [
        { name: "กองทุนตราสารหนี้ผสม", alloc: 25, note: "Stabilizer" },
        { name: "กองทุนหุ้นไทย (SET100)", alloc: 45, note: "Core Growth" },
        { name: "กองทุนหุ้นต่างประเทศ", alloc: 30, note: "Global Diversify" },
      ],
    },
    balanced: {
      label: "แผนสมดุล",
      returnRate: 8,
      rebalance: "ทุก 6 เดือน",
      desc: "4 สินทรัพย์ เพิ่ม REIT-Global ผลตอบแทนดีขึ้น",
      colorKey: "blue",
      instruments: [
        { name: "ตราสารหนี้ระยะกลาง", alloc: 15, note: "Buffer" },
        { name: "หุ้นไทย (SET100)", alloc: 35, note: "Core Domestic" },
        { name: "US ETF (VTI / QQQ)", alloc: 30, note: "Global Growth" },
        { name: "REITs (ไทย + US)", alloc: 20, note: "Yield + Growth" },
      ],
    },
    hard: {
      label: "แผนเชิงรุก",
      returnRate: 10,
      rebalance: "ไตรมาสละครั้ง",
      desc: "5 สินทรัพย์หลากหลาย เน้น Alpha และ Global Exposure",
      colorKey: "emerald",
      instruments: [
        { name: "ตราสารหนี้ระยะสั้น", alloc: 10, note: "Liquidity Buffer" },
        { name: "หุ้นไทย (SET100)", alloc: 30, note: "Home Bias Reduced" },
        { name: "US ETF (QQQ / VTI)", alloc: 30, note: "Mega Cap Growth" },
        { name: "REITs (ไทย + US)", alloc: 15, note: "Yield Income" },
        { name: "Emerging Markets ETF", alloc: 15, note: "High Beta Alpha" },
      ],
    },
  },
  aggressive: {
    soft: {
      label: "แผนพื้นฐาน",
      returnRate: 8,
      rebalance: "ปีละครั้ง",
      desc: "3 กองทุน เน้น Equity Growth จัดสรรง่าย",
      colorKey: "amber",
      instruments: [
        { name: "กองทุนหุ้นไทย", alloc: 30, note: "Local Core" },
        { name: "กองทุนหุ้นโลก (Passive)", alloc: 55, note: "Global Equity Core" },
        { name: "กองทุน REIT / ทอง", alloc: 15, note: "Alternative Hedge" },
      ],
    },
    balanced: {
      label: "แผนสมดุล",
      returnRate: 10,
      rebalance: "ทุก 6 เดือน",
      desc: "4 สินทรัพย์ Global Equity + Emerging เพิ่ม Beta",
      colorKey: "blue",
      instruments: [
        { name: "หุ้นไทยเลือกสรร", alloc: 25, note: "Active Domestic" },
        { name: "US ETF (QQQ / VTI)", alloc: 35, note: "High Growth" },
        { name: "Emerging Markets ETF", alloc: 25, note: "High Beta" },
        { name: "REITs + ทองคำ", alloc: 15, note: "Hedge" },
      ],
    },
    hard: {
      label: "แผนเชิงรุก",
      returnRate: 12,
      rebalance: "ไตรมาสละครั้ง",
      desc: "5 สินทรัพย์ High Conviction เน้น Alpha สูงสุด",
      colorKey: "emerald",
      instruments: [
        { name: "US Growth ETF (QQQ)", alloc: 30, note: "High Conviction" },
        { name: "หุ้นไทยเลือกสรร", alloc: 20, note: "Active Selection" },
        { name: "Emerging Markets ETF", alloc: 20, note: "High Beta" },
        { name: "REITs + Infrastructure", alloc: 15, note: "Yield Play" },
        { name: "Crypto (BTC / ETH)", alloc: 15, note: "Alpha Bet" },
      ],
    },
  },
};

/** Reverse-lookup which plan option matches a saved expectedReturn */
export function findActivePlan(
  riskLevel: string | null | undefined,
  expectedReturn: number | null | undefined,
): { key: PlanOption; plan: OptionPlan } | null {
  if (!riskLevel || expectedReturn == null) return null;
  const opts = PLANS[riskLevel];
  if (!opts) return null;
  for (const [k, p] of Object.entries(opts) as [PlanOption, OptionPlan][]) {
    if (p.returnRate === expectedReturn) return { key: k, plan: p };
  }
  return null;
}
