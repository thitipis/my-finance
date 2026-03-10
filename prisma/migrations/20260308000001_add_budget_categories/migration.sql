-- AlterTable: Add monthly budget category columns to financial_profiles
ALTER TABLE "financial_profiles"
  ADD COLUMN "budget_housing"       DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "budget_food"          DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "budget_transport"     DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "budget_utilities"     DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "budget_healthcare"    DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "budget_entertainment" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "budget_education"     DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "budget_personal_care" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "budget_other"         DECIMAL(15, 2) NOT NULL DEFAULT 0;
