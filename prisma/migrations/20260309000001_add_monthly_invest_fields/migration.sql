-- AlterTable
ALTER TABLE "financial_profiles" ADD COLUMN IF NOT EXISTS "monthly_invest_tax" DECIMAL(15,2);
ALTER TABLE "financial_profiles" ADD COLUMN IF NOT EXISTS "monthly_invest_personal" DECIMAL(15,2);
