-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('conservative', 'moderate', 'aggressive');

-- AlterTable
ALTER TABLE "insurance_data" ADD COLUMN     "has_accident_insurance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_critical_illness" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_disability_insurance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "health_coverage_per_year" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "life_coverage_amount" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "financial_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "filing_status" "FilingStatus" NOT NULL DEFAULT 'single',
    "num_children" INTEGER NOT NULL DEFAULT 0,
    "num_parents" INTEGER NOT NULL DEFAULT 0,
    "num_disabled_dependents" INTEGER NOT NULL DEFAULT 0,
    "annual_salary" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "other_income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "spouse_income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "withheld_tax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "social_security" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "provident_fund_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "provident_fund_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "life_insurance_premium" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "health_insurance_premium" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "parent_health_insurance_premium" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "annuity_insurance_premium" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "spouse_life_insurance_premium" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ltf_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "rmf_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ssf_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "thai_esg_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_debt" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "monthly_debt_payment" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "emergency_fund_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "monthly_expenses" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_assessments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "risk_level" "RiskLevel" NOT NULL,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tax_year_id" TEXT NOT NULL,
    "input_snapshot" JSONB NOT NULL,
    "total_income" DECIMAL(15,2) NOT NULL,
    "total_deductions" DECIMAL(15,2) NOT NULL,
    "net_income" DECIMAL(15,2) NOT NULL,
    "tax_owed" DECIMAL(15,2) NOT NULL,
    "withheld_tax" DECIMAL(15,2) NOT NULL,
    "tax_refund" DECIMAL(15,2) NOT NULL,
    "effective_rate" DECIMAL(5,2) NOT NULL,
    "marginal_rate" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tone_level" INTEGER NOT NULL DEFAULT 3,
    "custom_prompt" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_prompts" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "content" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "admin_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "financial_profiles_user_id_key" ON "financial_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_assessments_user_id_key" ON "risk_assessments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_settings_user_id_key" ON "ai_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_prompts_key_key" ON "admin_prompts"("key");

-- AddForeignKey
ALTER TABLE "financial_profiles" ADD CONSTRAINT "financial_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_results" ADD CONSTRAINT "tax_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_results" ADD CONSTRAINT "tax_results_tax_year_id_fkey" FOREIGN KEY ("tax_year_id") REFERENCES "tax_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
