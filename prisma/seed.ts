/**
 * Prisma Seed — Thai Tax Configuration
 * Populates: tax years (2024, 2025), brackets, allowances,
 * deduction types, deduction limits, and feature flags.
 *
 * Run: npx prisma db seed
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding MyFinance database...\n");

  // ─── Deduction Types (shared across years) ─────────────────────────────────
  const deductionTypes = [
    { code: "SSF",       nameTh: "กองทุนรวม SSF",              nameEn: "Super Savings Fund (SSF)",          sortOrder: 1 },
    { code: "RMF",       nameTh: "กองทุนรวม RMF",              nameEn: "Retirement Mutual Fund (RMF)",       sortOrder: 2 },
    { code: "THAI_ESG",  nameTh: "กองทุนรวม Thai ESG",         nameEn: "Thai ESG Fund",                     sortOrder: 3 },
    { code: "LIFE_INS",  nameTh: "เบี้ยประกันชีวิต",           nameEn: "Life Insurance Premium",            sortOrder: 4 },
    { code: "HEALTH_INS",nameTh: "เบี้ยประกันสุขภาพ",          nameEn: "Health Insurance Premium",          sortOrder: 5 },
    { code: "PARENT_INS",nameTh: "เบี้ยประกันสุขภาพบิดามารดา", nameEn: "Parental Health Insurance",         sortOrder: 6 },
    { code: "MORTGAGE",  nameTh: "ดอกเบี้ยเงินกู้บ้าน",        nameEn: "Mortgage Interest",                 sortOrder: 7 },
    { code: "EASY_RECEIPT",nameTh: "ช้อปดีมีคืน (Easy E-Receipt)", nameEn: "Easy E-Receipt",               sortOrder: 8 },
  ];

  console.log("📋 Upserting deduction types...");
  const savedTypes: Record<string, string> = {};
  for (const dt of deductionTypes) {
    const saved = await prisma.deductionType.upsert({
      where: { code: dt.code },
      update: { nameTh: dt.nameTh, nameEn: dt.nameEn },
      create: dt,
    });
    savedTypes[dt.code] = saved.id;
    console.log(`  ✅ ${dt.code}`);
  }

  // ─── Tax Years ─────────────────────────────────────────────────────────────
  const years = [
    { year: 2024, labelTh: "ปีภาษี 2567", labelEn: "Tax Year 2024", isActive: true },
    { year: 2025, labelTh: "ปีภาษี 2568", labelEn: "Tax Year 2025", isActive: true },
  ];

  for (const y of years) {
    console.log(`\n📅 Seeding tax year ${y.year}...`);
    const taxYear = await prisma.taxYear.upsert({
      where: { year: y.year },
      update: { isActive: y.isActive, labelTh: y.labelTh, labelEn: y.labelEn },
      create: y,
    });

    // ── Tax Brackets ──
    await prisma.taxBracket.deleteMany({ where: { taxYearId: taxYear.id } });
    const brackets = [
      { minIncome: 0,         maxIncome: 150000,    rate: 0,  sortOrder: 1 },
      { minIncome: 150000,    maxIncome: 300000,    rate: 5,  sortOrder: 2 },
      { minIncome: 300000,    maxIncome: 500000,    rate: 10, sortOrder: 3 },
      { minIncome: 500000,    maxIncome: 750000,    rate: 15, sortOrder: 4 },
      { minIncome: 750000,    maxIncome: 1000000,   rate: 20, sortOrder: 5 },
      { minIncome: 1000000,   maxIncome: 2000000,   rate: 25, sortOrder: 6 },
      { minIncome: 2000000,   maxIncome: 5000000,   rate: 30, sortOrder: 7 },
      { minIncome: 5000000,   maxIncome: null,       rate: 35, sortOrder: 8 },
    ];
    await prisma.taxBracket.createMany({
      data: brackets.map((b) => ({ ...b, taxYearId: taxYear.id })),
    });
    console.log(`  ✅ ${brackets.length} tax brackets`);

    // ── Personal Allowances ──
    await prisma.personalAllowance.upsert({
      where: { taxYearId: taxYear.id },
      update: {},
      create: {
        taxYearId: taxYear.id,
        selfAmount: 60000,
        spouseAmount: 60000,
        childAmountPerChild: 30000,
        parentAmountPerParent: 30000,
        maxParents: 2,
        expenseDeductionRate: 50,
        expenseDeductionMax: 100000,
      },
    });
    console.log(`  ✅ Personal allowances`);

    // ── Deduction Limits ──
    const limits = [
      {
        code: "SSF",
        maxAmount: 200000,
        maxRateOfIncome: 30,
        combinedCapGroup: "SSF_RMF_ESG",
        combinedCapAmount: 500000,
      },
      {
        code: "RMF",
        maxAmount: null,
        maxRateOfIncome: 30,
        combinedCapGroup: "SSF_RMF_ESG",
        combinedCapAmount: 500000,
      },
      {
        code: "THAI_ESG",
        maxAmount: 300000,
        maxRateOfIncome: 30,
        combinedCapGroup: "SSF_RMF_ESG",
        combinedCapAmount: 500000,
      },
      { code: "LIFE_INS",    maxAmount: 100000, maxRateOfIncome: null, combinedCapGroup: null, combinedCapAmount: null },
      { code: "HEALTH_INS",  maxAmount: 25000,  maxRateOfIncome: null, combinedCapGroup: null, combinedCapAmount: null },
      { code: "PARENT_INS",  maxAmount: 30000,  maxRateOfIncome: null, combinedCapGroup: null, combinedCapAmount: null },
      { code: "MORTGAGE",    maxAmount: 100000, maxRateOfIncome: null, combinedCapGroup: null, combinedCapAmount: null },
      {
        code: "EASY_RECEIPT",
        maxAmount: y.year >= 2025 ? 50000 : 0,
        maxRateOfIncome: null,
        combinedCapGroup: null,
        combinedCapAmount: null,
      },
    ];

    for (const limit of limits) {
      const dtId = savedTypes[limit.code];
      if (!dtId) continue;
      await prisma.deductionLimit.upsert({
        where: { taxYearId_deductionTypeId: { taxYearId: taxYear.id, deductionTypeId: dtId } },
        update: {
          maxAmount: limit.maxAmount,
          maxRateOfIncome: limit.maxRateOfIncome,
          combinedCapGroup: limit.combinedCapGroup,
          combinedCapAmount: limit.combinedCapAmount,
        },
        create: {
          taxYearId: taxYear.id,
          deductionTypeId: dtId,
          maxAmount: limit.maxAmount,
          maxRateOfIncome: limit.maxRateOfIncome,
          combinedCapGroup: limit.combinedCapGroup,
          combinedCapAmount: limit.combinedCapAmount,
          isActive: true,
        },
      });
    }
    console.log(`  ✅ ${limits.length} deduction limits`);
  }

  // ─── Feature Flags ─────────────────────────────────────────────────────────
  console.log("\n🚩 Seeding feature flags...");
  const flags = [
    { key: "ai_chat",                 description: "AI chat advisor",                      freeEnabled: false, premiumEnabled: true },
    { key: "ai_tips",                 description: "Monthly AI personalized tips",          freeEnabled: false, premiumEnabled: true },
    { key: "ai_tax_optimize",         description: "AI tax optimization suggestions",       freeEnabled: false, premiumEnabled: true },
    { key: "ai_insurance_gap",        description: "AI insurance gap analysis",             freeEnabled: false, premiumEnabled: true },
    { key: "ai_health_score_explain", description: "AI explanation of health score",        freeEnabled: false, premiumEnabled: true },
    { key: "ai_insurance_recommend",  description: "AI insurance product recommendations",  freeEnabled: false, premiumEnabled: true },
    { key: "risk_assessment",         description: "Risk assessment questionnaire",         freeEnabled: true,  premiumEnabled: true },
    { key: "financial_profile",       description: "Central financial profile (My Data)",   freeEnabled: true,  premiumEnabled: true },
    { key: "tax_history",             description: "Full tax calculation history",          freeEnabled: true,  premiumEnabled: true },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { freeEnabled: flag.freeEnabled, premiumEnabled: flag.premiumEnabled, description: flag.description },
      create: flag,
    });
    console.log(`  ✅ ${flag.key} (free=${flag.freeEnabled}, premium=${flag.premiumEnabled})`);
  }

  // ─── Admin Prompt ───────────────────────────────────────────────────────────
  console.log("\n📝 Seeding admin prompt...");
  await prisma.adminPrompt.upsert({
    where: { key: "main_system_prompt" },
    update: {},
    create: {
      key: "main_system_prompt",
      content: `คุณคือ MyFinance AI ที่ปรึกษาการเงินส่วนตัวสัญชาติไทย ผู้เชี่ยวชาญด้านการวางแผนการเงิน ภาษีเงินได้บุคคลธรรมดา ประกันภัย และการลงทุน

หลักการตอบ:
- ตอบเป็นภาษาไทยเป็นหลัก เว้นแต่ผู้ใช้จะพิมพ์เป็นภาษาอังกฤษ
- อ้างอิงข้อมูลโปรไฟล์การเงินของผู้ใช้ที่ให้มาเสมอ
- เสนอทางเลือกหลายทาง โดยไฮไลต์ตัวเลือกที่เหมาะกับระดับความเสี่ยงของผู้ใช้
- ให้ข้อมูลที่ถูกต้องตามกฎหมายภาษีไทยปัจจุบัน
- ห้ามรับประกันผลตอบแทนการลงทุน
- แจ้งผู้ใช้ให้ปรึกษาผู้เชี่ยวชาญด้านภาษีหรือการเงินก่อนตัดสินใจสำคัญ

ขอบเขต: ภาษีเงินได้บุคคลธรรมดาไทย | การออม | กองทุน (SSF/RMF/Thai ESG) | ประกันชีวิต/สุขภาพ | เป้าหมายการเงิน`,
    },
  });
  console.log("  ✅ main_system_prompt");

  // ─── Demo User ──────────────────────────────────────────────────────────────
  console.log("\n👤 Seeding demo user...");

  const demoPassword = await bcrypt.hash("demo1234", 10);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@myfinance.th" },
    update: { passwordHash: demoPassword, tier: "premium", name: "สมชาย มีเงิน" },
    create: {
      email: "demo@myfinance.th",
      name: "สมชาย มีเงิน",
      passwordHash: demoPassword,
      tier: "premium",
      language: "th",
    },
  });
  console.log(`  ✅ demo@myfinance.th (password: demo1234)`);

  // Financial Profile
  await prisma.financialProfile.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      filingStatus: "married_separate",
      annualSalary: 1200000,
      bonus: 120000,
      otherIncome: 60000,
      spouseIncome: 480000,
      withheldTax: 95000,
      socialSecurity: 9000,
      providentFundAmount: 120000,
      numChildren: 1,
      numParents: 2,
      numDisabledDependents: 0,
      monthlyExpenses: 45000,
      emergencyFundAmount: 270000,
      totalDebt: 3500000,
      monthlyDebtPayment: 18000,
      lifeInsurancePremium: 24000,
      healthInsurancePremium: 15000,
      parentHealthInsurancePremium: 12000,
      annuityInsurancePremium: 36000,
      spouseLifeInsurancePremium: 0,
      rmfAmount: 96000,
      ssfAmount: 0,
      thaiEsgAmount: 60000,
      ltfAmount: 0,
    },
  });
  console.log("  ✅ FinancialProfile");

  // Risk Assessment
  await prisma.riskAssessment.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      riskLevel: "moderate",
      score: 58,
      answers: {
        q1: "b", q2: "c", q3: "b", q4: "b", q5: "b",
        q6: "c", q7: "b", q8: "b",
      },
    },
  });
  console.log("  ✅ RiskAssessment (moderate/58)");

  // Goals
  const goalDefaults = [
    {
      name: "เงินสำรองฉุกเฉิน 6 เดือน",
      goalType: "emergency_fund" as const,
      targetAmount: 270000,
      currentAmount: 270000,
      targetDate: null,
    },
    {
      name: "ซื้อบ้านหลังแรก",
      goalType: "home_car" as const,
      targetAmount: 800000,
      currentAmount: 220000,
      targetDate: new Date("2028-12-31"),
    },
    {
      name: "ทุนการศึกษาลูก",
      goalType: "education" as const,
      targetAmount: 600000,
      currentAmount: 85000,
      targetDate: new Date("2035-06-01"),
    },
    {
      name: "เกษียณอายุ 55 ปี",
      goalType: "retirement" as const,
      targetAmount: 25000000,
      currentAmount: 1800000,
      targetDate: new Date("2044-01-01"),
    },
  ];

  for (const g of goalDefaults) {
    const existing = await prisma.goal.findFirst({
      where: { userId: demoUser.id, name: g.name },
    });
    if (!existing) {
      await prisma.goal.create({ data: { userId: demoUser.id, ...g } });
    }
  }
  console.log(`  ✅ ${goalDefaults.length} Goals`);

  // Insurance Data
  await prisma.insuranceData.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      lifeInsurancePremium: 24000,
      healthInsurancePremium: 15000,
      parentHealthInsurancePremium: 12000,
      annuityInsurancePremium: 36000,
      spouseLifeInsurancePremium: 0,
      lifeCoverageAmount: 5000000,
      healthCoveragePerYear: 1000000,
      hasAccidentInsurance: true,
      hasCriticalIllness: true,
      hasDisabilityInsurance: false,
    },
  });
  console.log("  ✅ InsuranceData");

  // AI Settings
  await prisma.aiSettings.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      toneLevel: 3,
      customPrompt: "ให้เน้นเรื่องการวางแผนเกษียณอายุ และการลดหย่อนภาษีอย่างถูกกฎหมาย",
    },
  });
  console.log("  ✅ AiSettings");

  // Financial Plan
  await prisma.financialPlan.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id,
      currentAge: 34,
      maritalStatus: "married",
      numChildrenPlan: 1,
      retirementAge: 55,
      monthlyRetirementNeeds: 70000,
      hasHomeGoal: true,
      homePurchaseYears: 3,
      homeBudget: 4000000,
      hasCarGoal: false,
      carPurchaseYears: 2,
      carBudget: 800000,
      hasEducationGoal: true,
      educationYears: 15,
      educationBudget: 600000,
      emergencyFundMonths: 6,
      monthlyInvestable: 45000,
      currentSavings: 1800000,
      expectedReturn: 7.5,
      inflationRate: 3,
      targetWealthOverride: null,
    },
  });
  console.log("  ✅ FinancialPlan");

  // Tax Result (2025)
  const taxYear2025 = await prisma.taxYear.findUnique({ where: { year: 2025 } });
  if (taxYear2025) {
    const existing = await prisma.taxResult.findFirst({
      where: { userId: demoUser.id, taxYearId: taxYear2025.id },
    });
    if (!existing) {
      await prisma.taxResult.create({
        data: {
          userId: demoUser.id,
          taxYearId: taxYear2025.id,
          totalIncome: 1380000,
          totalDeductions: 487000,
          netIncome: 893000,
          taxOwed: 118000,
          withheldTax: 95000,
          taxRefund: -23000,
          effectiveRate: 8.55,
          marginalRate: 20,
          inputSnapshot: {},
        },
      });
      console.log("  ✅ TaxResult (2025) — ต้องจ่ายเพิ่ม ฿23,000");
    } else {
      console.log("  ⏭  TaxResult (2025) already exists — skipped");
    }
  }

  console.log("\n✨ Seeding complete!");
  console.log("   🔑 Demo login: demo@myfinance.th / demo1234");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
