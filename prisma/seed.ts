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
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { freeEnabled: flag.freeEnabled, premiumEnabled: flag.premiumEnabled, description: flag.description },
      create: flag,
    });
    console.log(`  ✅ ${flag.key} (free=${flag.freeEnabled}, premium=${flag.premiumEnabled})`);
  }

  console.log("\n✨ Seeding complete!");
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
