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
  const demoProfileData = {
    filingStatus: "married_separate" as const,
    annualSalary: 1200000,
    bonus: 120000,
    otherIncome: 60000,
    spouseIncome: 480000,
    withheldTax: 95000,
    socialSecurity: 9000,
    providentFundAmount: 120000,
    providentFundRate: 5,
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
    ssfAmount: 60000,
    thaiEsgAmount: 90000,
    ltfAmount: 0,
    // Personal portfolio (current market value)
    goldAmount: 350000,
    cryptoAmount: 280000,
    etfAmount: 450000,
    thaiStockAmount: 180000,
    foreignStockAmount: 320000,
    otherInvestAmount: 120000,
  };

  await prisma.financialProfile.upsert({
    where: { userId: demoUser.id },
    update: demoProfileData,
    create: { userId: demoUser.id, ...demoProfileData },
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

  // AI Settings — default to Ollama (llama3.2) running in Docker
  await prisma.aiSettings.upsert({
    where: { userId: demoUser.id },
    update: {
      toneLevel: 3,
      aiProvider: "ollama",
      aiModel: "llama3.2",
      ollamaBaseUrl: "http://ollama:11434",
      customPrompt: "ให้เน้นเรื่องการวางแผนเกษียณอายุ และการลดหย่อนภาษีอย่างถูกกฎหมาย",
    },
    create: {
      userId: demoUser.id,
      toneLevel: 3,
      aiProvider: "ollama",
      aiModel: "llama3.2",
      ollamaBaseUrl: "http://ollama:11434",
      customPrompt: "ให้เน้นเรื่องการวางแผนเกษียณอายุ และการลดหย่อนภาษีอย่างถูกกฎหมาย",
    },
  });
  console.log("  ✅ AiSettings (Ollama / llama3.2 @ http://ollama:11434)");

  // Financial Plan
  const demoPlanData = {
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
  };

  await prisma.financialPlan.upsert({
    where: { userId: demoUser.id },
    update: demoPlanData,
    create: { userId: demoUser.id, ...demoPlanData },
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

  // ─── Instrument Catalog ─────────────────────────────────────────────────────
  console.log("\n📊 Seeding instrument catalog...");

  type InstrumentInput = {
    assetType: string; ticker: string; nameTh?: string; nameEn?: string;
    exchange?: string; provider?: string; sector?: string;
  };

  const instruments: InstrumentInput[] = [
    // ── Thai Stocks (SET) ──────────────────────────────────────────────────
    { assetType: "thai_stock", ticker: "PTT",    nameTh: "ปตท.",                       nameEn: "PTT Public Company",           exchange: "SET", sector: "Energy" },
    { assetType: "thai_stock", ticker: "PTTEP",  nameTh: "ปตท.สผ.",                   nameEn: "PTT Exploration & Production", exchange: "SET", sector: "Energy" },
    { assetType: "thai_stock", ticker: "PTTGC",  nameTh: "พีทีที โกลบอล เคมิคอล",    nameEn: "PTT Global Chemical",          exchange: "SET", sector: "Petrochemical" },
    { assetType: "thai_stock", ticker: "ADVANC", nameTh: "แอดวานซ์ อินโฟร์ เซอร์วิส",nameEn: "Advanced Info Service",        exchange: "SET", sector: "Telecom" },
    { assetType: "thai_stock", ticker: "TRUE",   nameTh: "ทรู คอร์ปอเรชั่น",         nameEn: "True Corporation",             exchange: "SET", sector: "Telecom" },
    { assetType: "thai_stock", ticker: "INTUCH", nameTh: "อินทัช โฮลดิ้งส์",         nameEn: "Intouch Holdings",             exchange: "SET", sector: "Telecom" },
    { assetType: "thai_stock", ticker: "AOT",    nameTh: "ท่าอากาศยานไทย",           nameEn: "Airports of Thailand",         exchange: "SET", sector: "Transport" },
    { assetType: "thai_stock", ticker: "KBANK",  nameTh: "กสิกรไทย",                 nameEn: "Kasikornbank",                 exchange: "SET", sector: "Banking" },
    { assetType: "thai_stock", ticker: "SCB",    nameTh: "ไทยพาณิชย์",               nameEn: "SCB X",                        exchange: "SET", sector: "Banking" },
    { assetType: "thai_stock", ticker: "BBL",    nameTh: "กรุงเทพ",                  nameEn: "Bangkok Bank",                 exchange: "SET", sector: "Banking" },
    { assetType: "thai_stock", ticker: "KTB",    nameTh: "กรุงไทย",                  nameEn: "Krungthai Bank",               exchange: "SET", sector: "Banking" },
    { assetType: "thai_stock", ticker: "BAY",    nameTh: "กรุงศรีอยุธยา",            nameEn: "Bank of Ayudhya",              exchange: "SET", sector: "Banking" },
    { assetType: "thai_stock", ticker: "KKP",    nameTh: "เกียรตินาคินภัทร",         nameEn: "Kiatnakin Phatra Bank",        exchange: "SET", sector: "Banking" },
    { assetType: "thai_stock", ticker: "TISCO",  nameTh: "ทิสโก้ ไฟแนนเชียล",       nameEn: "TISCO Financial Group",        exchange: "SET", sector: "Banking" },
    { assetType: "thai_stock", ticker: "CPALL",  nameTh: "ซีพี ออลล์",               nameEn: "CP All",                       exchange: "SET", sector: "Commerce" },
    { assetType: "thai_stock", ticker: "MAKRO",  nameTh: "สยามแม็คโคร",              nameEn: "Siam Makro",                   exchange: "SET", sector: "Commerce" },
    { assetType: "thai_stock", ticker: "HMPRO",  nameTh: "โฮม โปรดักส์ เซ็นเตอร์",  nameEn: "Home Product Center",          exchange: "SET", sector: "Commerce" },
    { assetType: "thai_stock", ticker: "CPN",    nameTh: "เซ็นทรัลพัฒนา",            nameEn: "Central Pattana",              exchange: "SET", sector: "Property" },
    { assetType: "thai_stock", ticker: "MINT",   nameTh: "ไมเนอร์ อินเตอร์เนชั่นแนล",nameEn: "Minor International",          exchange: "SET", sector: "Tourism" },
    { assetType: "thai_stock", ticker: "BDMS",   nameTh: "กรุงเทพดุสิตเวชการ",       nameEn: "Bangkok Dusit Medical",        exchange: "SET", sector: "Healthcare" },
    { assetType: "thai_stock", ticker: "BH",     nameTh: "โรงพยาบาลบำรุงราษฎร์",     nameEn: "Bumrungrad Hospital",          exchange: "SET", sector: "Healthcare" },
    { assetType: "thai_stock", ticker: "SCC",    nameTh: "ปูนซิเมนต์ไทย",            nameEn: "Siam Cement Group",            exchange: "SET", sector: "Industrial" },
    { assetType: "thai_stock", ticker: "DELTA",  nameTh: "เดลต้า อีเลคโทรนิคส์",    nameEn: "Delta Electronics Thailand",   exchange: "SET", sector: "Electronics" },
    { assetType: "thai_stock", ticker: "GPSC",   nameTh: "โกลบอล เพาเวอร์ ซินเนอร์ยี่",nameEn: "Global Power Synergy",       exchange: "SET", sector: "Energy" },
    { assetType: "thai_stock", ticker: "EA",     nameTh: "เอนเนอร์ยี่ แอบโซลูท",    nameEn: "Energy Absolute",              exchange: "SET", sector: "Energy" },
    { assetType: "thai_stock", ticker: "IVL",    nameTh: "อินโดรามา เวนเจอร์ส",      nameEn: "Indorama Ventures",            exchange: "SET", sector: "Petrochemical" },
    { assetType: "thai_stock", ticker: "MTC",    nameTh: "เมืองไทย แคปปิตอล",        nameEn: "Muangthai Capital",            exchange: "SET", sector: "Finance" },
    { assetType: "thai_stock", ticker: "WHA",    nameTh: "ดับบลิวเอชเอ คอร์ปอเรชั่น",nameEn: "WHA Corporation",             exchange: "SET", sector: "Industrial" },
    { assetType: "thai_stock", ticker: "BJC",    nameTh: "เบอร์ลี่ ยุคเกอร์",        nameEn: "Berli Jucker",                 exchange: "SET", sector: "Commerce" },
    // ── Thai REITs ──────────────────────────────────────────────────────────
    { assetType: "thai_reit",  ticker: "CPNREIT", nameTh: "เซ็นทรัล รีเทล รีท",    nameEn: "CPN Retail Growth REIT",       exchange: "SET", sector: "REIT" },
    { assetType: "thai_reit",  ticker: "WHART",   nameTh: "ดับบลิวเอชเอ รีท",       nameEn: "WHA Premium Growth Freehold",  exchange: "SET", sector: "REIT" },
    { assetType: "thai_reit",  ticker: "LHPF",    nameTh: "แอล เอช โฮสพิทอลลิตี้", nameEn: "LH Hospitality REIT",          exchange: "SET", sector: "REIT" },
    { assetType: "thai_reit",  ticker: "TREIT",   nameTh: "ทีพาร์ค บีเอฟทีแซด รีท",nameEn: "TPARK BFTZ REIT",             exchange: "SET", sector: "REIT" },
    // ── Thai Mutual Funds ────────────────────────────────────────────────────
    { assetType: "thai_fund", ticker: "KMASTER",      nameTh: "กรุงศรี หุ้นระยะยาว",      nameEn: "Krungsri Master Fund",      provider: "Krungsri" },
    { assetType: "thai_fund", ticker: "SCBDV",        nameTh: "ไทยพาณิชย์ ดีวิเดนด์",     nameEn: "SCB Dividend Stock",        provider: "SCB Asset Mgmt" },
    { assetType: "thai_fund", ticker: "KFLTFD70",     nameTh: "กรุงศรีตราสารหนี้ 70%",    nameEn: "KF LT Fixed 70",           provider: "Krungsri" },
    { assetType: "thai_fund", ticker: "SCBS&P500",    nameTh: "ไทยพาณิชย์ S&P 500",       nameEn: "SCB S&P 500",              provider: "SCB Asset Mgmt" },
    { assetType: "thai_fund", ticker: "K-USXNDQ75A",  nameTh: "กสิกรไทย US Nasdaq 75A",   nameEn: "KAsset US Nasdaq 75",      provider: "KAsset" },
    { assetType: "thai_fund", ticker: "TMBUSINDX",    nameTh: "ทีเอ็มบี US Index",         nameEn: "TMB US Index",             provider: "TMB Asset Mgmt" },
    { assetType: "thai_fund", ticker: "PHATRA-EQ",    nameTh: "ภัทร กองทุนตราสารทุน",      nameEn: "Phatra Equity Fund",       provider: "Phatra Asset Mgmt" },
    { assetType: "thai_fund", ticker: "ONE-ULT",      nameTh: "วัน อัลติเมท",              nameEn: "One Ultimate Fund",        provider: "One Asset Mgmt" },
    { assetType: "thai_fund", ticker: "ASP-DIVA",     nameTh: "เอเอสพี ไดวา",              nameEn: "ASP Diva Fund",            provider: "ASP" },
    // ── US ETFs ──────────────────────────────────────────────────────────────
    { assetType: "us_etf", ticker: "VTI",  nameTh: "วีทีไอ (หุ้นสหรัฐทั้งตลาด)",  nameEn: "Vanguard Total Stock Market ETF",   exchange: "NYSE",   sector: "Broad Market" },
    { assetType: "us_etf", ticker: "VOO",  nameTh: "วีโอโอ (S&P500)",              nameEn: "Vanguard S&P 500 ETF",             exchange: "NYSE",   sector: "Large Cap" },
    { assetType: "us_etf", ticker: "SPY",  nameTh: "สปาย (S&P500 SPDR)",           nameEn: "SPDR S&P 500 ETF",                 exchange: "NYSE",   sector: "Large Cap" },
    { assetType: "us_etf", ticker: "QQQ",  nameTh: "คิวคิวคิว (Nasdaq-100)",       nameEn: "Invesco QQQ Trust",                exchange: "NASDAQ", sector: "Technology" },
    { assetType: "us_etf", ticker: "VWRA", nameTh: "วีดับเบิ้ลยูอาร์เอ (โลก)",    nameEn: "Vanguard FTSE All-World UCITS",    exchange: "LSE",    sector: "World" },
    { assetType: "us_etf", ticker: "VT",   nameTh: "วีที (หุ้นโลก)",               nameEn: "Vanguard Total World Stock ETF",   exchange: "NYSE",   sector: "World" },
    { assetType: "us_etf", ticker: "VXUS", nameTh: "วีเอ็กซ์ยูเอส (นอกสหรัฐ)",   nameEn: "Vanguard Total International",     exchange: "NASDAQ", sector: "International" },
    { assetType: "us_etf", ticker: "VEA",  nameTh: "วีอีเอ (ตลาดพัฒนาแล้ว)",     nameEn: "Vanguard FTSE Developed Markets",  exchange: "NYSE",   sector: "Developed" },
    { assetType: "us_etf", ticker: "VWO",  nameTh: "วีดับเบิ้ลยูโอ (ตลาดเกิดใหม่)",nameEn: "Vanguard FTSE Emerging Markets",   exchange: "NYSE",   sector: "Emerging" },
    { assetType: "us_etf", ticker: "BND",  nameTh: "บีเอ็นดี (ตราสารหนี้สหรัฐ)",  nameEn: "Vanguard Total Bond Market ETF",   exchange: "NASDAQ", sector: "Fixed Income" },
    { assetType: "us_etf", ticker: "ARKK", nameTh: "อาร์เคเค (Tech Innovation)",   nameEn: "ARK Innovation ETF",               exchange: "NYSE",   sector: "Innovation" },
    { assetType: "us_etf", ticker: "GLD",  nameTh: "จีแอลดี (ทองคำ SPDR)",         nameEn: "SPDR Gold Shares",                 exchange: "NYSE",   sector: "Commodity" },
    { assetType: "us_etf", ticker: "VNQ",  nameTh: "วีเอ็นคิว (REIT สหรัฐ)",      nameEn: "Vanguard Real Estate ETF",         exchange: "NYSE",   sector: "Real Estate" },
    // ── US Stocks ────────────────────────────────────────────────────────────
    { assetType: "us_stock", ticker: "AAPL",  nameTh: "แอปเปิล",         nameEn: "Apple Inc.",           exchange: "NASDAQ", sector: "Technology" },
    { assetType: "us_stock", ticker: "MSFT",  nameTh: "ไมโครซอฟท์",      nameEn: "Microsoft Corp.",      exchange: "NASDAQ", sector: "Technology" },
    { assetType: "us_stock", ticker: "GOOGL", nameTh: "อัลฟาเบท/กูเกิล", nameEn: "Alphabet Inc.",        exchange: "NASDAQ", sector: "Technology" },
    { assetType: "us_stock", ticker: "AMZN",  nameTh: "แอมาซอน",         nameEn: "Amazon.com Inc.",      exchange: "NASDAQ", sector: "Commerce" },
    { assetType: "us_stock", ticker: "NVDA",  nameTh: "เอ็นวิเดีย",      nameEn: "NVIDIA Corporation",   exchange: "NASDAQ", sector: "Semiconductors" },
    { assetType: "us_stock", ticker: "META",  nameTh: "เมตา แพลตฟอร์ม",  nameEn: "Meta Platforms Inc.",  exchange: "NASDAQ", sector: "Technology" },
    { assetType: "us_stock", ticker: "TSLA",  nameTh: "เทสลา",           nameEn: "Tesla Inc.",           exchange: "NASDAQ", sector: "EV/Auto" },
    { assetType: "us_stock", ticker: "AVGO",  nameTh: "บรอดคอม",         nameEn: "Broadcom Inc.",        exchange: "NASDAQ", sector: "Semiconductors" },
    { assetType: "us_stock", ticker: "JPM",   nameTh: "เจพีมอร์แกน",     nameEn: "JPMorgan Chase",       exchange: "NYSE",   sector: "Banking" },
    { assetType: "us_stock", ticker: "V",     nameTh: "วีซ่า",            nameEn: "Visa Inc.",            exchange: "NYSE",   sector: "Payments" },
    { assetType: "us_stock", ticker: "MA",    nameTh: "มาสเตอร์การ์ด",   nameEn: "Mastercard Inc.",      exchange: "NYSE",   sector: "Payments" },
    { assetType: "us_stock", ticker: "COIN",  nameTh: "คอยน์เบส",         nameEn: "Coinbase Global",      exchange: "NASDAQ", sector: "Crypto Exchange" },
    // ── Crypto ────────────────────────────────────────────────────────────
    { assetType: "crypto", ticker: "BTC",   nameTh: "บิตคอยน์",              nameEn: "Bitcoin",          exchange: "Crypto", sector: "Layer 1" },
    { assetType: "crypto", ticker: "ETH",   nameTh: "อีเธอเรียม",            nameEn: "Ethereum",         exchange: "Crypto", sector: "Layer 1" },
    { assetType: "crypto", ticker: "BNB",   nameTh: "บีเอ็นบี",              nameEn: "BNB (Binance)",    exchange: "Crypto", sector: "Exchange Token" },
    { assetType: "crypto", ticker: "SOL",   nameTh: "โซลานา",               nameEn: "Solana",           exchange: "Crypto", sector: "Layer 1" },
    { assetType: "crypto", ticker: "XRP",   nameTh: "ริปเปิล",               nameEn: "XRP",              exchange: "Crypto", sector: "Payments" },
    { assetType: "crypto", ticker: "ADA",   nameTh: "คาร์ดาโน",             nameEn: "Cardano",          exchange: "Crypto", sector: "Layer 1" },
    { assetType: "crypto", ticker: "AVAX",  nameTh: "อาวาแลนช์",            nameEn: "Avalanche",        exchange: "Crypto", sector: "Layer 1" },
    { assetType: "crypto", ticker: "DOGE",  nameTh: "โดจคอยน์",             nameEn: "Dogecoin",         exchange: "Crypto", sector: "Meme" },
    { assetType: "crypto", ticker: "DOT",   nameTh: "พอลกาด็อต",            nameEn: "Polkadot",         exchange: "Crypto", sector: "Layer 0" },
    { assetType: "crypto", ticker: "LINK",  nameTh: "เชนลิงค์",             nameEn: "Chainlink",        exchange: "Crypto", sector: "Oracle" },
    { assetType: "crypto", ticker: "MATIC", nameTh: "โพลิกอน",              nameEn: "Polygon (POL)",    exchange: "Crypto", sector: "Layer 2" },
    { assetType: "crypto", ticker: "UNI",   nameTh: "ยูนิสวอป",             nameEn: "Uniswap",          exchange: "Crypto", sector: "DeFi" },
    { assetType: "crypto", ticker: "SUI",   nameTh: "ซุย",                  nameEn: "Sui",              exchange: "Crypto", sector: "Layer 1" },
    { assetType: "crypto", ticker: "APT",   nameTh: "แอปทอส",               nameEn: "Aptos",            exchange: "Crypto", sector: "Layer 1" },
    { assetType: "crypto", ticker: "ARB",   nameTh: "อาร์บิทรัม",           nameEn: "Arbitrum",         exchange: "Crypto", sector: "Layer 2" },
    { assetType: "crypto", ticker: "TON",   nameTh: "เดอะ โอเพ่น เน็ตเวิร์ค",nameEn: "Toncoin",        exchange: "Crypto", sector: "Layer 1" },
    { assetType: "crypto", ticker: "NEAR",  nameTh: "เนียร์",               nameEn: "NEAR Protocol",    exchange: "Crypto", sector: "Layer 1" },
    { assetType: "crypto", ticker: "USDT",  nameTh: "เทเธอร์",              nameEn: "Tether",           exchange: "Crypto", sector: "Stablecoin" },
    { assetType: "crypto", ticker: "USDC",  nameTh: "ยูเอสดีซี",            nameEn: "USD Coin",         exchange: "Crypto", sector: "Stablecoin" },
    // ── Gold ──────────────────────────────────────────────────────────────
    { assetType: "gold", ticker: "GOLD_BAR",     nameTh: "ทองคำแท่ง (96.5%)",     nameEn: "Gold Bar 96.5%",      sector: "Physical Gold" },
    { assetType: "gold", ticker: "GOLD_ONLINE",   nameTh: "ทองออนไลน์ / Gold Spot",nameEn: "Gold Online",         sector: "Physical Gold" },
    { assetType: "gold", ticker: "GOLD_JEWELRY",  nameTh: "ทองรูปพรรณ (96.5%)",   nameEn: "Gold Jewelry 96.5%",  sector: "Physical Gold" },
  ];

  let instrumentCount = 0;
  for (const inst of instruments) {
    await (prisma as any).instrumentCatalog.upsert({
      where: { assetType_ticker: { assetType: inst.assetType, ticker: inst.ticker } },
      update: { nameTh: inst.nameTh, nameEn: inst.nameEn, exchange: inst.exchange, provider: inst.provider, sector: inst.sector },
      create: inst,
    });
    instrumentCount++;
  }
  console.log(`  ✅ ${instrumentCount} instruments seeded`);

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
